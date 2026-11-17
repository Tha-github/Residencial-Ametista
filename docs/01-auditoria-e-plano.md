# Residencial Ametista — Auditoria, descoberta e plano técnico (Etapa 1)

Data: 16/11/2026 · Status: **aguardando aprovação** (nenhum código escrito, nenhuma dependência instalada)

---

## 1. Estado do repositório

| Item                               | Situação                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| Arquivos                           | `10-Prompts-Residencial-Ametista.md` (roteiro) e `CLAUDE.md` (**vazio, 0 bytes**) |
| Framework / dependências / scripts | Nenhum (sem `package.json`)                                                       |
| Hospedagem configurada             | Nenhuma (sem `wrangler.toml`, `vercel.json`, `netlify.toml`)                      |
| Git                                | **Não é repositório Git**                                                         |
| Ambiente local                     | Node 24.19, npm 11.17, Git 2.55                                                   |
| Projeto irmão                      | `../Residencial Estrela Dalva`: mesmo estado (roteiro + `CLAUDE.md` vazio)        |

**Bloqueio crítico:** o roteiro exige seguir "integralmente o `CLAUDE.md`" e cita seus critérios de aceite e a "cláusula 3ª do contrato", mas o arquivo está vazio. Sem ele, escopo, aceite e limites do painel ficam sem fonte oficial.

## 2. Prévia do cliente

URL: https://restinga-previas.pages.dev/residencial-ametista. Acessível (HTTP 200). A raiz `restinga-previas.pages.dev/` retorna 404. A análise usou o conteúdo da página (texto, imagens e links). Não houve inspeção visual renderizada: cores, tipografia e composição ainda precisam de screenshots ou de uma revisão no navegador.

**Hierarquia:** header ("Ametista Residencial · Ingleses", âncoras: O apartamento, Terraço, Avaliações, A região, Roteiro, Dúvidas, CTA "Ver datas") → hero ("Seu terraço gourmet a 250 metros do mar", notas do Booking) → 13 seções numeradas (Por que o Ametista, Tour, Tudo incluso, Terraço gourmet, Feito para você, Apartamento × hotel, Avaliações, Anfitrião, A região, Roteiro, Reserva direta, Localização, Dúvidas) → CTA final → linha em espanhol → footer → barra fixa mobile (Ver datas / WhatsApp).

**Imagens:** 11 fotos do imóvel em `fotos/` (sala, quartos, cozinha, terraço, varanda), aparentemente reais. Outras 6 fotos da região vêm da Wikimedia Commons (licenças CC, creditadas no footer).

**Conflitos entre a prévia e o escopo/roteiro (decisão do cliente necessária):**

1. **Modelo de reserva.** A prévia oferece "Reserva direta", "Sem intermediários", um formulário de datas/hóspedes e WhatsApp. O roteiro manda direcionar para links externos do Booking.com, Airbnb e Decolar e proíbe simular disponibilidade. O formulário de datas não será implementado. Falta confirmar se o WhatsApp entra como contato.
2. **Avaliações.** Nota 9,4 do Booking (35 avaliações), sub-notas e trechos nominais de hóspedes. Só serão publicadas se o cliente confirmar e se estiverem atualizadas, com link para a fonte. Elas **não** entrarão no Schema.org (o Google não aceita avaliações autodeclaradas ou de terceiros como rich result do próprio negócio). Republicar os textos do Booking também exige cuidado com os termos de uso.
3. **Volume de conteúdo.** Roteiro de 3 dias, comparativo com hotel e guia da região são conteúdos editoriais extensos. Ficam como opcionais de fase 2. O painel contratado edita textos **predefinidos**, então essas seções precisariam ter campos fixos.
4. **"Pátio externo"**, citado no roteiro como diferencial possível, não aparece na prévia. A prévia fala em terraço gourmet e varanda.
5. **Links quebrados.** WhatsApp e "Ver datas" apontam para `#`.

**O que manter:** foco no terraço gourmet e na proximidade do mar, fotos reais, ordem que conta uma história (fachada → social → quartos → terraço), FAQ curto, barra de CTA no mobile. **O que elevar:** hierarquia mais enxuta (13 seções é excessivo), tipografia e paleta próprias, galeria com lightbox. **O que descartar:** formulário de datas, "sem intermediários" e qualquer dado não confirmado.

## 3. Dados do briefing

Os dados vêm **apenas da prévia**. Nada foi confirmado pelo cliente.

