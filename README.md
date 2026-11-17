# Residencial Ametista — site

Site institucional do Residencial Ametista (Praia dos Ingleses, Florianópolis/SC).
Apresenta o imóvel e direciona o visitante para reservar **nas plataformas externas**
(Booking.com, Airbnb, Decolar). Não há motor de reservas, calendário, tarifas nem
Channel Manager: isso está fora do escopo contratado.

- Stack: [Astro 7](https://docs.astro.build) + TypeScript, hospedado em **Cloudflare Workers (Static Assets)**
- Decisões de arquitetura: [docs/02-arquitetura.md](docs/02-arquitetura.md)
- Auditoria, pendências e plano: [docs/01-auditoria-e-plano.md](docs/01-auditoria-e-plano.md)

## Requisitos

- Node.js ≥ 22.23 (testado com 24.19) e npm ≥ 11
- Conta Cloudflare (somente para deploy)

## Instalação

```sh
npm install
cp .env.example .env   # preencha conforme os comentários; nunca versione .env
```

O npm 11 bloqueia scripts de instalação por padrão. `esbuild` e `workerd` estão
liberados em `allowScripts` no `package.json` porque baixam binários necessários.
Se o npm pedir aprovação após uma atualização de versão, rode
`npm approve-scripts esbuild workerd`.

## Desenvolvimento

```sh
npm run dev            # http://localhost:4321
```

Fora de produção (`PUBLIC_DEPLOY_ENV` ≠ `production`), a página mostra **avisos
amarelos de pendência** no lugar das seções sem dados confirmados. Em produção,
seções sem dados simplesmente não aparecem.

## Conteúdo

Todo o conteúdo do residencial fica em [src/data/ametista.json](src/data/ametista.json),
validado por [src/data/property.schema.ts](src/data/property.schema.ts):

- Inclua **somente dados confirmados pelo cliente**. Campos ausentes = seção oculta.
- Texto puro (sem HTML). Links de reserva, Maps, Instagram e WhatsApp passam por
  allowlist de domínio e exigem HTTPS.
- Conteúdo inválido **interrompe o build**, com a mensagem indicando o campo.
- Fotos reais vão em [src/assets/photos/](src/assets/photos/README.md).

O painel administrativo grava esse mesmo conteúdo no D1, com o mesmo schema.
Antes de ativar em produção, siga [docs/05-painel-administrativo.md](docs/05-painel-administrativo.md)
para provisionar D1/R2 e Cloudflare Access; o painel falha fechado sem esses recursos.

SEO técnico, canonical, Open Graph, JSON-LD, `robots.txt` e sitemap estão
documentados em [docs/06-seo-e-indexacao.md](docs/06-seo-e-indexacao.md).
O build de produção exige a origem HTTPS final em `PUBLIC_SITE_URL`.

O relatório de hardening, achados verificados e pré-requisitos operacionais está em
[docs/07-auditoria-de-seguranca.md](docs/07-auditoria-de-seguranca.md).

## Sistema visual

Tokens em [src/styles/tokens.css](src/styles/tokens.css), direção de arte em
[docs/03-direcao-visual.md](docs/03-direcao-visual.md). Em desenvolvimento, o
**guia de estilo** fica em `http://localhost:4321/estilo`. Essa rota é injetada
só fora de produção e não existe no build publicado.

## Validação

| Comando                | O que faz                                                |
| ---------------------- | -------------------------------------------------------- |
| `npm run typecheck`    | `astro check` (TypeScript + templates)                   |
| `npm run lint`         | ESLint (TS, Astro e regras de acessibilidade jsx-a11y-x) |
| `npm run format:check` | Prettier (use `npm run format` para corrigir)            |
| `npm test`             | Testes unitários (Vitest)                                |
| `npm run build`        | Build de produção em `dist/`                             |
| `npm run validate`     | Todos os anteriores, em sequência                        |
| `npm run preview`      | Serve o build localmente no runtime da Cloudflare        |

## Variáveis de ambiente

Os nomes estão em [.env.example](.env.example) e são validados por `astro:env`
(em [astro.config.mjs](astro.config.mjs)).

| Nome                    | Tipo              | Uso                                                                   |
| ----------------------- | ----------------- | --------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`       | público           | URL canônica (canonical, sitemap, OG). Obrigatória em produção        |
| `PUBLIC_DEPLOY_ENV`     | público           | `development` / `preview` / `production`. Só `production` é indexável |
| `CF_ACCESS_TEAM_DOMAIN` | segredo, servidor | Painel (Etapa 6): domínio Cloudflare Zero Trust                       |
| `CF_ACCESS_AUD`         | segredo, servidor | Painel (Etapa 6): AUD da aplicação Access                             |
| `ADMIN_ALLOWED_EMAIL`   | segredo, servidor | E-mail único do proprietário autorizado pelo backend                  |

As variáveis `PUBLIC_*` entram no build. Defina-as no ambiente do build (CI ou
Workers Builds), e não só como variável de runtime do Worker.

## Deploy (Cloudflare Workers)

Primeiro deploy, pela máquina local:

PowerShell (Windows):

```powershell
npx wrangler login
$env:PUBLIC_DEPLOY_ENV = 'production'
$env:PUBLIC_SITE_URL = 'https://<dominio-confirmado>'
npm run deploy
```

Bash/macOS/Linux:

```sh
npx wrangler login
PUBLIC_DEPLOY_ENV=production PUBLIC_SITE_URL=https://<dominio-confirmado> npm run deploy
```

`npm run deploy` roda `validate` (inclui o build) e depois `wrangler deploy`. O
adapter gera a configuração final em `dist/client/wrangler.json`, e o Wrangler a
encontra sozinho via `.wrangler/deploy/config.json`.

Recomendado em seguida: conectar o repositório em **Workers Builds** (Cloudflare
Dashboard → Worker → Settings → Builds), com build command `npm run build`,
deploy command `npx wrangler deploy` e as variáveis `PUBLIC_*` definidas como
variáveis de build. Para o domínio próprio, use Worker → Settings → Domains & Routes.

Para conferir sem publicar: `npm run build && npx wrangler deploy --dry-run`.
