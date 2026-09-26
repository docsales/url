# CLAUDE.md

Instruções pra qualquer agente de IA trabalhando neste repo (Kutt / RumBee URL,
`url.rumbee.ai`). Pendências e histórico: [`BACKLOG.md`](./BACKLOG.md).

## O app

- Fork do Kutt (encurtador de URL): Node/Express + Handlebars (`hbs`) + htmx, CSS puro
  sem build step, Knex (Postgres em produção). Ferramenta interna, single-tenant.
- Deploy: Railway, projeto `url`, serviço "Rumbee URL". **Não há auto-deploy do GitHub** —
  o deploy é manual com `railway up` a partir do working tree local.
- Testes: `npm test` (`node --test`, arquivos `*.test.js` ao lado do código). Rodar antes
  de todo commit.

## Workflow (regras que já custaram caro)

- **Deploy só a partir de `main`.** Fluxo: branch → PR → merge em `main` → `railway up`
  com o working tree idêntico à `main` (`git diff --stat HEAD origin/main` vazio). Em
  2026-09-26 a produção rodava 5 commits de uma branch que nunca tinha entrado na
  `main` — ninguém sabia o que estava no ar.
- **Conferir o que está no ar antes de corrigir produção:** o deploy do Railway não tem
  source (CLI), então compare o horário do último deploy (`list-deployments`) com os
  commits das branches.
- **Assets estáticos têm cache de 4h no Cloudflare** (`Cache-Control: max-age=14400`).
  CSS/JS linkados no `layout.hbs` levam `?v={{asset_version}}` (hash do conteúdo,
  `server/handlers/locals.handler.js`). Arquivo estático novo que muda com deploy →
  entra na lista do hash e no `?v=`.
- Rodar o app localmente precisa bind de porta (fora do sandbox) e um usuário no banco
  (senão tudo redireciona pra `/create-admin`).

## RumBee ID (SSO via Clerk)

Login é exclusivamente pelo RumBee ID (`id.rumbee.ai`), mesma instância Clerk de todos os
apps `*.rumbee.ai` (Frontend API `clerk.rumbee.ai`). Spec com a revisão de 2026-09-26:
`docs/superpowers/specs/2026-09-25-rumbee-id-integration-design.md`.

**Modelo — a sessão do Clerk é a fonte de verdade; o JWT do Kutt é só cache:**

- Servidor (`server/rumbee/session.js`, dentro de `authenticate()` pra toda rota `jwt`),
  a cada request: Clerk logado → garante que o cookie `token` do Kutt é desse
  `clerk_user_id` (provisiona/vincula em `server/rumbee/provision.js`); Clerk deslogado
  (`__client_uat` ausente ou `0`) → apaga o cookie; `handshake` → repassa o 307 do Clerk
  com os headers; indeterminado (XHR com `__session` vencido) → mantém o cookie.
- Browser (`static/scripts/rumbee-session.js`, clerk-js v6 + `@clerk/ui` v1): renova o
  `__session` (token de 60s), recarrega a página quando o usuário sai/troca de conta em
  outro app, monta o `<SignIn/>` no `/login` com o `appearance` do `id.` e faz
  `Clerk.signOut()` (global, todos os apps) no `/logout`.
- Acesso ao produto (`rumbeeAccessGate` + `server/rumbee/access-cache.js`) é separado de
  estar logado: sem acesso → tela "sem acesso", **nunca** redirect pra login/logout
  (vira loop, porque a sessão RumBee continua válida).
- Conta RumBee: single-tenant, todos os usuários compartilham um `rumbeeId`
  (`server/rumbee/client.js`). Conta = empresa cliente, nunca usuário.

**Aprendizados (não repita):**

- "SSO de graça, sem redirect" do guia do `id.` só vale pra app com Clerk no frontend
  (React/Next). App renderizado no servidor recebe `status: "handshake"` no primeiro
  acesso de um subdomínio — é um redirect e tem que ser repassado, não substituído
  (substituir dispara o guard de loop do Clerk e o login nunca completa).
- Nunca derive uma sessão própria "uma vez" do Clerk (padrão OIDC do Kutt): login feito
  em outro app não chega aqui e logout no `id.` nunca chega. Os webhooks do `id.` cobrem
  conta/acesso, **não** logout.
