# Painel administrativo (Top Site Admin) — Residencial Ametista

Painel em `/admin` para o proprietário atualizar o conteúdo do site **só com uma senha**.
Cada publicação vira um commit no repositório do Ametista, e o GitHub Pages publica
sozinho a nova versão em cerca de 2 minutos.

> Este é o primeiro painel do padrão **Top Site Admin**. O mesmo código serve para o
> Residencial Estrela Dalva (ver "Reaproveitar em outro site"), com configuração, senha,
> Worker e repositório próprios.

---

## 1. Como funciona

```
 Navegador (painel estático no GitHub Pages)
   │  senha → token de sessão (8 h), sem cookies
   ▼
 Cloudflare Worker  (admin-worker/)  ← único lugar com o token do GitHub
   │  confere senha (PBKDF2) e sessão (HMAC)
   │  aplica SÓ os campos permitidos (lista branca)
   │  valida com o MESMO schema do site
   ▼
 GitHub API → 1 commit (conteúdo + fotos novas) na branch main
   ▼
 GitHub Actions (deploy.yml) → valida, gera e publica o site
```

| Peça                         | Onde                                                   | Observação                                          |
| ---------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Interface do painel          | `src-pages/pages/admin/index.astro` + `src/admin-kit/` | Estática, sem segredos. CSP restrita. `noindex`.    |
| Campos editáveis do Ametista | `src/admin-sites/ametista.ts`                          | O que não está aqui não pode ser alterado.          |
| Serviço intermediário        | `admin-worker/`                                        | Cloudflare Worker. Guarda o token e a senha (hash). |
| Conteúdo                     | `src/data/ametista.json`                               | Gravado pelo painel.                                |
| Fotos enviadas               | `src/assets/photos/uploads/`                           | Convertidas para WEBP no navegador (máx. 2400 px).  |

### Segurança implementada

- **Token do GitHub só no Worker** (secret). Nunca aparece no HTML, no JavaScript, no
  `localStorage` ou no `sessionStorage`. O navegador guarda apenas o token de _sessão_ do
  painel (assinado pelo Worker, expira em 8 h).
- **Senha validada no servidor** (hash PBKDF2-SHA256 com sal; comparação em tempo
  constante; atraso de 0,7 s a cada senha errada).
- **CMS fechado**: o Worker copia do pedido somente os campos declarados em
  `ametista.ts`, sobre o conteúdo atual do GitHub. Chaves extras são ignoradas; listas
  fixas (diferenciais, perguntas, momentos do dia...) não mudam de tamanho; nenhum campo
  aceita HTML; URLs só dos domínios esperados (Booking, Airbnb, Maps, WhatsApp, Instagram).
- **Cores autorizadas** com contraste mínimo de 4,5:1 verificado no painel e no servidor.
  Fontes, tamanhos e layout não são editáveis.
- **Fotos**: tipo detectado pela assinatura do arquivo (JPG/PNG/WEBP), dimensões lidas do
  cabeçalho (mín. 200 px, máx. 40 MP), até 8 MB. Cada envio recebe um recibo assinado;
  a publicação só aceita fotos com recibo válido.
- **Sem sobrescrever**: se o conteúdo mudou desde que o painel foi aberto, a publicação é
  recusada (409) e o proprietário é avisado para recarregar.
- **CORS** só para a origem do site; pedidos de outras origens recebem 403.
- O build do site **não é bloqueado** por edições legítimas: os testes usam uma cópia de
  referência (`tests/fixtures/`) e o arquivo de conteúdo fica fora do Prettier.

---

## 2. Configuração pela Top Site (uma vez)

### 2.1 Token do GitHub (permissão mínima)

GitHub → _Settings_ → _Developer settings_ → _Personal access tokens_ → **Fine-grained tokens** → _Generate new token_:

- **Repository access**: _Only select repositories_ → `Tha-github/Residencial-Ametista`
- **Permissions → Repository**:
  - **Contents**: _Read and write_
  - **Actions**: _Read-only_ (só para o painel mostrar "site atualizado")
  - Metadata: _Read-only_ (automático)
