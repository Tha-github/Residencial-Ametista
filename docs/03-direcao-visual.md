# Residencial Ametista — Direção de arte e sistema visual (Etapa 3)

Data: 16/11/2026 · Guia de estilo vivo (somente em desenvolvimento): `npm run dev` → `/estilo`

## 1. Conceito

**"Casa de praia com luz de fim de tarde."** Editorial, calmo e com bastante espaço em
branco. A fotografia real é a protagonista e o texto é curto. O site não deve parecer
portal de reservas nem template: sem selos, sem badges de nota no hero, sem excesso de
cartões e números. O azul-petróleo das paredes do apartamento dá a identidade, e a
areia dá o calor.

## 2. Avaliação da prévia do cliente

Fonte: HTML e CSS da prévia (`restinga-previas.pages.dev/residencial-ametista`) e fotos
do imóvel. Após o cliente indicar a prévia como fonte e pedir o uso das fotos, 9 imagens
foram incluídas e publicadas, com a marca-d'água original preservada.

| Manter                                     | Elevar                                                                                                                                    | Descartar                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Fundo areia quente e azul como cor da casa | Azul royal genérico (`#1D6299`) trocado pelo **azul-petróleo medido nas paredes** (`#0F4F6D`)                                             | Coral vibrante como segunda cor de marca: vira terracota de uso pontual          |
| Serifa nos títulos + sans no texto         | DM Serif Display (só 1 peso, muito contraste) → **Newsreader** (texto e display, itálico elegante); Manrope 5 pesos → **Figtree 2 pesos** | Google Fonts externo: as fontes agora são servidas pelo próprio site             |
| Terraço como protagonista                  | Hero com foto em tela cheia e texto mínimo (nome, local, CTA)                                                                             | Notas e avaliações do Booking no hero (dependem de autorização e parecem portal) |
| Ordem que conta a história do imóvel       | 13 seções → estrutura enxuta (Etapa 4), cada uma só se houver dado confirmado                                                             | Formulário de datas, "reserva direta", "sem intermediários" (fora do escopo)     |
| Barra de CTA no mobile                     | Hierarquia tipográfica mais contida, raio de 6px (a prévia usava 22px, visual de app)                                                     | Sombra pesada (`0 24px 60px`) e cantos muito arredondados                        |

**Problemas encontrados nas fotos da prévia:**

1. **Todas têm a marca d'água "aluganaluga"** (terceiro). Ela foi mantida intacta nas imagens publicadas; substituir por originais autorizados é recomendado.
2. A resolução máxima é **1024 px**, menor que a recomendação de 2400 px no lado maior para hero em tela cheia.
3. Qualidade irregular: algumas são profissionais (sala, quartos, terraço com guarda-sol), outras parecem de celular (mesa do terraço, cadeiras).

## 3. Paleta: Areia, Mar e Grafite

Cores medidas nas fotos (quantização de pixels): azul-petróleo `#085878` / `#285878` /
`#184858` dominante nas paredes, terracota e caramelo nas almofadas e no couro, piso areia,
verde da mata ao fundo (o verde fica por conta das fotos e não entra na paleta).

| Papel                                        | Token                               | Hex                   |
| -------------------------------------------- | ----------------------------------- | --------------------- |
| Fundo                                        | `--sand-50`                         | `#faf7f2`             |
| Superfície                                   | `--sand-100`                        | `#f2ebe0`             |
| Divisória                                    | `--sand-200`                        | `#e4d8c6`             |
| Títulos                                      | `--sea-950`                         | `#082636`             |
| Superfície invertida (hero sem foto, rodapé) | `--sea-900`                         | `#0b3346`             |
| Ação / link                                  | `--sea-700`                         | `#0f4f6d`             |
| Sobretítulo                                  | `--terra-600`                       | `#a24f28`             |
| Anel de foco                                 | `--terra-500`                       | `#c0673a`             |
| Texto / secundário                           | `--graphite-900` / `--graphite-600` | `#1e2326` / `#50575c` |

**Contraste (WCAG 2.2 AA):** 22 combinações verificadas automaticamente em
`tests/unit/contrast.test.ts`, lidas do próprio `tokens.css`. Texto: de 4,8:1 a 15:1.
Anel de foco: ≥ 3:1. Sobre foto ou fundo escuro o foco é branco. Texto sobre foto sempre
leva o véu escuro `--scrim`.

## 4. Tipografia

- **Newsreader** (títulos): pesos 400/500 e itálico 400. A última palavra do nome
  aparece em itálico no hero ("Residencial _Ametista_").
