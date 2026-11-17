# Residencial Ametista — Conteúdo publicado e pendências (Etapa 4)

Data: 17/11/2026

## 1. Como a página funciona

Cada seção de imóvel só aparece quando os dados dela foram fornecidos e confirmados.
Quem decide isso é o mapa de seções (`src/lib/content/sections.ts`). Header, rodapé,
menu e CTAs seguem o mesmo mapa, então nunca existe um botão ou link para uma seção
que não está na página. Enquanto os links de reserva estiverem ausentes, a página
pública exibe um aviso de conteúdo em atualização; o hero sem foto usa cabeçalho sólido
e altura reduzida para não sugerir uma área de mídia quebrada.

| #   | Seção                                       | Aparece quando houver                                                                         | Hoje                              |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | Header + menu curto                         | ao menos uma seção navegável / links de reserva                                               | só o nome (sem menu)              |
| 2   | Hero                                        | sempre. Foto e CTAs dependem de dados                                                         | **publicado** (sem foto, sem CTA) |
| 3   | Apresentação                                | descrição                                                                                     | aguardando                        |
| 4   | Galeria                                     | fotos reais                                                                                   | aguardando                        |
| 5   | Diferenciais                                | diferenciais confirmados                                                                      | **publicado**                     |
| 6   | Espaço e comodidades                        | capacidade, quartos, camas, banheiros, área ou comodidades (cada item é exibido isoladamente) | aguardando                        |
| 7   | Informações práticas                        | check-in, check-out ou regras                                                                 | aguardando                        |
| 8   | Localização                                 | link do Google Maps validado                                                                  | aguardando                        |
| 9   | Reservas                                    | ao menos um link de plataforma                                                                | aguardando                        |
| 10  | Contato                                     | WhatsApp, Instagram ou e-mail                                                                 | aguardando                        |
| 11  | Rodapé                                      | sempre. As colunas Navegação, Reservar e Contato dependem de dados                            | **publicado** (nome e local)      |
| —   | Barra fixa "Ver opções de reserva" (mobile) | links de reserva                                                                              | oculta                            |

**Reservas:** cada plataforma tem um botão próprio ("Reservar no Booking.com" etc.), que
abre em nova aba. A seção diz claramente que **datas, valores, pagamento e confirmação
acontecem na plataforma escolhida** e que o site não processa reservas. Não há
calendário, preço, disponibilidade nem formulário. Isso é verificado por teste
automatizado (`tests/unit/render.test.ts`).

## 2. Textos publicados que precisam de aprovação do cliente

Foram escritos pela equipe **somente a partir dos fatos confirmados no briefing**
(Praia dos Ingleses, proximidade do mar, Florianópolis/SC), sem distâncias, números
ou adjetivos que não possamos comprovar.

| Onde                           | Texto                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Hero (frase)                   | "Hospedagem na Praia dos Ingleses, perto do mar, no norte de Florianópolis."                                                       |
| Diferenciais (título da seção) | "O mar por perto"                                                                                                                  |
| Diferencial 1                  | **Perto do mar**: "A Praia dos Ingleses fica a uma curta caminhada do residencial."                                                |
| Diferencial 2                  | **No norte da Ilha**: "Ingleses fica no norte de Florianópolis, em Santa Catarina, com outras praias da região a pouca distância." |

Textos de interface (títulos de seção, botões, avisos) são do sistema e não descrevem o
imóvel. Ex.: "Escolha onde reservar", "Abrir no Google Maps", "Informações práticas".

## 3. Lista de pendências para o cliente

### Essenciais (sem eles o site não cumpre o objetivo de levar à reserva)

1. **URLs dos anúncios** no Booking.com, Airbnb e Decolar. O link exato de cada anúncio,
   não a página inicial.
2. **Fotos originais** em alta resolução (≥ 2400px), **sem marca d'água** e com
   autorização de uso. As fotos da prévia têm a marca "aluganaluga" e não podem ser
   publicadas. O briefing fotográfico está em `docs/03-direcao-visual.md` §9.
3. **Link do Google Maps** do imóvel: link "Compartilhar" do pin na entrada do prédio.
4. **Descrição do residencial**: 1 a 3 parágrafos curtos, ou aprovação de um texto que
   redigiremos a partir dos dados confirmados.

### Dados do imóvel (cada item confirmado aparece isoladamente)

5. Capacidade máxima de hóspedes.
6. Número de quartos e de banheiros.
7. Composição das camas (ex.: "1 casal + 2 solteiro").
8. Área (m²), se desejar exibir.
9. Comodidades, item a item. A prévia lista vaga privativa, ar-condicionado, Wi-Fi,
   streaming, elevador, máquina de lavar, churrasqueira, kit praia, enxoval,
   cadeirão/berço. **Confirmar quais são verdadeiras hoje.**
10. **O terraço/pátio externo:** este imóvel tem? Pode ser destacado como diferencial?
    (O roteiro prevê "amplo terraço e pátio externo, quando aplicável".)

### Informações práticas

11. Horário de check-in. A prévia diz 14h às 23h30: confirmar.
12. **Horário de check-out** (não informado).
13. Regras da casa (silêncio, fumo, festas, visitantes etc.).
14. Política de pets. A prévia diz "aceitos mediante pedido": confirmar.

### Contato

15. WhatsApp (número para link `wa.me`), Instagram e/ou e-mail, ou confirmação de
    que não haverá canal de contato no site.

### Decisões

16. **Endereço completo** (Rua Dante de Patta, 283): pode ser exibido publicamente?
17. **Avaliações do Booking** (nota 9,4): deseja exibir? Exige autorização e
    atualização periódica, e não entra nos dados estruturados.
18. **Aprovação dos textos da seção 2.**

## 4. Onde cada dado entra

Hoje: `src/data/ametista.json`. Na Etapa 6, pelo painel administrativo.

| Dado                                        | Campo                                                               |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Frase do hero                               | `tagline`                                                           |
| Descrição                                   | `description[]`                                                     |
| Fotos                                       | `media.hero`, `media.gallery[]` (arquivos em `src/assets/photos/`)  |
| Diferenciais                                | `highlights[]`                                                      |
| Capacidade, quartos, camas, banheiros, área | `facts.*`                                                           |
| Comodidades                                 | `amenities[]`                                                       |
| Check-in/out, regras                        | `practicalInfo.*`                                                   |
| Maps, endereço                              | `location.mapsUrl`, `location.streetAddress`, `location.postalCode` |
| Plataformas                                 | `booking.booking`, `booking.airbnb`, `booking.decolar`              |
| Contato                                     | `contact.whatsapp`, `contact.instagram`, `contact.email`            |

Todos os links são validados (HTTPS + domínio esperado). Um URL errado interrompe o
build com a mensagem indicando o campo.

## 5. Revisão de layout

A página `/estilo/secoes` (somente em desenvolvimento) mostra **todas** as seções
preenchidas com dados marcados `[AMOSTRA]`, para revisar o layout antes de os dados
reais chegarem. Ela foi conferida em 390px e 1280px. O build de produção não contém
essa rota nem o texto "AMOSTRA" (verificado).