| Dado                             | Na prévia                                                                                                                               | Status                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Fotos reais                      | 11 arquivos web (resolução desconhecida)                                                                                                | **Solicitar originais em alta**     |
| Descrição                        | Textos de marketing                                                                                                                     | Validar                             |
| Área                             | 90 m²                                                                                                                                   | Confirmar                           |
| Quartos / banheiros              | 2 / 2                                                                                                                                   | Confirmar                           |
| Camas                            | 4 (1 casal + solteiros)                                                                                                                 | **Confirmar a composição exata**    |
| Capacidade                       | Não declarada (o formulário permite até 6 adultos + 4 crianças, incoerente com 4 camas)                                                 | **Solicitar**                       |
| Comodidades                      | Vaga grátis, A/C, Wi-Fi, streaming, elevador, máquina de lavar, churrasqueira, kit praia, enxoval, cadeirão/berço (sob disponibilidade) | Confirmar item a item               |
| Pets                             | "Aceitos mediante pedido, sem custo"                                                                                                    | Confirmar                           |
| Check-in / check-out             | Entrada das 14h às 23h30 / **saída não informada**                                                                                      | Solicitar o check-out               |
| Regras da casa                   | Não informadas                                                                                                                          | **Solicitar**                       |
| Links Booking / Airbnb / Decolar | Inexistentes                                                                                                                            | **Solicitar URLs**                  |
| Instagram                        | Inexistente                                                                                                                             | Solicitar (ou confirmar que não há) |
| WhatsApp / telefone / e-mail     | Ausente (`#`)                                                                                                                           | **Solicitar**                       |
| Avaliações                       | 9,4 Booking, 35 avaliações                                                                                                              | Confirmar uso e atualização         |
| Domínio de produção              | —                                                                                                                                       | **Solicitar**                       |
| Hospedagem                       | Prévia no Cloudflare Pages                                                                                                              | **Confirmar**                       |
| Nome do anfitrião                | "Marcelo", "Sr. Davi" (citados em avaliações)                                                                                           | Confirmar se deve aparecer          |

## 4. Localização

- Endereço na prévia: **Rua Dante de Patta, 283, Ingleses do Rio Vermelho, Florianópolis/SC, CEP 88058-510**.
- Link da prévia: `https://www.google.com/maps/dir/?api=1&destination=-27.4347382,-48.3962649`.
- Verificação (geocodificação reversa via OpenStreetMap/Nominatim): as coordenadas caem **na Rua Dante de Patta, CEP 88058-510**, a cerca de 55 m do ponto de referência da rua. Rua e CEP batem com o endereço. O **número 283 não pôde ser verificado** (o OSM não tem numeração nesse trecho).
- Pendente: o cliente deve confirmar o pin exato (de preferência enviando o link "Compartilhar" do Google Maps da entrada do prédio) e a distância de "250 m / 4 min" até a praia.

## 5. Arquitetura proposta

Premissa: o site público é uma landing page de alta performance. O painel edita somente campos fixos. A segurança precisa ser aplicada no servidor.

### Recomendada (se a hospedagem for Cloudflare, como a prévia)

- **Astro + TypeScript.** HTML gerado no servidor, zero JS por padrão e ilhas mínimas (lightbox, painel). Imagens via `astro:assets` (AVIF/WebP).
- **Cloudflare Pages + Pages Functions** (adapter `@astrojs/cloudflare`). A página pública é renderizada na borda a partir do D1, com cache e purge a cada salvamento.
- **Cloudflare Access (Zero Trust, gratuito até 50 usuários)** protege `/admin` e `/api/admin/*`. O login (OTP por e-mail ou Google) e o limite de tentativas ficam a cargo da Cloudflare, antes de a requisição chegar à aplicação. As Functions **validam o JWT do Access** (`Cf-Access-Jwt-Assertion`, assinatura + `aud`) em toda escrita. Nenhum segredo vai para o navegador.
- **D1 (SQLite)** guarda o conteúdo em um esquema de campos fixos validado com Zod (texto puro, sem HTML; URLs com allowlist de domínios: booking.com, airbnb.com.br/.com, decolar.com, google.com/maps, maps.app.goo.gl, instagram.com, wa.me).
- **R2** armazena as imagens. O upload passa pela Function, que valida tamanho, extensão, MIME e magic bytes e grava com nome aleatório. Derivados responsivos saem do Cloudflare Image Transformations (camada gratuita com limite mensal).
- **Isolamento:** cada residencial tem seu próprio projeto Pages, seu D1, seu bucket R2 e sua aplicação Access. Não há dados compartilhados.
- **Custo estimado:** R$ 0 dentro das camadas gratuitas para o tráfego típico, mais o domínio. Os limites serão documentados.

### Alternativa (se a hospedagem for outra, ex.: Vercel ou estática genérica)

