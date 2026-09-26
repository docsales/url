# Backlog — RumBee URL (`url.rumbee.ai`)

> Pendências por prioridade + histórico resumido das duas frentes de 2026-09: migração pro
> RumBee Brand Book e integração com o RumBee ID. Regras e aprendizados pra agentes vivem
> no [`CLAUDE.md`](./CLAUDE.md); o detalhe de cada frente, nos specs em
> `docs/superpowers/specs/`.

**Convenções:** 🔥 alta · ⏱ média · 🌱 oportuno-quando-houver-tempo · 🚫 decidido NÃO fazer

---

## 🚫 Decisões deliberadas de NÃO fazer

- 🚫 **Login local (e-mail/senha) convivendo com o RumBee ID** — substituição total
  (`DISALLOW_LOGIN_FORM=true`, `DISALLOW_REGISTRATION=true` em produção). O código do
  formulário do Kutt e do OIDC continua lá (upstream), só desligado.
- 🚫 **Um `rumbeeId` por usuário** — o app é single-tenant; todos os usuários compartilham
  uma conta RumBee. Criar conta por usuário travou todo mundo fora (2026-09-26).
- 🚫 **Busca global fake no topbar** — o Kutt não tem endpoint de busca; ou implementa de
  verdade ou o topbar fica só com o toggle de tema (spec do design system).
- 🚫 **Webhook do `id.` pra logout** — não existe e não precisa: logout propaga pelo
  cookie `__client_uat` do Clerk (ver `CLAUDE.md`).

---

## 🔥 Em aberto

- 🔥 **Deploy automático a partir da `main`** — hoje é `railway up` manual, o que já deixou
  a produção 5 commits à frente da `main`. Conectar o serviço ao GitHub (branch `main`)
  ou, no mínimo, sempre deployar do working tree igual à `main`.
- 🔥 **Migrar `railway.json` pra Infrastructure as Code** (`.railway/railway.ts`,
  `railway config migrate`) — Config as Code deixa de funcionar em **2026-12-01**.

## ⏱ Design system — fases restantes

Fases do spec (`docs/superpowers/specs/2026-09-25-rumbee-design-system-migration-design.md`,
"Execução — lotes"). Feito: lotes 1–2 + branding + login no padrão do `id.` (ver Histórico).

- ⏱ **Lote 3 — Shell:** sidebar `--chrome` 216/68px + topbar 80px pras telas logadas
  (home logada, settings, admin, stats); Settings/Admin/Log out migram do header pro
  rodapé da sidebar; overline `RUMBEE URL`.
