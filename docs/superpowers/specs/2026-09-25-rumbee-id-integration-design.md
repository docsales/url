# Integração do app URL (Kutt) com id.rumbee.ai (RumBee ID)

Versão 1.0 · 2026-09-25 · Design aprovado em chat pelo usuário em 2026-09-25 (decisão
de login local vs SSO). Falta revisão deste arquivo escrito antes de virar plano.

## Objetivo

Fazer deste app ("Rumbee URL", deploy em `url.rumbee.ai`) um satélite de
`id.rumbee.ai`: login exclusivamente via RumBee ID (SSO compartilhado via Clerk),
registro da conta pra obter um `rumbeeId`, checagem de acesso por requisição, e
recebimento em tempo real de suspensão/revogação/bloqueio via webhook.

Fonte de verdade técnica: `AI-AGENT.md` vendorizado de `docsales/rumbee-app-sdk`
(clonado localmente pra leitura — **ainda não vendorizado no repo**, ver seção
Vendorização abaixo). O prompt colado pelo usuário no início desta tarefa era a saída
gerada por `id.rumbee.ai/activate` (mesmo texto descrito em `AI-AGENT.md` como
"ready-to-paste prompt" pro agente) — as 4 credenciais nele já foram cadastradas pelo
usuário direto no Railway, não passam por este repo nem por mim.

## Baseline — o que existe hoje

- **Stack:** Express + Passport (`server/passport.js`), sessão própria em JWT
  guardado em cookie (`utils.signToken`/`utils.setToken`), tabela `users` única — sem
  conceito de "conta"/organização separado do usuário.
- **Já existe um login OIDC genérico**, gated por `OIDC_ENABLED`
  (`server/passport.js:77-140`): na primeira autenticação com sucesso, se não existir
  usuário local com aquele e-mail, cria um (senha aleatória, `verified: true`) e segue
  emitindo o JWT normal do Kutt. **Esse é o padrão que a integração RumBee vai
  espelhar**, como uma segunda estratégia Passport (`"rumbee"`) paralela à `"oidc"`,
  não uma reescrita do sistema de sessão.
- **Domínio confirmado via Railway MCP:** `url.rumbee.ai` (custom domain do serviço
  "Rumbee URL", projeto `url` no workspace Docsales) — está sob `*.rumbee.ai`, então o
  cookie de sessão do Clerk compartilhado com `id.` chega nativamente nas requests
  desse app. **Não precisamos de widget React/`@clerk/clerk-react` nem de token
  Bearer manual** — isso só seria necessário se o domínio fosse outro (caso Workers
  descrito no AI-AGENT.md). Resolve server-side com `@clerk/backend`.
- Env vars já cadastradas pelo usuário no Railway (serviço "Rumbee URL", produção):
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `RUMBEE_API_KEY`,
  `RUMBEE_CALLBACK_SECRET`. Nomes são fixos (lidos assim pelo SDK vendorizado, o
  prefixo `NEXT_PUBLIC_` não tem efeito aqui — é só o nome que o código lê).

## Decisão de escopo (aprovada em chat)

**SSO substitui totalmente o login local:** `DISALLOW_LOGIN_FORM=true` e
`DISALLOW_REGISTRATION=true` no ambiente de produção. Único caminho de entrada passa
a ser RumBee ID. Contas locais existentes (senha), se houver, ficam sem caminho de
login até serem linkadas por e-mail via primeiro acesso SSO — **checar antes do
deploy se existem usuários locais em produção hoje** (fora do escopo desta spec
verificar isso; é um passo do plano/deploy, não de design).

## O que NÃO construir (do próprio AI-AGENT.md)

- Tela de signup própria chamando API do `id.` — usuários novos entram via sessão
  Clerk compartilhada (auto-provisionados no primeiro request autenticado, igual ao
  OIDC hoje).
- Cliente de entitlements customizado (`lib/entitlements-client.ts` do SDK) — o
  widget pronto (`<script src="https://id.rumbee.ai/launcher.js">`) já cobre o
  app-launcher sem nenhum código de backend; não há necessidade de montar UI própria
  de "apps que tenho acesso".
