// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';

import cloudflare from '@astrojs/cloudflare';

// `site` precisa existir em tempo de build (canonical, sitemap, OG).
// Lido do ambiente para não fixar um domínio ainda não confirmado.
const { PUBLIC_SITE_URL, PUBLIC_DEPLOY_ENV } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
);
const isProduction = (process.env.PUBLIC_DEPLOY_ENV ?? PUBLIC_DEPLOY_ENV) === 'production';
if (isProduction && !PUBLIC_SITE_URL) {
  throw new Error(
    'PUBLIC_SITE_URL é obrigatório em produção para canonical, sitemap, robots.txt e metadados sociais.',
  );
}
if (isProduction && PUBLIC_SITE_URL) {
  const publicUrl = new URL(PUBLIC_SITE_URL);
  if (
    publicUrl.protocol !== 'https:' ||
    publicUrl.pathname !== '/' ||
    publicUrl.search ||
    publicUrl.hash
  ) {
    throw new Error(
      'PUBLIC_SITE_URL em produção deve ser apenas a origem HTTPS do domínio, sem caminho, query ou fragmento.',
    );
  }
}

/**
 * Rotas internas de desenvolvimento (guia de estilo). Injetadas somente fora
 * de produção — não existem no build publicado.
 * @returns {import('astro').AstroIntegration}
 */
const devOnlyRoutes = () => ({
  name: 'ametista:dev-only-routes',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      if (isProduction) return;
      injectRoute({ pattern: '/estilo', entrypoint: './src/dev/estilo.astro' });
      injectRoute({ pattern: '/estilo/secoes', entrypoint: './src/dev/secoes.astro' });
    },
  },
});

// https://astro.build/config
export default defineConfig({
  site: PUBLIC_SITE_URL || 'http://localhost:4321',
  trailingSlash: 'ignore',

  integrations: [devOnlyRoutes()],

  // A barra de ferramentas de dev interfere em medições dos testes E2E.
  devToolbar: { enabled: !process.env.E2E },

  // Fontes baixadas no build e servidas pelo próprio site (sem requisição a
  // terceiros). Poucos pesos; fallbacks com métricas ajustadas evitam CLS.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: [400, 500],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Figtree',
      cssVariable: '--font-figtree',
      weights: [400, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],

  adapter: cloudflare({
    // Imagens locais são otimizadas no build (AVIF/WebP via sharp);
    // em runtime não há transformação, apenas entrega do arquivo gerado.
    imageService: { build: 'compile', runtime: 'passthrough' },
  }),

  image: {
    responsiveStyles: true,
  },

  // Sem sessões do Astro: a autenticação do painel é feita pelo Cloudflare
  // Access (Etapa 6). Evita o provisionamento automático de um KV não usado.
  session: false,

  // Variáveis tipadas e validadas. Nenhum valor secreto vive no repositório:
  // em dev use `.env` / `.dev.vars`; em produção, variáveis/segredos do Worker.
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        url: true,
        optional: true,
      }),
      PUBLIC_DEPLOY_ENV: envField.enum({
        context: 'client',
        access: 'public',
        values: ['development', 'preview', 'production'],
        default: 'development',
      }),
      // Painel administrativo (Etapa 6): validação do JWT do Cloudflare Access.
      CF_ACCESS_TEAM_DOMAIN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      CF_ACCESS_AUD: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      ADMIN_ALLOWED_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
});