- Astro estático + **Supabase** (Auth + Postgres com RLS + Storage). A chave `anon` é pública por design e a proteção vem das policies RLS. O upload é validado em uma Edge Function. Salvar dispara o deploy hook (segredo mantido no servidor).
- Ressalva: no plano gratuito, o Supabase **pausa projetos após 7 dias de inatividade**. O site estático continua no ar, mas o painel fica indisponível até ser reativado. O plano Pro custa cerca de US$ 25/mês por organização.

### Fora do escopo (não será implementado)

Channel Manager, sincronização de calendário/iCal, bloqueio de datas, tarifas, motor de reservas, checkout, formulário de disponibilidade.

## 6. Estrutura de páginas e componentes

Página única (`/`) com âncoras, mais `/admin` (protegida), `404` e, se o cliente quiser, `/politica-de-privacidade`.

```
src/
  content/schema.ts        # Zod: campos editáveis fixos + allowlists
  lib/                     # db (D1), auth (JWT Access), validação, upload
  components/
    layout/  Header, Footer, MobileCtaBar, SkipLink
    sections/ Hero, Apresentacao, Galeria, Diferenciais,
              Comodidades, InfoPraticas, Localizacao, Reservar, Contato
    ui/      Button, Icon, Lightbox, Picture
    admin/   AdminForm, ImageField, SaveStatus
  pages/ index.astro, admin/index.astro, api/admin/*.ts, 404.astro
  styles/ tokens.css, global.css
```

As seções só são renderizadas quando os dados correspondentes estão confirmados (sem estado com placeholder em produção).

## 7. Estratégias

- **Conteúdo:** textos originais, curtos, sem superlativos não comprováveis. O conteúdo deve ser diferente do Estrela Dalva (para evitar duplicação). A reserva "é concluída na plataforma escolhida" deve ficar explícita.
- **SEO:** um único H1, title/description próprios, canonical no domínio final, OG, `sitemap.xml`, `robots.txt`. Schema `Accommodation`/`Apartment` (ou `VacationRental`, se os dados exigidos estiverem completos) apenas com campos confirmados: sem preço, sem rating e sem endereço não confirmado.
- **Performance:** meta de LCP < 2,5 s em 4G, CLS < 0,1, INP < 200 ms. Hero sem lazy-load e com `fetchpriority=high`. Fontes self-hosted com subset. Mapa via link (sem iframe automático).
- **Segurança:** CSP restritiva, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`. Texto escapado por padrão. Validação no servidor. Logs sem PII. Segredos apenas em variáveis da plataforma.
- **Testes:** Vitest (validação/schema/allowlist/upload), Playwright (público + painel com Access simulado em dev, viewports 360/414/768/1280), Lighthouse CI, axe para acessibilidade, `astro check` + ESLint.

## 8. Plano em ordem de execução

0. **Desbloqueio:** preencher o `CLAUDE.md` (ou fornecer contrato/cláusula 3ª e critérios de aceite), confirmar hospedagem e domínio, inicializar o Git.
1. Fundação: Astro + TS, tokens, scripts (dev/build/lint/check/test), `.env.example`, README (Prompt 2).
2. Sistema visual com base nas fotos reais (Prompt 3).
3. Seções públicas com dados confirmados (Prompt 4).
4. Galeria, mídia e mobile (Prompt 5).
5. Painel: D1 + R2 + Access + APIs validadas (Prompt 6).
6. SEO técnico (Prompt 7) → 7. Hardening (Prompt 8) → 8. Performance/a11y/E2E (Prompt 9) → 9. Aceite final (Prompt 10).

## 9. Pendências

**Do desenvolvedor/contratante**

- [ ] Conteúdo do `CLAUDE.md` / contrato (cláusula 3ª) / critérios de aceite
- [ ] Hospedagem definitiva e acesso à conta (Cloudflare ou outra)
- [ ] Autorização para `git init` e repositório remoto
- [ ] Screenshots da prévia (desktop e mobile), se a referência visual exata for necessária

**Do cliente**

- [ ] Fotos originais em alta resolução (e autorização de uso)
- [ ] Capacidade máxima, composição das camas, área, quartos/banheiros
- [ ] Lista de comodidades confirmada, regras da casa, política de pets
- [ ] Horário de check-out (e confirmação do check-in 14h–23h30)
- [ ] URLs exatas dos anúncios no Booking.com, Airbnb e Decolar
- [ ] WhatsApp/telefone/e-mail e Instagram (ou confirmação de que não há)
- [ ] Pin exato do Google Maps e confirmação da distância até a praia
- [ ] Decisão sobre "reserva direta via WhatsApp" × links externos
- [ ] Autorização para exibir nota/avaliações do Booking (e nomes de hóspedes)
- [ ] Se há "pátio externo" neste imóvel
- [ ] Domínio de produção e e-mail(s) que terão acesso ao painel
