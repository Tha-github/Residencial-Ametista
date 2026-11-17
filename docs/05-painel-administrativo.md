# Painel administrativo

O painel edita os campos já definidos pelo site. Não há cadastro de páginas/seções, editor HTML, gestão de reservas, calendário, preços ou integrações de Channel Manager.

## Componentes implantados

- `/admin` e `/api/admin/*` validam no servidor o JWT RS256 do Cloudflare Access, incluindo assinatura, emissor, expiração, o `aud` desta aplicação e igualdade com o e-mail único `ADMIN_ALLOWED_EMAIL`.
- O Access faz autenticação (OTP/IdP), allowlist de usuários e limitação de tentativas antes de chegar ao Worker. Proteja `/admin*` e `/api/admin/*` em uma aplicação Self-hosted com uma política **Allow** que contenha somente o e-mail do proprietário. Não crie regra Bypass.
- D1 grava um único registro fixado ao ID `residencial-ametista`; a API aplica o schema Zod comum ao site, que rejeita HTML, fontes de imagem fora dos caminhos previstos e URLs fora da allowlist. A auditoria guarda apenas o identificador genérico `owner`, ação e horário; não guarda e-mail nem conteúdo anterior, e entradas com mais de 90 dias são removidas na próxima operação administrativa.
- R2 guarda os arquivos enviados sob nome UUID e prefixo fixo do residencial. O servidor limita a 12 MB e valida extensão, MIME, assinatura e dimensões (máximo de 40 megapixels). Somente JPEG, PNG, WebP e AVIF são aceitos.
- O conteúdo em D1 é usado na renderização pública em runtime. D1 e bucket são bindings separados por projeto.
- D1 aplica limites de escrita por janela fixa: 20 salvamentos por 10 minutos e 8 uploads por minuto para o único usuário autorizado.
- Logout usa a rota oficial `/cdn-cgi/access/logout`. A sessão e o limite de tentativas pertencem ao Access; ajuste a duração de sessão na aplicação Access.

## Ativação no Cloudflare

1. Crie um D1 exclusivo para este site e aplique `migrations/0001_content.sql` com `npx wrangler d1 create residencial-ametista-content` e `npx wrangler d1 migrations apply residencial-ametista-content --remote`.
2. Crie o bucket privado exclusivo `residencial-ametista-media` com `npx wrangler r2 bucket create residencial-ametista-media`. O endpoint `/media/*` entrega somente objetos do prefixo deste residencial; não habilite acesso público direto ao bucket.
3. Substitua `REPLACE_WITH_D1_DATABASE_ID` em `wrangler.jsonc` pelo UUID retornado pelo comando D1.
4. Configure `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` e `ADMIN_ALLOWED_EMAIL` como secrets do Worker (`npx wrangler secret put ...`). O domínio deve ser o host `equipe.cloudflareaccess.com`, sem protocolo; o AUD é o identificador da aplicação Access; o e-mail precisa coincidir com o único usuário proprietário autorizado na política.
5. No Zero Trust, crie aplicação Self-hosted para o hostname definitivo, com caminhos `/admin*` e `/api/admin/*`. Defina uma política Allow por e-mail para o proprietário. A aplicação precisa cobrir exatamente o hostname servido pelo Worker.
6. Publique com `npm run build` e `npx wrangler deploy`. Confirme `/admin` redirecionando para Access sem sessão, acesso apenas ao e-mail permitido, upload e atualização refletindo na página pública. Faça a configuração inicial antes de anunciar o painel.

## Primeiro acesso e recuperação

O primeiro usuário é criado na política Allow do Cloudflare Access; não existe senha inicial no código nem usuário privilegiado no banco. Convide/verifique o e-mail do proprietário pelo IdP/OTP configurado e teste o login. Para recuperação, um administrador da conta Cloudflare remove ou substitui o e-mail permitido e, se necessário, revoga sessões Access. Não edite D1 manualmente para contornar o login. Guarde os IDs do D1, bucket, AUD e as instruções de recuperação no cofre operacional, nunca neste repositório.

## Custos e limites

O painel depende de conta Cloudflare, hostname na zona e configuração Access. D1 Free inclui 5 milhões de linhas lidas/dia, 100 mil escritas/dia e 5 GB agregados; ao exceder limites diários, consultas Free falham até a redefinição. R2 Free inclui 10 GB-mês, 1 milhão de operações Class A e 10 milhões Class B por mês, sem cobrança de egress; excedentes seguem a tabela de preços. O plano Workers Free também tem limites de requests/CPU. Consulte os valores vigentes antes de publicar e ative alertas de uso. Referências oficiais: [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/).

## Estado de ativação

Os handlers, a interface, as migrations e os bindings estão no código, mas ainda precisam dos recursos da conta do contratante: ID real do banco, D1/R2 criados, secrets, hostname e política Access. Até provisionar e validar esses recursos, não trate o painel como acessível em produção. O CLAUDE.md contém o escopo atual; o contrato e a cláusula 3ª não estão no workspace, portanto este documento não presume seu conteúdo.
