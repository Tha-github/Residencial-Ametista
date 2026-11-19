/**
 * Worker do painel do Residencial Ametista.
 * Configuração: admin-worker/wrangler.jsonc (variáveis) + secrets
 * (GITHUB_TOKEN, ADMIN_PASSWORD_HASH, SESSION_SECRET). Ver
 * docs/10-painel-administrativo-github.md.
 */
import { ametistaSpec } from '../../src/admin-sites/ametista';
import { propertySchema } from '../../src/data/property.schema';
import { handle, type Env, type SiteAdapter } from './app';

const site: SiteAdapter = {
  id: 'residencial-ametista',
  spec: ametistaSpec,
  validate(content) {
    // "$comment" é metadado editorial do arquivo, não conteúdo.
    const { $comment: _ignored, ...data } = content as Record<string, unknown>;
    const result = propertySchema.safeParse(data);
    return result.success
      ? []
      : result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  },
};

export default {
  fetch: (request: Request, env: Env) => handle(request, env, site),
};