- Separar "deslogado de fato" (`session-token-and-uat-missing`,
  `session-token-but-no-client-uat`) de "token vencido" (`session-token-expired` etc.) —
  XHR nunca é elegível pra handshake e o Clerk responde `signed-out` nesses casos.
- `authenticateRequest` recebe o método real da request (um POST tratado como GET vira
  handshake 307 de POST).
- O `<SignIn/>` do Clerk não usa Shadow DOM: as regras globais de elemento do Kutt
  (`input[type=email]` 0,1,1 > classe do Clerk 0,1,0) deformavam o componente. Elas
  excluem `[data-rumbee-sign-in]` via `:not(:where(...))` — regra nova de elemento
  global precisa da mesma exclusão.
- `POST /api/v1/users` do `id.` só aceita `role` minúsculo (`"admin"`; `"Admin"` → 422).
- A instância Clerk é só de produção: o FAPI recusa `localhost` (400). Login real só dá
  pra testar em `url.rumbee.ai`; estados de sessão dá pra simular com curl
  (`Cookie: __client_uat=0` → deslogado; `__client_uat=<ts>` sem `__session` → handshake).
- `npm run verify:rumbee` (API key, JWKS, callback) passa com o SSO quebrado. Mudou
  qualquer coisa de auth → checklist de aceite em produção:
  1. logado no `id.`, abrir `url.` → entra logado sem clicar;
  2. logout no `id.` → `url.` desloga (≤1 min ou ao focar a aba);
  3. logout no `url.` → desloga `id.` e os outros apps;
  4. usuário sem acesso → tela "sem acesso", sem loop;
  5. `/login` = `<SignIn/>` com o tema do `id.`, dark e light.

## Design system

Este app está migrando pro RumBee Brand Book como design system único — cor, tipografia,
espaçamento e componentes visuais. Material vendorizado em
`docs/design-system/rumbee-brand/` (referência, cópia de `docsales/rumbee-design-system` —
não editar à mão):

- `AI-AGENT.md` — **leia primeiro**, sempre, antes de tocar em qualquer HTML/CSS de
  interface. Regras compactas.
- `DESIGN.md` — como uma coisa é: token, anatomia, medida, contraste.
- `INTERACTIONS.md` — como uma coisa se comporta: onde fica o CTA, o que a confirmação
  pergunta, onde vive o excluir.
- `BRAND.md` — marca: conceito, símbolo, cor, voz.
- `META.md` — `<head>`, títulos, favicons, manifest.
- `tokens.css` — fonte de verdade dos valores. A cópia servida ao navegador vive em
  `static/css/rumbee-tokens.css` — mantenha as duas em sincronia se `tokens.css` for
  atualizado a montante.

Nenhum valor de cor, tipografia, espaçamento ou raio é hardcoded — sempre via `var(--*)` de
`tokens.css`. Toda tela ou componente novo consulta o Brand Book antes de inventar um
padrão. `DESIGN.md`/`PRODUCT.md` na raiz são os artefatos do Impeccable (derivados do que
está implementado).

**Aprendizados (não repita):**

- O tema funciona por uma **ponte de variáveis**: as ~35 custom properties antigas do
  Kutt continuam existindo em `styles.css`, mas resolvem pra tokens semânticos RumBee.
  Valor literal (hex, `white`, `hsl()`) em qualquer lugar escapa da ponte — foi assim que
  4 fundos brancos e os badges do admin ficaram ilegíveis no dark.
- Texto sobre âmbar é `--accent-on`, nunca branco (2,1:1). Texto/link âmbar é
  `--accent-ink`.
- Conferência visual real no browser, dark **e** light (e mobile), antes de fechar
  qualquer mudança de UI — build/teste passando não pega contraste nem vazamento de CSS.
- Tela de login segue o padrão do `id.`/`fin.` (painel de marca grafite + `<SignIn/>` +
  rodapé legal): referência em `rumbee-id/app/[[...rest]]/page.tsx` e
  `rumbee-id/lib/clerk/appearance.ts`.

## Migração em andamento

A migração deste app pro Brand Book está sendo feita em fases (nunca um PR gigante único,
cada fase com conferência visual dark+light antes de fechar). Spec completa:
`docs/superpowers/specs/2026-09-25-rumbee-design-system-migration-design.md`. O que já foi
feito e o que falta: [`BACKLOG.md`](./BACKLOG.md).
