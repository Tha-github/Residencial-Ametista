/**
 * Top Site Admin — serviço intermediário (Cloudflare Worker).
 *
 * Único lugar com acesso ao GitHub. O navegador nunca vê o token.
 *
 * Rotas (todas sob /api, JSON):
 *   POST /api/login      { password }                 → { token, expiresAt }
 *   GET  /api/session                                  → 204 se a sessão vale
 *   GET  /api/content                                  → { content, sha, photos }
 *   GET  /api/photo?path=<foto>                        → bytes da foto (prévia)
 *   POST /api/upload     { name, data(base64) }        → { path, blob, receipt }
 *   POST /api/publish    { content, sha, uploads[] }   → { commit }
 *   GET  /api/status?commit=<sha>                      → { state, url? }
 *   GET  /api/setup                                    → { ready, token, password, setup }
 *   POST /api/setup      { token, password }           → cadastro inicial
 *
 * Configuração: a chave do GitHub e a senha podem vir de secrets do Worker
 * (GITHUB_TOKEN / ADMIN_PASSWORD_HASH) ou ser definidas uma única vez pela
 * tela do painel. O cadastro inicial exige uma chave GitHub com escrita neste
 * repositório e uma senha, ambos enviados juntos. A chave fica cifrada no KV
 * (AES-GCM com CONFIG_KEY) e a senha, só como hash PBKDF2.
 *
 * Regras de segurança:
 *   - CORS somente para as origens configuradas (ALLOWED_ORIGINS).
 *   - Senha conferida aqui (PBKDF2), nunca só no navegador.
 *   - Sessão por token HMAC no cabeçalho Authorization (sem cookies).
 *   - Edição = lista branca do descritor do site (applyEdits) + schema do
 *     site; fotos só da pasta do site; uploads só com recibo assinado.
 *   - Publicação recusada se o conteúdo mudou desde que o painel o abriu.
 */
import { applyEdits, EditError, imageSources, type SiteSpec } from '../../src/admin-kit/spec';
import {
  b64,
  createSession,
  decryptText,
  encryptText,
  hashPassword,
  passwordVersion,
  sign,
  verifyPassword,
  verifySession,
  verifySignature,
} from './auth';
import { GitHub, GitHubError, type TreeChange } from './github';
import { checkImage } from './images';

/** Subconjunto do KV do Cloudflare usado aqui. */
export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  /** Opcional se a chave for definida pela tela de configuração (KV). */
  GITHUB_TOKEN?: string;
  /** Opcional se a senha for definida pela tela de configuração (KV). */
  ADMIN_PASSWORD_HASH?: string;
  SESSION_SECRET: string;
  /** KV da configuração feita pela tela (chave cifrada + hash da senha). */
  ADMIN_KV?: KV;
  /** Cifra a chave do GitHub no KV (≥ 32 caracteres aleatórios). */
  CONFIG_KEY?: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  /** Origens permitidas, separadas por vírgula (ex.: https://usuario.github.io). */
  ALLOWED_ORIGINS: string;
  SESSION_HOURS?: string;
  /** Opcional: binding de Rate Limiting do Cloudflare para o login. */
  LOGIN_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export interface SiteAdapter {
  id: string;
  spec: SiteSpec;
  /** Valida o conteúdo completo com o schema do site. */
  validate(content: unknown): { path: string; message: string }[];
}

const MAX_JSON = 512 * 1024;
const MAX_UPLOAD_BODY = 12 * 1024 * 1024; // base64 de até 8 MB + folga
const UPLOAD_PATH = /^[a-z0-9][a-z0-9-]{0,80}\.(?:jpg|png|webp)$/;
const SHA = /^[0-9a-f]{40}$/;

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });

async function readJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > limit) throw new HttpError(413, 'Envio grande demais.');
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, 'Envio grande demais.');
  try {
    const body = JSON.parse(text);
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'Pedido inválido.');
  }
}

const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'foto';