- "Deletar usuário" — não se aplica aqui (não estamos chamando
  `access-revocations` a partir deste app; é o `id.` que revoga e nos avisa).

## Arquitetura

### 1. Mapeamento conta ↔ usuário

1 linha em `users` = 1 "conta" RumBee. Migration nova: `rumbee_id` (string,
nullable, sem índice único forçado — pode ficar `null` até o primeiro
login SSO daquele usuário).

### 2. Entrada (nova estratégia Passport `"rumbee"`)

Paralelo ao bloco `if (env.OIDC_ENABLED)` existente:

1. Verifica a sessão Clerk da request (`@clerk/backend`, lendo o cookie
   compartilhado de `*.rumbee.ai`) → obtém `clerkUserId` + e-mail.
2. `query.user.find({ email })`. Se não existir, cria (mesmo padrão do OIDC:
   senha aleatória nunca usada, `verified: true`).
3. Se o usuário (novo ou existente) ainda não tem `rumbee_id`: `POST
   /api/v1/accounts` (`Authorization: Bearer RUMBEE_API_KEY`) → salva
   `rumbeeId` retornado em `users.rumbee_id`. Só acontece uma vez por
   usuário, nunca mais.
4. Emite o JWT do próprio Kutt normalmente (`utils.signToken` + `utils.setToken`) —
   a partir daqui a sessão é 100% Kutt como já é hoje; RumBee ID só governa a porta
   de entrada.

### 3. Checagem de acesso por requisição

Middleware novo, roda depois da autenticação JWT do Kutt nas rotas autenticadas:

- Cache em memória (Redis se `REDIS_ENABLED`, senão `Map` local — mesmo padrão já
  usado pra outros caches deste app) chaveado por `clerkUserId`, guardando `{token,
  claims}`.
- Se não tem entrada em cache **ou** `verifyAccessToken(token, loginBaseUrl)`
  (`jose`/JWKS local, sem rede) rejeita por expiração: chama `POST
  /api/v1/access-checks` de novo pra pegar token fresco.
- Se `allowed: false` (ou marcado suspenso/bloqueado pelo webhook, seção 4): mostra
  estado explícito "você não tem acesso a este app" — **nunca redireciona pro
  próprio login**, porque login local está desligado e isso criaria loop (aviso
  explícito do AI-AGENT.md: usuário pode estar autenticado no `*.rumbee.ai` e mesmo
  assim sem acesso a este produto específico).

### 4. Webhook (`POST /api/webhooks/rumbee-login`)

Rota nova, sem autenticação de sessão (é o `id.` chamando o satélite), validada pelo
header `X-Rumbee-Callback-Secret` dentro do próprio `handleCallback` do SDK
vendorizado. Como o SDK usa `Request`/`Response` padrão Fetch e este app é Express
puro, a rota é um adapter fino: monta um `Request` a partir de `req`
(headers + body bruto) e traduz o `Response` de volta pra `res`.

- `onAccountSuspended` / `onAccessRevoked` / `onUserBlocked`: derruba a entrada do
  cache de acesso (seção 3) na hora — é o motivo do webhook existir, não esperar até
  8h de expiração do token.
- `onAccessGranted` / `onAccountReactivated` / `onRoleChanged`: mesma coisa (derrubar
  cache), pra próxima request já pegar o access-check atualizado. Opcionais pelo
  próprio SDK — implementar os 7, já que o esforço extra é baixo (mesma função).
- `onUserUnblocked`: idem.

### 5. App launcher

`<script src="https://id.rumbee.ai/launcher.js" data-lang="pt"
data-theme="dark">` no `layout.hbs` (tema fixo em dark hoje — ver Baseline do outro
spec de migração de design system; ajustar se/quando esse app ganhar toggle
claro/escuro). Zero código de backend.

## Vendorização do SDK

