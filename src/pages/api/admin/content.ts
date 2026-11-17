import type { APIRoute } from 'astro';
import { propertySchema } from '../../../data/property.schema';
import { verifyAccess } from '../../../lib/admin/access';
import {
  adminEnv,
  consumeRateLimit,
  jsonResponse,
  PROPERTY_ID,
  readLimitedBody,
} from '../../../lib/admin/runtime';
import { fileSource, loadContent } from '../../../lib/content/load';
import type { AdminEnv } from '../../../lib/admin/runtime';

export const prerender = false;

type Authorization = { ok: true; actor: string; env: AdminEnv } | { ok: false; response: Response };
const authorize = async (request: Request, locals: App.Locals): Promise<Authorization> => {
  const env = adminEnv(locals);
  const actor = await verifyAccess(request, env);
  if (!actor)
    return {
      ok: false,
      response: jsonResponse(
        { error: 'Sessão ausente ou expirada. Entre novamente pelo Cloudflare Access.' },
        401,
      ),
    };
  if (!env.CONTENT_DB)
    return {
      ok: false,
      response: jsonResponse({ error: 'Painel não configurado: D1 indisponível.' }, 503),
    };
  return { ok: true, actor, env };
};

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await authorize(request, locals);
  if (!auth.ok) return auth.response;
  const row = await auth.env
    .CONTENT_DB!.prepare('SELECT content_json FROM property_content WHERE property_id = ?')
    .bind(PROPERTY_ID)
    .first<{ content_json: string }>();
  const content = row ? JSON.parse(row.content_json) : await loadContent(fileSource);
  const parsed = propertySchema.safeParse(content);
  if (!parsed.success) return jsonResponse({ error: 'Conteúdo armazenado inválido.' }, 500);
  return jsonResponse({ content: parsed.data });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const auth = await authorize(request, locals);
  if (!auth.ok) return auth.response;
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return jsonResponse({ error: 'Origem inválida.' }, 403);
  const limit = await consumeRateLimit(
    auth.env.CONTENT_DB!,
    'owner:content-write',
    20,
    10 * 60 * 1000,
  );
  if (!limit.allowed)
    return jsonResponse(
      { error: 'Muitas alterações em sequência. Tente novamente em alguns minutos.' },
      429,
      { 'Retry-After': String(limit.retryAfter) },
    );
  const bytes = await readLimitedBody(request, 128_000);
  if (!bytes) return jsonResponse({ error: 'Conteúdo excede o limite permitido.' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return jsonResponse({ error: 'JSON inválido.' }, 400);
  }
  const result = propertySchema.safeParse(body);
  if (!result.success)
    return jsonResponse(
      {
        error: 'Revise os campos destacados.',
        fields: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      422,
    );
  const actor = auth.actor;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await auth.env.CONTENT_DB!.batch([
    auth.env
      .CONTENT_DB!.prepare(
        'INSERT INTO property_content (property_id, content_json, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(property_id) DO UPDATE SET content_json=excluded.content_json, updated_at=excluded.updated_at, updated_by=excluded.updated_by',
      )
      .bind(PROPERTY_ID, JSON.stringify(result.data), now, actor),
    auth.env
      .CONTENT_DB!.prepare(
        'INSERT INTO admin_audit (id, property_id, actor, action, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(id, PROPERTY_ID, actor, 'content.update', now),
    auth.env.CONTENT_DB!.prepare(
      "DELETE FROM admin_audit WHERE julianday(created_at) < julianday('now', '-90 days')",
    ),
  ]);
  return jsonResponse({ ok: true, savedAt: now });
};