- **Expiration**: o máximo permitido. **Anote a data** para renovar antes de expirar
  (ver seção 5).

### 2.2 Senha do proprietário

Na pasta do projeto:

```bash
npm run admin:hash-password
```

Digite a senha (mín. 10 caracteres; não aparece na tela). O comando imprime
`ADMIN_PASSWORD_HASH=...` e `SESSION_SECRET=...`. **A senha em si não é gravada em lugar
nenhum** — entregue-a ao proprietário por um canal seguro.

### 2.3 Cloudflare Worker

Requer uma conta Cloudflare (o plano gratuito atende). Na pasta do projeto:

```bash
npx wrangler login
npx wrangler secret put GITHUB_TOKEN        --config admin-worker/wrangler.jsonc
npx wrangler secret put ADMIN_PASSWORD_HASH --config admin-worker/wrangler.jsonc
npx wrangler secret put SESSION_SECRET      --config admin-worker/wrangler.jsonc
npm run admin:deploy
```

O deploy mostra o endereço do Worker, por exemplo
`https://ametista-admin.<conta>.workers.dev`.

Variáveis públicas (já preenchidas em `admin-worker/wrangler.jsonc`; ajuste se mudar):

| Variável          | Valor atual                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| `GITHUB_REPO`     | `Tha-github/Residencial-Ametista`                                          |
| `GITHUB_BRANCH`   | `main`                                                                     |
| `ALLOWED_ORIGINS` | `https://tha-github.github.io` (troque pelo domínio próprio quando houver) |
| `SESSION_HOURS`   | `8`                                                                        |

**Limite de tentativas de login (recomendado):** no painel da Cloudflare, crie uma regra
de _Rate limiting_ (WAF) para `POST /api/login` do Worker, por exemplo 5 tentativas por
minuto por IP. O código também aceita um binding opcional `LOGIN_LIMITER` (Workers Rate
Limiting); consulte a documentação atual da Cloudflare para a sintaxe do binding.

### 2.4 Ligar o painel ao Worker

GitHub → repositório → _Settings_ → _Secrets and variables_ → _Actions_ → aba
**Variables** → _New repository variable_:

- Nome: `ADMIN_API_URL`
- Valor: o endereço do Worker (ex.: `https://ametista-admin.<conta>.workers.dev`)

Rode o workflow de deploy (_Actions_ → _Deploy Astro site to GitHub Pages_ → _Run
workflow_) ou faça qualquer push. O painel fica em
`https://tha-github.github.io/Residencial-Ametista/admin/`.

> Sem `ADMIN_API_URL`, o painel abre mostrando "O painel ainda não foi configurado".

### 2.5 Conferência final (5 minutos)

1. Abrir `/admin`, errar a senha (deve recusar) e entrar com a senha certa.
2. Mudar um texto pequeno, publicar e ver "Pronto! O site já está atualizado".
3. Abrir o site e conferir a mudança; desfazer pelo painel.

---

## 3. O que o proprietário pode editar

| Módulo                  | Campos                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Página inicial e banner | foto do banner, título, subtítulo (praia), texto, textos e destinos dos 2 botões, 6 informações de destaque (ícone + texto)     |
| Apresentação            | sobretítulo, título, parágrafos, 2 fotos (trocar e inverter a ordem)                                                            |
| Tour pelo apartamento   | sobretítulo, título, descrição; fotos do carrossel: trocar, reordenar, excluir e adicionar (até 20), ambiente e legenda         |
| Diferenciais            | sobretítulo, título, descrição; os 6 diferenciais (ícone, título, descrição) — sem criar novos                                  |
| Experiência             | sobretítulo, título, descrição; manhã/tarde/noite (momento, título, texto, foto)                                                |
| Estrutura e comodidades | textos da seção, quartos, camas, banheiros, área, textos das comodidades                                                        |
| Localização e região    | textos, endereço, CEP, link do Google Maps, distância/minutos até a praia, atrações (nome, distância, texto, foto, crédito)     |
| Antes de reservar       | textos, check-in, check-out, informações importantes, regras da casa                                                            |
| Dúvidas frequentes      | textos da seção; perguntas e respostas existentes — sem criar ou excluir                                                        |
| Reservas e contatos     | textos, links Booking.com e Airbnb, texto dos botões, WhatsApp (número + mensagem), e-mail, Instagram, textos da reserva direta |
| Cores do site           | principal, secundária, destaque, fundo, texto (com verificação de contraste e "Restaurar cores originais")                      |