- **Figtree** (texto e interface): pesos 400/600.
- Servidas pela Fonts API do Astro (download no build, hospedagem própria, fallbacks
  com métricas ajustadas contra CLS). Preload só de 400 normal de cada família.
- Escala fluida de 9 passos (`--text-xs` → `--text-5xl`), medida de texto de 62ch.

## 5. Grid, espaço e forma

- Grid de 4, 8 e 12 colunas (mobile, ≥768 e ≥1024), com gutter fluido e conteúdo de até 1216px.
- Espaçamento com base 4px. Seções de `--space-section` (64 a 128px).
- Raios de 3, 6 e 12px. Sombras azuladas e suaves.
- Alvo de toque mínimo de 44px. No mobile, os CTAs do hero ocupam a largura total.

## 6. Componentes-base

| Componente         | Arquivo                        | Observações                                                                                                          |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Botão / link-botão | `ui/Button.astro` + `.btn`     | primary, secondary, ghost, inverse, inverse-outline; `external` → nova aba, `rel` seguro e aviso para leitor de tela |
| Ícones             | `ui/Icon.astro`                | 13 ícones de traço (Lucide, ISC), renderizados a partir de dados, sem `set:html`                                     |
| Cabeçalho de seção | `ui/SectionHeading.astro`      | sobretítulo + título + lead                                                                                          |
| Card               | `ui/Card.astro`                | plain, raised, outline; slot de mídia com zoom sutil                                                                 |
| Foto               | `media/Photo.astro`            | AVIF + WebP + JPEG, `srcset` por largura, `aspect-ratio`, ponto focal; `priority` para LCP                           |
| Placeholder        | `media/PhotoPlaceholder.astro` | listrado e rotulado "PLACEHOLDER · foto real pendente"; **não existe em produção**                                   |
| Galeria (base)     | `media/GalleryGrid.astro`      | destaque e mosaico de 2 → 3 colunas; lightbox na Etapa 5                                                             |
| Hero               | `sections/Hero.astro`          | foto real + véu; **sem foto em produção → hero tipográfico sobre mar profundo**                                      |
| Header             | `layout/SiteHeader.astro`      | transparente sobre o hero e sólido ao rolar (IntersectionObserver, ~10 linhas)                                       |
| Rodapé             | `layout/SiteFooter.astro`      | superfície invertida                                                                                                 |

Os CTAs do hero só aparecem quando o destino existe: "Ver opções de reserva" exige ao
menos um link de plataforma, e "Conhecer o residencial" exige a descrição. Em produção,
hoje, nenhum dos dois aparece.

## 7. Movimento

- Entrada do hero: fade e deslocamento de 14px só no sobretítulo, na frase e nos botões.
  O **título (LCP) nunca começa invisível**.
- Revelação ao rolar (`.reveal`): CSS puro (`animation-timeline: view()`), sem JS. Em
  navegador sem suporte, o conteúdo fica estático.
- Hover: zoom de 3% em fotos de card e deslocamento de 2–3px nas setas.
- `prefers-reduced-motion: reduce` desliga tudo, com uma rede de segurança global em `global.css`.

## 8. Verificação feita

- Screenshots (Edge headless) da home em 390px (iframe exato) e 1440px, e do guia de
  estilo em 1280px. Isso revelou e corrigiu dois problemas: o título invisível durante a
  animação e o vão na galeria em destaque.
- Build de produção: 0 placeholders, 0 avisos, `/estilo` → 404, nenhuma requisição de
  fonte a terceiros, hero tipográfico sem halo.

## 9. Briefing fotográfico (para o cliente)

Recomendado para a versão final: **originais sem marca d'água, ≥ 2400px no lado maior, com autorização de uso.**

1. **Hero (horizontal):** terraço com guarda-sol e mata ao fundo, fim de tarde, câmera na
   altura dos olhos. Deixar céu ou área livre à esquerda ou em cima para o texto.
2. Fachada / entrada do prédio.
3. Sala integrada (a parede azul é a assinatura).
4. Cozinha.
5. Quartos: 1 foto aberta e 1 de detalhe por quarto.
6. Banheiros.
7. Terraço: mesa, cadeiras, churrasqueira, vista.
8. Detalhes: texturas, enxoval, luz natural.
9. Opcional: caminho até a praia, se o cliente tiver os direitos.

Luz natural, sem flash, linhas verticais retas, ambientes arrumados e sem pessoas
identificáveis (ou com autorização).