export async function handle(
  request: Request,
  env: Env,
  site: SiteAdapter,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(env, origin);
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: cors['Access-Control-Allow-Origin'] ? 204 : 403,
      headers: cors,
    });
  }
  // Pedidos de navegador vindos de outra origem são recusados.
  if (origin && !cors['Access-Control-Allow-Origin']) {
    return json({ error: 'Origem não autorizada.' }, 403, cors);
  }

  try {
    const route = `${request.method} ${url.pathname}`;
    const limit = async (scope: string) => {
      if (!env.LOGIN_LIMITER) return;
      const ip = request.headers.get('CF-Connecting-IP') ?? 'anon';
      const { success } = await env.LOGIN_LIMITER.limit({ key: `${scope}:${ip}` });
      if (!success) throw new HttpError(429, 'Muitas tentativas. Aguarde um minuto.');
    };
    const slow = () => new Promise((r) => setTimeout(r, 700)); // desestimula tentativas em série

    // Configuração efetiva: secrets do Worker têm prioridade sobre o KV.
    const kv = env.ADMIN_KV;
    const stored = await kv?.get('credentials');
    const credentials = stored
      ? (JSON.parse(stored) as { githubToken: string; passwordHash: string })
      : undefined;
    const githubToken =
      env.GITHUB_TOKEN ||
      (kv && env.CONFIG_KEY
        ? await decryptText(
            env.CONFIG_KEY,
            credentials?.githubToken ?? (await kv.get('github_token')),
          )
        : undefined);
    const passwordHash =
      env.ADMIN_PASSWORD_HASH ||
      credentials?.passwordHash ||
      (await kv?.get('password_hash')) ||
      '';
    const setupEnabled = Boolean(
      kv && env.CONFIG_KEY && env.SESSION_SECRET?.length >= 32 && !githubToken && !passwordHash,
    );
    const status = () => ({
      ready: Boolean(githubToken && passwordHash),
      token: Boolean(githubToken),
      password: Boolean(passwordHash),
      setup: setupEnabled,
    });
    const gh = () => {
      if (!githubToken)
        throw new HttpError(503, 'Painel ainda sem a chave do GitHub. Fale com a Top Site.');
      return new GitHub(githubToken, env.GITHUB_REPO, env.GITHUB_BRANCH, fetcher);
    };

    // Estado público (sem segredos): o painel decide entre login e "aguardando configuração".
    if (route === 'GET /api/setup') return json(status(), 200, cors);

    if (route === 'POST /api/setup') {
      await limit('setup');
      if (githubToken || passwordHash) {
        throw new HttpError(409, 'O cadastro inicial já foi feito. Entre com a senha do painel.');
      }
      if (!setupEnabled || !kv || !env.CONFIG_KEY)
        throw new HttpError(404, 'Configuração pelo painel não habilitada.');
      const body = await readJson(request, 8192);
      const newToken = typeof body.token === 'string' ? body.token.trim() : '';
      const newPassword = typeof body.password === 'string' ? body.password : '';
      if (!newToken || !newPassword)
        throw new HttpError(
          400,
          'Informe a chave do GitHub e a senha para concluir o cadastro inicial.',
        );
      if (newPassword.length < 10 || newPassword.length > 128)
        throw new HttpError(422, 'A senha precisa ter entre 10 e 128 caracteres.');
      if (!/^(github_pat_|ghp_|gho_)[A-Za-z0-9_]{20,}$/.test(newToken))
        throw new HttpError(422, 'Essa não parece uma chave do GitHub (começa com "github_pat_").');
      // A chave precisa enxergar ESTE repositório e poder gravar nele.
      let repo: { permissions?: { push?: boolean } };
      try {
        repo = await new GitHub(newToken, env.GITHUB_REPO, env.GITHUB_BRANCH, fetcher).repoInfo();
      } catch (e) {
        if (e instanceof GitHubError && (e.status === 401 || e.status === 403 || e.status === 404))
          throw new HttpError(422, `A chave não tem acesso ao repositório ${env.GITHUB_REPO}.`);
        throw e;
      }
      if (!repo.permissions?.push)
        throw new HttpError(
          422,
          'A chave não tem permissão de escrita (Contents: Read and write).',
        );
      await kv.put(
        'credentials',
        JSON.stringify({
          githubToken: await encryptText(env.CONFIG_KEY, newToken),
          passwordHash: await hashPassword(newPassword),
        }),
      );
      return json({ token: true, password: true, ready: true, setup: false }, 200, cors);
    }

    if (route === 'POST /api/login') {
      await limit('login');
      if (!passwordHash)
        throw new HttpError(503, 'Painel ainda não configurado. Fale com a Top Site.');
      const body = await readJson(request, 4096);
      const ok = await verifyPassword(String(body.password ?? ''), passwordHash);
      if (!ok) {
        await slow();
        throw new HttpError(401, 'Senha incorreta.');
      }
      const hours = Math.min(Math.max(Number(env.SESSION_HOURS ?? 8) || 8, 1), 24);
      const pv = await passwordVersion(passwordHash);
      return json(await createSession(env.SESSION_SECRET, site.id, hours, pv), 200, cors);
    }

    // Demais rotas: sessão obrigatória (e da senha atual).
    const auth = request.headers.get('Authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    const pv = passwordHash ? await passwordVersion(passwordHash) : '';
    if (!pv || !(await verifySession(env.SESSION_SECRET, site.id, token, pv))) {
      throw new HttpError(401, 'Sessão expirada. Entre novamente.');
    }

    if (route === 'GET /api/session') return new Response(null, { status: 204, headers: cors });

    if (route === 'GET /api/content') {
      const github = gh();
      const [file, photos] = await Promise.all([
        github.getText(site.spec.contentPath),
        github.listFiles(site.spec.photosDir),
      ]);
      return json(
        { content: JSON.parse(file.text), sha: file.sha, photos: [...photos].sort() },
        200,
        cors,
      );
    }

    if (route === 'GET /api/photo') {
      const path = url.searchParams.get('path') ?? '';
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:jpe?g|png|webp)$/i.test(path) || path.includes('..'))
        throw new HttpError(400, 'Foto inválida.');
      const bytes = await gh().getBytes(`${site.spec.photosDir}/${path}`);
      const info = checkImage(bytes);
      const type = info.ok
        ? { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[info.info.kind]
        : 'application/octet-stream';
      return new Response(bytes, {
        headers: { ...cors, 'Content-Type': type, 'Cache-Control': 'private, max-age=300' },
      });
    }

    if (route === 'POST /api/upload') {
      const body = await readJson(request, MAX_UPLOAD_BODY);
      let bytes: Uint8Array;
      try {
        bytes = b64.decode(String(body.data ?? ''));
      } catch {
        throw new HttpError(400, 'Arquivo inválido.');
      }
      const check = checkImage(bytes);
      if (!check.ok) throw new HttpError(422, check.reason);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = crypto.getRandomValues(new Uint8Array(3));
      const id = [...rand].map((b) => b.toString(16).padStart(2, '0')).join('');
      const file = `${stamp}-${id}-${slug(String(body.name ?? 'foto'))}.${check.info.kind}`;
      const blob = await gh().createBlob(String(body.data));
      const path = `${site.spec.uploadsSubdir}/${file}`;
      const receipt = await sign(env.SESSION_SECRET, `upload.${path}.${blob}`);
      return json(
        { path, blob, receipt, width: check.info.width, height: check.info.height },
        201,
        cors,
      );
    }

    if (route === 'POST /api/publish') {
      const body = await readJson(request, MAX_JSON);
      const github = gh();
      const [file, existing, parent] = await Promise.all([
        github.getText(site.spec.contentPath),
        github.listFiles(site.spec.photosDir),
        github.headSha(),
      ]);
      if (body.sha !== file.sha) {
        throw new HttpError(
          409,
          'O conteúdo foi alterado em outro lugar desde que você abriu o painel. Recarregue a página para ver a versão atual.',
        );
      }
      const current = JSON.parse(file.text) as Record<string, unknown>;

      // 1. Lista branca: só os campos do descritor, sobre o conteúdo atual.
      let next: Record<string, unknown>;
      try {
        next = applyEdits(current, body.content, site.spec);
      } catch (e) {
        if (e instanceof EditError)
          throw new HttpError(422, 'Alteração não permitida.', [
            { path: e.path, message: e.message },
          ]);
        throw e;
      }

      // 2. Fotos enviadas nesta publicação: só com recibo válido.
      const uploads = Array.isArray(body.uploads) ? body.uploads : [];
      const sub = site.spec.uploadsSubdir;
      const accepted = new Map<string, string>();
      for (const u of uploads.slice(0, 40) as Record<string, unknown>[]) {
        const path = String(u?.path ?? '');
        const blob = String(u?.blob ?? '');
        const name = path.startsWith(`${sub}/`) ? path.slice(sub.length + 1) : '';
        if (!UPLOAD_PATH.test(name) || !SHA.test(blob)) continue;
        if (
          await verifySignature(
            env.SESSION_SECRET,
            `upload.${path}.${blob}`,
            String(u?.receipt ?? ''),
          )
        )
          accepted.set(path, blob);
      }

      // 3. Toda foto referenciada precisa existir (no repositório ou enviada agora).
      const used = imageSources(next, site.spec);
      const missing = used.filter((src) => !existing.has(src) && !accepted.has(src));
      if (missing.length) {
        throw new HttpError(
          422,
          'Há fotos que não foram encontradas. Envie-as novamente.',
          missing.map((m) => ({ path: m, message: 'Foto não encontrada' })),
        );
      }

      // 4. Schema completo do site (tamanhos, URLs, contraste das cores...).
      const issues = site.validate(next);
      if (issues.length) throw new HttpError(422, 'Revise os campos indicados.', issues);

      // 5. Um commit: conteúdo + fotos novas usadas; remove fotos do painel que
      //    deixaram de ser usadas (as fotos originais do site nunca são apagadas).
      const changes: TreeChange[] = [
        { path: site.spec.contentPath, content: `${JSON.stringify(next, null, 2)}\n` },
      ];
      const usedSet = new Set(used);
      for (const [path, blob] of accepted) {
        if (usedSet.has(path)) changes.push({ path: `${site.spec.photosDir}/${path}`, sha: blob });
      }
      for (const path of existing) {
        if (path.startsWith(`${sub}/`) && !usedSet.has(path))
          changes.push({ path: `${site.spec.photosDir}/${path}`, sha: null });
      }
      const commit = await github.commit(
        changes,
        'Painel: atualização de conteúdo do site',
        parent,
      );
      return json({ commit }, 200, cors);
    }

    if (route === 'GET /api/status') {
      const sha = url.searchParams.get('commit') ?? '';
      if (!SHA.test(sha)) throw new HttpError(400, 'Commit inválido.');
      const runs = await gh().runsFor(sha);
      const deploy = runs.find((r) => /pages|deploy/i.test(r.name)) ?? runs[0];
      const state = !deploy
        ? 'queued'
        : deploy.status !== 'completed'
          ? 'running'
          : deploy.conclusion === 'success'
            ? 'published'
            : 'failed';
      return json({ state }, 200, cors);
    }

    throw new HttpError(404, 'Rota não encontrada.');
  } catch (e) {
    if (e instanceof HttpError) {
      return json({ error: e.message, details: e.details }, e.status, cors);
    }
    if (e instanceof GitHubError) {
      const status = e.status === 409 || e.status === 422 ? 409 : 502;
      const message =
        status === 409
          ? 'O site foi atualizado ao mesmo tempo por outra pessoa. Recarregue e tente de novo.'
          : 'Não foi possível falar com o GitHub agora. Tente novamente em instantes.';
      return json({ error: message }, status, cors);
    }
    // Registro só no log do Worker (painel Cloudflare); nada de segredo aqui.
    console.error('admin: erro inesperado', e instanceof Error ? `${e.name}: ${e.message}` : e);
    return json({ error: 'Erro inesperado no servidor.' }, 500, cors);
  }
}
