# SEO técnico e indexação

## Implementado

- Title e meta description próprios na landing page, construídos com nome, Praia dos Ingleses, Florianópolis e Santa Catarina, sem rating, preço ou distância não confirmados.
- Um H1 principal no hero; títulos das seções seguem abaixo dele.
- Canonical absoluto apenas em produção, baseado no caminho e origem canônica configurada.
- Open Graph e Twitter Card com imagem de marca 1200 × 630 em `public/social-card.png` (arte-fonte em SVG), além dos favicons já existentes.
- `robots.txt`: produção permite a página pública, exclui painel/API e anuncia o sitemap. Dev/preview bloqueia indexação e sitemap.
- `sitemap.xml` contém apenas a URL pública `/`, que é a única página indexável hoje.
- JSON-LD usa `VacationRental`, o tipo Schema.org para hospedagem de uma propriedade por tempo limitado, com nome, descrição e URL. Não inclui endereço, coordenadas, rating, avaliações, preço, comodidades nem imagem do imóvel não confirmada. Isso é marcação semântica; não declara elegibilidade a rich result local do Google, que exige endereço físico nos dados estruturados.
- Respostas de erros e painel usam `noindex`; preview/dev usam `noindex, nofollow`.
- Em build `production`, `PUBLIC_SITE_URL` é obrigatório e precisa ser uma origem HTTPS sem caminho, query ou fragmento. Isso impede canonical e sitemap de localhost ou host incorreto.

## Pendências antes de publicar

- Confirmar e definir o domínio final em `PUBLIC_SITE_URL` tanto no ambiente de build quanto no Workers Builds. A configuração de sitemap, canonical e URLs sociais é gerada no build.
- Confirmar com o cliente os textos atuais do hero e dos diferenciais, já marcados como propostos em `src/data/ametista.json`.
- Os links reais de Booking.com, Airbnb, Decolar, Maps e redes ainda dependem dos URLs fornecidos pelo cliente; nenhum destino é inventado.
- Endereço, telefone e outras informações locais não entram no Schema.org até confirmação.
- Conferir a propriedade no Google Search Console/Bing Webmaster Tools e enviar o sitemap depois de o domínio definitivo responder em HTTPS. Essa etapa depende das contas do proprietário.

Referências: [Schema.org VacationRental](https://schema.org/VacationRental) e [requisitos de dados estruturados LocalBusiness do Google](https://developers.google.com/search/docs/appearance/structured-data/local-business).

## Verificação local

Para gerar os arquivos de produção sem publicar, use `PUBLIC_DEPLOY_ENV=production` e `PUBLIC_SITE_URL=https://dominio-confirmado.example npm run build` (substitua pela origem real ao validar). Conferir `dist/client/robots.txt`, `dist/client/sitemap.xml`, o canonical, OG/Twitter e JSON-LD no HTML de `/`, e pedir `/social-card.png` no preview. O domínio `.example` é reservado e serve apenas como exemplo, não deve ser implantado.