- ⏱ **Lote 4 — Tabelas, badges e estados:** tabela de links e as 3 tabelas do admin com
  `table-layout:fixed` + `<colgroup>` + ellipsis; os quatro estados (vazio, carregando,
  erro, sem permissão). Badges do admin já migrados (#19).
- ⏱ **Lote 5 — Formulários e diálogos:** inputs ainda são a pílula do Kutt (raio 100px,
  borda inferior de 5px) — trocar pelo campo do Brand Book (`--rb-control-lg`, raio
  `--rb-radius-md`); diálogos na anatomia de `INTERACTIONS.md` §4.2. Ao reescrever as
  regras globais de `input`/`button`/`label`, manter a exclusão de
  `[data-rumbee-sign-in]` (ou remover a necessidade dela).
- ⏱ **Lote 6 — Telas restantes + `<head>`:** stats, url_info, report, terms, error/404,
  banned, no_access; título `{{title}} · {{site_name}}` (hoje `{{site_name}} | {{title}}`),
  `theme-color` por tema, `noindex` nas páginas logadas.
- ⏱ **Lote 7 — Auditoria full-repo** contra `DESIGN.md` §9 e a autoverificação do
  `AI-AGENT.md`.
- ⏱ **Idioma da interface:** login e "sem acesso" em pt-BR no `id.`, mas o resto do app
  (header, settings, admin, `no_access.hbs`) segue em inglês do Kutt. Decidir e traduzir
  numa passada só.

## ⏱ RumBee ID — endurecimento

- ⏱ **`authorizedParties`** no `authenticateRequest` (`server/handlers/auth.handler.js`)
  — restringe o `azp` do token de sessão a `https://url.rumbee.ai`. Testar o handshake em
  produção depois de ligar.
- ⏱ **`rumbeeId` fixo no código** (`server/rumbee/client.js`, `ACCOUNT_ID`) → env var,
  pra não depender de deploy se a conta mudar.
- ⏱ **Instância/chaves Clerk de dev** — pedir ao `id.`; hoje o login só é testável em
  produção (o FAPI recusa `localhost`).
- 🌱 **Launcher do `id.` com tema fixo** (`data-theme="dark"` no `layout.hbs`) — seguir o
  tema da página e remontar no toggle.
- 🌱 **Scripts one-off** `server/rumbee/find-provisioning-candidates.js` e
  `provision-operators.js` — já rodados; apagar quando não forem mais úteis como
  referência.

---

## Histórico

### Design system (2026-09-25)

- **#14** — Brand Book vendorizado em `docs/design-system/rumbee-brand/`, `CLAUDE.md`,
  `rumbee-tokens.css` servido antes do `styles.css`, tema dark/light (`data-theme` +
  `localStorage` `rb-theme`, script síncrono no `<head>`), retema pela ponte de variáveis
  (custom properties antigas do Kutt → tokens semânticos RumBee), Archivo no lugar de
  Nunito, 4 fundos `white` literais corrigidos.
- **#15** — Branding: logo horizontal no header, favicons/OG/manifest RumBee, primeira
  versão do login no padrão `id.`/`fin.`, remoção de referências ao Kutt na UI.
- **#17** — Artefatos do Impeccable (`PRODUCT.md`, `DESIGN.md`, `.impeccable/`) + correções
  de contraste (texto branco sobre âmbar → `--accent-on`, ícones de botão).
- **#19** — Badges de status do admin via pares semânticos (`--ok-*`, `--err-*`,
  `--neutral-*`).

### RumBee ID (2026-09-25 → 2026-09-26)

- **#18** — Primeira integração: SDK vendorizado (`server/vendor/rumbee-sdk/`), colunas
  `rumbee_id`/`clerk_user_id`, cliente da API, cache de access-check com re-verificação
  JWKS local, webhook `/api/webhooks/rumbee-login` (adapter Express↔Fetch), gate de acesso,
  botão "Login with RumBee ID", launcher.
- **Correções feitas direto em produção** (branch `rumbee-id-integration`, deploy por CLI,
  só entraram na `main` em #20): conta RumBee única em vez de uma por usuário; `role`
  minúsculo no pré-provisionamento; repasse do handshake do Clerk; headers do
  `requestState` em todo caminho; login em duas colunas.
- **#20** — Revisão da implementação. Problemas: logado no `id.` → `url.` mostrava a tela
  de login; logout no `id.` não deslogava o `url.`; tela de login fora do padrão. Causa:
  o JWT do Kutt virava uma sessão independente depois do clique (padrão OIDC do Kutt) e
  o Clerk nunca era consultado de novo. Correção: sessão do Clerk como fonte de verdade
  a cada request + clerk-js/`@clerk/ui` no browser + `<SignIn/>` com o tema do `id.` +
  logout global. Home e criação de link passaram pelo gate de acesso.
- **#21** — CSS global de elemento do Kutt vazava pro `<SignIn/>` (campo de e-mail
  estreito, em pílula) → exclusão via `:not(:where([data-rumbee-sign-in] *))`.
- **#22** — Cache-busting dos estáticos por hash de conteúdo (Cloudflare segurava o CSS
  antigo por 4h e o login novo apareceu sem estilo).
- Feedback enviado ao agente do `id.` sobre as lacunas do guia de satélite (SSO "de
  graça" só pra app com Clerk no frontend, ausência de regra sobre sessão/logout e sobre
  a tela de login, prompt de ativação assumindo multi-tenant, `verify.ts` sem checagem
  de SSO).