Não é possível: criar/remover seções, mudar layout, fontes, tamanhos, HTML, CSS, código,
configurações ou o token.

---

## 4. Reaproveitar em outro site (ex.: Residencial Estrela Dalva)

O kit é genérico; muda só a configuração:

1. Copie `src/admin-kit/`, `admin-worker/`, `scripts/hash-admin-password.mjs` e
   `src-pages/pages/admin/index.astro` (a página do painel) para o projeto do outro site.
2. Crie `src/admin-sites/<site>.ts` com os módulos/campos daquele site (mesmo formato de
   `ametista.ts`) e, se quiser, prévias próprias (como `ametista-preview.ts`).
3. Em `admin-worker/src/index.ts`, aponte para o descritor e o schema do novo site e troque
   o `id`.
4. Em `admin-worker/wrangler.jsonc`, troque `name`, `GITHUB_REPO` e `ALLOWED_ORIGINS`.
5. Repita a seção 2 com **token, senha, Worker e variável próprios** daquele repositório.

Layout, navegação, componentes, padrões de edição e publicação ficam idênticos.

---

## 5. Manutenção e problemas comuns

| Situação                                                        | O que fazer                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Token do GitHub expirou ("Não foi possível falar com o GitHub") | Gerar novo token (2.1) e `npx wrangler secret put GITHUB_TOKEN --config admin-worker/wrangler.jsonc`                      |
| Proprietário esqueceu a senha                                   | `npm run admin:hash-password` e atualizar `ADMIN_PASSWORD_HASH` (e trocar `SESSION_SECRET` para encerrar sessões abertas) |
| Encerrar todas as sessões                                       | Trocar `SESSION_SECRET`                                                                                                   |
| "O site foi atualizado ao mesmo tempo..."                       | Alguém publicou no meio do caminho; recarregar o painel e refazer                                                         |
| "A atualização do site falhou"                                  | Ver _Actions_ no GitHub. O conteúdo foi salvo; corrigir e rodar o workflow                                                |
| Mudou para domínio próprio                                      | Atualizar `ALLOWED_ORIGINS` no Worker e `PUBLIC_SITE_URL`/`siteUrl`                                                       |

Logs do Worker: painel da Cloudflare → Workers → `ametista-admin` → _Logs_ (erros
inesperados aparecem sem dados sensíveis).

---

## 6. Testes realizados

- **Automáticos (`npm test`)**: lista branca do CMS, listas fixas, limite de fotos,
  ponto focal, campos obrigatórios, HTML/URLs/cores inválidos, contraste, login e sessão
  (senha errada, token adulterado, sessão expirada), CORS, upload (arquivo disfarçado,
  imagem gigante/minúscula, recibo forjado), publicação em um commit, conflito,
  persistência, ausência de vazamento do token. O GitHub falso imita o runtime do
  Workers.
- **Integração real** (Worker local + GitHub de verdade, em branch de teste): login,
  bloqueio sem sessão, edição de títulos, troca de foto com progresso, links, contatos,
  cores (inválida bloqueada; válida publicada), commit real, persistência após recarregar,
  aviso de alterações não salvas, desktop e mobile sem rolagem horizontal, nenhum erro no
  console, nenhum token na página. O conteúdo gravado pelo painel passou por todo o
  `npm run validate` (o mesmo do GitHub Actions) e o site gerado mostrou título, foto e
  cor novos.

## 7. Observações

- O painel antigo de `src/pages/admin` (Cloudflare D1 + Access, documentado em
  `05-painel-administrativo.md`) pertence a uma hospedagem em Cloudflare que não está em
  uso e não é incluído no GitHub Pages. Pode ser removido quando a Top Site decidir.
- As prévias de fotos usam miniaturas geradas no build; fotos recém-enviadas (ainda não
  publicadas) são carregadas pelo Worker.
