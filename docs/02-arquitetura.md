# Residencial Ametista: decisões de arquitetura (Etapa 2)

Data: 16/11/2026

## Decisões

| #   | Decisão                                                                     | Motivo                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Astro 7 + TypeScript estrito**                                            | Não havia stack prévia. O site é uma página de conteúdo: HTML no servidor, zero JS por padrão e otimização de imagens nativa (AVIF/WebP).                                                                                           |
| 2   | **Cloudflare Workers + Static Assets** (`@astrojs/cloudflare` 14)           | A prévia do cliente já usa Cloudflare. O adapter atual tem como alvo Workers, o caminho recomendado pela Cloudflare em vez do Pages. Hoje o deploy é só de assets. As rotas de servidor do painel (Etapa 6) entram no mesmo Worker. |
| 3   | **Página pública pré-renderizada** a partir de `src/data/ametista.json`     | Não há conteúdo dinâmico ainda. Na Etapa 6 a fonte passa a ser o D1, pela interface `ContentSource` (`src/lib/content/load.ts`), sem mudar os componentes.                                                                          |
| 4   | **Schema único (Zod 4, `astro/zod`)** para conteúdo                         | O mesmo contrato valida o JSON no build e o payload da API do painel. Aceita só texto puro e URLs com allowlist por finalidade (`src/lib/validation/urls.ts`).                                                                      |
| 5   | **Conteúdo ausente = seção oculta**                                         | Evita conteúdo fictício. Fora de produção, `PendingNotice` mostra o que falta. Em produção, nada aparece. `listPending()` gera a lista de pendências a partir do próprio conteúdo.                                                  |
| 6   | **Falha explícita** em conteúdo inválido                                    | `ContentValidationError` interrompe o build com o caminho do campo, para nunca publicar uma página quebrada.                                                                                                                        |
| 7   | **Páginas 404/500 próprias**, com `noindex`                                 | A 500 registra só a mensagem do erro no servidor (observability do Worker) e nunca exibe detalhes ao visitante.                                                                                                                     |
| 8   | **Indexação controlada por `PUBLIC_DEPLOY_ENV`**                            | Só `production` gera `index, follow`. Prévias e dev saem com `noindex` para não concorrer com o site real.                                                                                                                          |
| 9   | **`session: false`**                                                        | O adapter ativaria sessões em KV (e provisionaria um namespace) por padrão. A autenticação do painel será feita pelo Cloudflare Access, então sessões do Astro não são necessárias.                                                 |
| 10  | **Imagens: `compile` no build, `passthrough` em runtime**                   | As fotos são locais e conhecidas no build. Gera variantes sem depender do Cloudflare Images. Na Etapa 6, as imagens enviadas pelo painel terão estratégia própria (R2).                                                             |
| 11  | **Tokens CSS** (`src/styles/tokens.css`) com cores e fontes **provisórias** | A estrutura (cor semântica, escala tipográfica fluida, espaçamento, larguras, raios, breakpoints) é definitiva. Os valores serão definidos na Etapa 3 a partir das fotos reais.                                                     |
| 12  | **Cabeçalhos básicos** em `public/_headers`                                 | `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`. CSP e HSTS ficam para a Etapa 8.                                                                                                                             |

## Dependências e justificativas

| Pacote                                                                              | Por quê                                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `astro`, `@astrojs/cloudflare`, `wrangler`                                          | Framework, adapter e CLI de deploy                                                                |
| `sharp` (dev)                                                                       | Otimização de imagens no build (exigido pelo modo `compile`)                                      |
| `typescript` **~6.0** (dev)                                                         | `@astrojs/check` e `typescript-eslint` ainda não suportam o TS 7                                  |
| `@astrojs/check`, `@types/node` (dev)                                               | Typecheck de `.astro` e dos arquivos de configuração                                              |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-astro`, `globals` (dev) | Lint                                                                                              |
| `eslint-plugin-jsx-a11y-x` (dev)                                                    | Regras de acessibilidade nos templates. Fork compatível com ESLint 10 (o original só vai até o 9) |
| `prettier`, `prettier-plugin-astro` (dev)                                           | Formatação                                                                                        |
| `vitest` (dev)                                                                      | Testes unitários                                                                                  |

`overrides.minimatch` foi fixado em `^11.0.8` dentro do `eslint-plugin-jsx-a11y-x` para
corrigir o GHSA-g3hv-75wg-m249 (moderado, só em desenvolvimento). Resultado: `npm audit` sem
vulnerabilidades. Playwright e axe entram na Etapa 9.

## Estrutura

```
src/
  data/            ametista.json (conteúdo confirmado) · property.schema.ts (contrato)
  lib/
    content/       load.ts (fonte + validação) · pending.ts (pendências)
    validation/    urls.ts (allowlist de links externos)
    env.ts         ambiente (produção / avisos)
  layouts/         BaseLayout.astro (head, robots, canonical, skip link)
  components/
    layout/        SiteHeader, SiteFooter
    states/        Section (condicional), PendingNotice, LoadingState, ErrorState
  styles/          tokens.css · global.css · breakpoints.ts
  assets/photos/   fotos reais (vazio, aguardando cliente)
  pages/           index · 404 · 500
public/_headers
tests/unit/        urls.test.ts · content.test.ts
```

## Pendente desta etapa

- `CLAUDE.md` continua **vazio**. As decisões acima seguem a auditoria e devem ser
  revistas quando ele for preenchido.
- Hospedagem Cloudflare ainda **não confirmada** pelo contratante. A escolha foi
  inferida da prévia.
- O projeto ainda **não é um repositório Git** (aguardando autorização para `git init`).