Mesmo padrão já usado pro Brand Book (`docs/design-system/rumbee-brand/`): copiar
`docsales/rumbee-app-sdk` (só os 3 arquivos de `lib/`, sem editar à mão) pra dentro
deste repo — proposta: `server/vendor/rumbee-sdk/` (é código server-side consumido
por `server/passport.js` e pela rota de webhook, não documentação). `verify.ts` fica
junto, não é rodado em produção — só localmente/CI depois de mudanças na integração,
como script `npm run verify:rumbee`.

## Testes

- **`verify.ts` do SDK** — 3 checagens (API key, JWKS, callback ping). O check de
  callback só passa contra o deploy real (`id.` precisa alcançar
  `url.rumbee.ai/api/webhooks/rumbee-login` publicamente) — não roda contra
  localhost. Precisa de `RUMBEE_VERIFY_TEST_RUMBEE_ID` e
  `RUMBEE_VERIFY_TEST_CLERK_USER_ID` (conta de teste) que o usuário ainda vai
  fornecer.
- **TDD nas duas peças novas de lógica não-triviais** (segue
  `superpowers:test-driven-development` no plano de implementação):
  1. Adapter Express↔Fetch do webhook + roteamento pros 7 handlers.
  2. Cache de access-token (hit/miss/expirado/eviction pelos handlers do webhook).
- Estratégia `"rumbee"` do Passport em si segue o padrão de teste (se houver) já
  usado pra `"oidc"` no repo — a verificar no plano.

## Não-objetivos

- Migração de usuários locais existentes pra RumBee ID (fora do escopo — só
  verificar se existem antes do deploy, ver Decisão de escopo acima).
- Suporte a login local coexistindo com SSO (decisão explícita: substituição total).
- UI de app-launcher customizada (o script pronto resolve).
- Mudar tema claro/escuro do launcher dinamicamente.

## Revisão 2026-09-26 — sessão do RumBee ID como fonte de verdade

Problemas encontrados em produção com o desenho acima (seção 2): o JWT do Kutt
virava uma sessão independente depois do `/login/rumbee`, então (1) quem já estava
logado no `id.` (ou em outro satélite) caía na tela de login do `url.` até clicar no
botão, (2) logout no `id.` não derrubava o `url.` (o cookie do Kutt vivia 7 dias sem
consultar o Clerk de novo) e (3) a tela de login era o formulário do Kutt com um
botão, fora do padrão do `id.`/`fin.`.

Modelo atual:

- **Servidor** (`server/rumbee/session.js`, chamado dentro de `authenticate()` para
  toda rota autenticada por `jwt`): a cada request consulta o Clerk
  (`authenticateRequest`, verificação local do `__session`).
  - Logado no Clerk → garante que o cookie do Kutt é do mesmo usuário (provisiona/
    vincula por `clerk_user_id` → e-mail via `server/rumbee/provision.js`). É o
    login automático.
  - Deslogado (`__client_uat` ausente ou zerado por um logout em qualquer app
    RumBee) → apaga o cookie do Kutt.
  - Handshake (GET de página sem `__session` ainda) → repassa o redirect do Clerk.
  - Indeterminado (XHR do htmx com `__session` vencido — o Clerk só faz handshake em
    navegação de página) → mantém o cookie do Kutt.
  - Tokens emitidos pelo SSO levam `via: "rumbee"`; com `DISALLOW_LOGIN_FORM=false`
    só eles são derrubados no logout do RumBee (sessão de senha local não é nossa).
- **Browser** (`static/scripts/rumbee-session.js`, clerk-js v6 + `@clerk/ui` v1 do
  Frontend API `clerk.rumbee.ai`): mantém o `__session` renovado, recarrega a página
  quando o usuário sai (ou troca de conta) em outro app RumBee, renderiza o
  `<SignIn/>` no `/login` com o mesmo `appearance` do `id.` e faz `signOut()` global
  no `/logout`.
- `/login/rumbee` virou redirect pra `/login`. A home e a criação de link passaram a
  passar pelo `rumbeeAccessGate`. Usuário banido com sessão RumBee vê "sem acesso"
  em vez de ir pro `/logout` (que o relogaria na hora — loop).
