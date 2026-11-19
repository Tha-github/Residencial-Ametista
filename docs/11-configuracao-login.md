# Login e primeira configuração do painel

A tela está em `/admin/`. No primeiro acesso, escolha **Configurar chave secreta e senha** e preencha somente a chave GitHub e a senha (mais a confirmação da senha). O Worker verifica se o token pode gravar neste repositório antes de guardar a chave cifrada no KV. A senha é armazenada apenas como hash PBKDF2.

## Rodar localmente

Se `admin-worker/.dev.vars` ainda não existir, rode `npm run admin:setup-secrets` e copie as duas linhas geradas para esse arquivo local. Em terminais separados, execute `npm run admin:dev` e `npm run dev -- --host 127.0.0.1`. Abra `http://127.0.0.1:4321/admin/`. O Astro em desenvolvimento usa o Worker local na porta 8787 por padrão. Se houver uma variável `PUBLIC_ADMIN_API_URL` configurada, ela tem prioridade.

## Preparar o Worker (Top Site, uma vez)

1. Crie um token GitHub fine-grained restrito ao repositório `Tha-github/Residencial-Ametista`, com `Contents: Read and write`.
2. Gere os segredos necessários para cifrar a chave e assinar sessões:

   ```powershell
   npm run admin:setup-secrets
   ```

   O comando imprime `CONFIG_KEY` e `SESSION_SECRET`. Trate-os como segredos e não os coloque em arquivos versionados.

3. Faça login no Cloudflare e crie o KV:

   ```powershell
   npx wrangler login
   npx wrangler kv namespace create ADMIN_KV --config admin-worker/wrangler.jsonc
   ```

   Copie o `id` retornado para o binding `ADMIN_KV` em `admin-worker/wrangler.jsonc`:

   ```jsonc
   "kv_namespaces": [
     { "binding": "ADMIN_KV", "id": "ID_REAL_DO_NAMESPACE" }
   ],
   ```

4. Grave os segredos sem colocá-los no repositório e publique o Worker:

   ```powershell
   npx wrangler secret put CONFIG_KEY --config admin-worker/wrangler.jsonc
   npx wrangler secret put SESSION_SECRET --config admin-worker/wrangler.jsonc
   npm run admin:deploy
   ```

   Cole o valor correspondente quando cada comando solicitar. O token GitHub e a senha do proprietário serão cadastrados pela tela do painel.

5. Configure a variável `ADMIN_API_URL` em GitHub → Settings → Secrets and variables → Actions → Variables com a URL HTTPS mostrada pelo deploy. Execute novamente o workflow de GitHub Pages.

## Cadastrar chave e senha

Abra `https://tha-github.github.io/Residencial-Ametista/admin/`, selecione **Configurar chave secreta e senha** e informe a chave GitHub, uma senha com pelo menos 10 caracteres e a confirmação. O cadastro inicial só aceita uma chave com acesso de escrita ao repositório e exige a chave e a senha juntas. Depois, volte ao login e entre com a senha.

O cadastro pela tela é de uso inicial. Para trocar futuramente a chave ou a senha, use os secrets `GITHUB_TOKEN` e `ADMIN_PASSWORD_HASH` no Worker. Gere o hash da senha com `npm run admin:hash-password`; para invalidar sessões existentes, atualize também `SESSION_SECRET`.

## Se perder a chave de cifragem

Preserve `CONFIG_KEY`: ela é necessária para decifrar o token guardado no KV. Se for perdida, o token terá de ser cadastrado novamente após configurar uma nova `CONFIG_KEY`; trocar apenas a senha não exige recriar esse segredo.
