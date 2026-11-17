# Residencial Ametista — Conteúdo publicado e pendências (Etapa 4)

Data: 17/11/2026

## 1. Como a página funciona

Cada seção de imóvel só aparece quando os dados dela foram fornecidos e confirmados.
Quem decide isso é o mapa de seções (`src/lib/content/sections.ts`). Header, rodapé,
menu e CTAs seguem o mesmo mapa, então nunca existe um botão ou link para uma seção
que não está na página. O conteúdo e as fotos publicados agora vêm da prévia indicada
em 17/11/2026. As fotos mantêm a marca-d'água original. Sem contato de reserva
confirmado, a página não exibe CTA sem destino. Booking.com, Airbnb e Decolar foram
omitidos a pedido do cliente.

| #   | Seção                                       | Aparece quando houver                                                                         | Hoje                                             |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Header + menu curto                         | ao menos uma seção navegável / links de reserva                                               | **publicado** (apresentação, fotos, localização) |
| 2   | Hero                                        | sempre. Foto e CTAs dependem de dados                                                         | **publicado** (foto do terraço)                  |
| 3   | Apresentação                                | descrição                                                                                     | **publicado**                                    |
| 4   | Galeria                                     | fotos reais                                                                                   | **publicado** (9 fotos com marca-d'água)         |
| 5   | Diferenciais                                | diferenciais informados na prévia                                                             | **publicado**                                    |
| 6   | Espaço e comodidades                        | capacidade, quartos, camas, banheiros, área ou comodidades (cada item é exibido isoladamente) | **publicado** (dados da prévia)                  |
| 7   | Informações práticas                        | check-in, check-out ou regras                                                                 | **parcial** (check-in; faltam check-out/regras)  |
| 8   | Localização                                 | link do Google Maps validado                                                                  | **publicado** (link enviado pelo cliente)        |
| 9   | Reservas                                    | ao menos um link de plataforma                                                                | aguardando                                       |
| 10  | Contato                                     | WhatsApp, Instagram ou e-mail                                                                 | aguardando                                       |
| 11  | Rodapé                                      | sempre. As colunas Navegação, Reservar e Contato dependem de dados                            | **publicado** (nome e local)                     |
| —   | Barra fixa "Ver opções de reserva" (mobile) | links de reserva                                                                              | oculta                                           |

**Reservas:** links do Booking.com, Airbnb e Decolar foram omitidos a pedido do cliente.
Não há contato WhatsApp ou outro destino de reserva confirmado, portanto não existe CTA
de reserva. O site não tem calendário, preço, disponibilidade nem formulário.

## 2. Origem do conteúdo publicado

O cliente indicou como fonte `https://restinga-previas.pages.dev/residencial-ametista/`.
Foram usados os dados necessários às seções implementadas; números e características
da prévia ainda precisam de conferência do cliente antes do aceite final.

| Onde          | Texto                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Hero (frase)  | "Apartamento com terraço gourmet a 250 m da Praia dos Ingleses, em Florianópolis."                |
| Apresentação  | Apartamento de 90 m², 2 quartos, 2 banheiros, cozinha completa e terraço gourmet; 250 m da praia. |
| Diferencial 1 | **Praia a cerca de 250 m**; aproximadamente quatro minutos a pé, conforme a prévia.               |
| Diferencial 2 | **Terraço gourmet privativo**, com mesa, guarda-sol e churrasqueira.                              |

Textos de interface (títulos de seção, botões, avisos) são do sistema e não descrevem o
imóvel. Ex.: "Escolha onde reservar", "Abrir no Google Maps", "Informações práticas".

## 3. Lista de pendências para o cliente

### Essenciais (sem eles o site não cumpre o objetivo de levar à reserva)

1. **Contato/canal de reserva direto**: WhatsApp/telefone, Instagram ou e-mail. Links de
   Booking.com, Airbnb e Decolar foram dispensados pelo cliente.
2. **Fotos originais** sem marca-d'água e autorização de uso para substituir as fotos
   da prévia atualmente publicadas com a marca intacta.
3. **Descrição do residencial**: revisar ou aprovar o texto derivado da prévia.

### Dados do imóvel (cada item confirmado aparece isoladamente)

4. Capacidade máxima de hóspedes (não determinada pelo número de camas).
5. Número de quartos e banheiros informados na prévia (2 e 2): confirmar.
6. Composição das 4 camas.
7. Área informada (90 m²): confirmar se deseja exibir.
8. Confirmar as comodidades listadas a partir da prévia.
9. Confirmar se o terraço gourmet e churrasqueira podem ser divulgados.

### Informações práticas

10. Horário de check-in (14h às 23h30 conforme prévia): confirmar.
11. **Horário de check-out** (não informado).
12. Regras da casa (silêncio, fumo, festas, visitantes etc.).
13. Política de pets (a prévia diz aceitos mediante pedido): confirmar.

### Contato

14. WhatsApp (número para link `wa.me`), Instagram e/ou e-mail, ou confirmação de
    que não haverá canal de contato no site.

### Decisões

15. Endereço completo consta na prévia e foi publicado: confirmar se deve permanecer público.
16. **Avaliações do Booking** (nota 9,4): deseja exibir? Exige autorização e
    atualização periódica, e não entra nos dados estruturados.
17. **Revisão e aprovação dos dados/textos extraídos da prévia.**

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
