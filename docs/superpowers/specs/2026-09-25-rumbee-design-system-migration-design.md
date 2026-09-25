# Migração do RumBee Brand Book para o app URL (Kutt)

Versão 1.0 · 2026-09-25 · Aprovado em chat pelo usuário em 2026-09-25.

## Objetivo

Adotar 100% o RumBee Brand Book (`docsales/rumbee-design-system`) como design system
deste app, substituindo cor, tipografia, espaçamento e componentes visuais atuais —
mantendo apenas o que é específico do domínio (fluxos de encurtamento de URL, não
estilo). Segue o "Prompt A" do próprio `migration-playbook.html` do repo de design
system (retrofit de app existente).

## Baseline — o que existe hoje

- **Stack:** Node/Express + `hbs` (Handlebars) com layout único (`server/views/layout.hbs`,
  wrap default do módulo `hbs`), sem framework de front-end — interatividade via HTMX
  (`static/libs/htmx.min.js`) trocando partials do servidor. Sem Tailwind, sem build step
  de CSS: um único `static/css/styles.css` (2322 linhas) linkado direto.
- **Tema:** nenhum. `:root` tem um conjunto de custom properties ad-hoc (`--bg-color`,
  `--color-primary` azul, botões em `linear-gradient`), sem `data-theme`, sem
  `prefers-color-scheme`, sem toggle.
- **Navegação:** só topbar (`server/views/partials/header.hbs`) — logo + links (GitHub,
  Report) + ações (Settings/Admin/Logout condicionais a `user`/`isAdmin`). Sem sidebar.
- **`homepage.hbs`** mistura estado público e autenticado **no mesmo template**:
  `{{> shortener}}` sempre, `{{#if user}}{{> links/table}}{{/if}}` condicional. Isso é o
  dado mais importante pra decisão de shell abaixo.
- **Diálogos:** já são partials próprios (`partials/*/dialog/*.hbs`), **sem**
  `alert()`/`confirm()`/`prompt()` nativo — já compatível com a regra do Brand Book, não
  precisa reescrever a mecânica, só o visual/anatomia.
- **Assets de marca:** `static/images/` contém só favicons + `logo.png` + `card.png`
  (nenhuma ilustração de conteúdo a preservar) — pode ser substituído por inteiro.
- **Sem** `CLAUDE.md`/`AGENTS.md`, sem `docs/design-system/` nesta branch ainda.

## Não-objetivos (assumidos, corrigir se errado)

1. **Sem tradução de copy.** Mantém o texto em inglês existente verbatim. Esta passada é
   visual/estrutural.
2. **Sem renomear o produto no env.** `{{site_name}}` continua dinâmico
   (`SITE_NAME` em `.env`); só o **default** em `.example.env` muda de `Kutt` para
   `RumBee URL` (nome de trabalho — ver assunção de nomenclatura abaixo).
3. **Sem mexer em lógica de negócio** (rotas, handlers, migrations, queries) — só
   `server/views/**`, `static/css/**`, `static/scripts/**`, `static/images/**`,
   `.example.env` (uma linha) e os arquivos de doc novos.

### Assunção de nomenclatura

Não há nome de produto RumBee estabelecido pra este app no repo. Uso **"RumBee URL"**
(consistente com o nome da branch/worktree `rumbee-design-system-url-app` e o padrão de
domínio `{produto}.rumbee.ai` de `META.md`) para o overline `RUMBEE URL`, `<title>` e
`SITE_NAME` default. Fácil trocar num grep-replace se o nome certo for outro.

## Vendorização

Copiar (sem editar à mão — material de referência) de `rumbee-design-system` pra
`docs/design-system/rumbee-brand/`:

```
docs/design-system/rumbee-brand/
├── README.md
├── BRAND.md
├── DESIGN.md
├── INTERACTIONS.md
├── META.md
├── AI-AGENT.md
├── tokens.css
└── assets/  (11 arquivos: logos, favicons, beeline, og-image)
```

Criar `CLAUDE.md` na raiz do repo apontando pra `AI-AGENT.md` como entrada (regras
compactas) e `DESIGN.md`/`INTERACTIONS.md` pro detalhe — carregado sob demanda, não
auto-incluído em todo prompt.

## Tokens — estratégia de substituição

- Vendorizar `tokens.css` como `static/css/rumbee-tokens.css`, linkado em
  `layout.hbs` **antes** de `styles.css`.
- Reescrever o bloco `:root` de `styles.css` (linhas 8–44 hoje): remover as ~35
  custom properties ad-hoc do Kutt e trocar todo consumo por `var(--bg)`,
  `var(--surface)`, `var(--text)`, `var(--accent)`, `var(--accent-on)`,
  `var(--accent-ink)`, `var(--err-fill)`, `var(--err-on-fill)`, `var(--border)`, etc. —
  os aliases semânticos de `tokens.css`, nunca a escala crua (`--rb-amber-500` direto).
- Varrer as 2322 linhas por hex/hsl literal fora do `:root` antigo (botões em gradiente,
  sombras, etc.) e trocar por token ou remover (gradiente decorativo é proibido pelo
  Brand Book — botão primário vira fill sólido `--accent`).
- Fonte: importar Archivo via o próprio `@import` de `tokens.css` (já incluso) — remover
  qualquer `font-family` diferente que `styles.css` declare hoje.

## Tema dark/light

Não existe hoje — feature nova:

- `data-theme="dark"` (ou `"light"`) no `<html>` de `layout.hbs`.
- Script inline **síncrono** no `<head>`, antes do `<link>` do CSS, lendo
  `localStorage.getItem('rb-theme')` e aplicando `data-theme` antes da primeira pintura
  (evita flash — mandato explícito de `META.md`). Sem valor salvo, não seta o atributo e
  deixa `tokens.css` seguir `prefers-color-scheme` (comportamento nativo do arquivo).
- Toggle circular 40px na topbar nova (ver shell) e no menu do rodapé da sidebar — grava
  em `localStorage` e troca `data-theme` no cliente. Como o HTMX troca só partials do
  `<body>`, nunca o `<html>`, o atributo sobrevive a qualquer swap sem lógica extra.

## Shell — restruturação de navegação

**Decisão:** manter `layout.hbs` único (dividir em dois layouts brigaria com o
`{{#if user}}` que já mistura público/logado dentro de `homepage.hbs`). Shell é
condicional dentro do layout/partials, não por arquivo de layout separado.

**Classificação de tela:**

| Shell | Telas |
|---|---|
| **Bare** (header público atual, simplificado) | `login.hbs`, `create_admin.hbs`, `terms.hbs`, `error.hbs`, `404.hbs`, `banned.hbs`, `reset_password.hbs`, `reset_password_set_new_password.hbs`, `verify.hbs`, `verify_change_email.hbs`, `report.hbs`, `protected.hbs`, `url_info.hbs`, `homepage.hbs` **quando `{{#unless user}}`** |
| **App** (sidebar + topbar) | `homepage.hbs` **quando `{{#if user}}`**, `settings.hbs`, `admin.hbs`, `stats.hbs` |

Novos partials: `partials/shell/sidebar.hbs`, `partials/shell/topbar.hbs`,
`partials/shell/app_header.hbs` (wrapper que inclui os dois e é chamado no lugar de
`{{> header}}` nas telas App). `header.hbs` atual vira o shell **Bare**, simplificado
(logo + GitHub + Report + CTA de login, sem os itens que migram pra sidebar).

**Sidebar** (`--chrome` `#0B0D10`, 216px/68px, `localStorage` para estado
expandido/recolhido): nav = **Links** (home logada) → **Settings** → **Admin** (só se
`isAdmin`). Rodapé: avatar 28px + nome do usuário + e-mail, menu pra cima com toggle de
tema, link de settings, separador, **Log out** (vermelho). Isso tira Settings/Admin/Logout
da topbar atual — hoje eles vivem em `header.hbs`; migram pro rodapé/nav da sidebar.

**Topbar** (80px): busca global (ainda não existe no Kutt — ver nota) + toggle de tema. Se
não houver busca funcional pra implementar nesta passada (é sobre domínio de dados, fora
do escopo visual), a topbar fica só com o toggle de tema por ora; **não** inventar campo
de busca sem back-end — declarar isso como TBD explícito na proveniência da tela (regra 3
de `AI-AGENT.md`), não fingir que existe.

**Overline:** `RUMBEE URL` (11px/600/uppercase/0.05em) acima do `<h1>` de cada tela App.

## Componentes — mapeamento

| Componente Kutt hoje | Alvo RumBee |
|---|---|
| `.button.primary` (gradiente azul) | fill `--accent` + texto `--accent-on`, 38px toolbar / 44px form, peso 700, `nowrap` |
| `.button.secondary`/`.button.danger` | secundário (`--surface`+borda) / destrutivo (`--err-fill`+`--err-on-fill`) — nunca `--err-text` como fundo |
| Tabela de links (`partials/links/table.hbs` + `thead`/`tbody`/`tr`/`tfoot`) | `table-layout:fixed` + `<colgroup>`, ellipsis, header `--surface-raised`, sem zebra, hover `--row-hover`, paginação no `tfoot` (já existe — só reskin) |
| Dialogs de confirmação (delete/ban) | anatomia §4.2 de `INTERACTIONS.md`: título `<Verbo> <objeto>?`, objeto nomeado, destrutiva à esquerda fill vermelho, `Cancelar` à direita, foco inicial no Cancelar |
| Badges de status (link ativo/banido/expirado) | par bg/texto semântico de `DESIGN.md` §2.3, nunca enum cru |
| Formulários (settings, criar link) | rótulo acima do campo 13px/600, validação no blur, `--rb-control-lg` 44px |
| Estados da tabela de links | os quatro obrigatórios: vazio (com "Criar link" ou dizer como), carregando (skeleton, já é HTMX — trocar spinner atual por skeleton), erro, sem permissão (admin) |

`sistema.dc.html`/`marca.dc.html` (vendorizados) servem de referência viva de markup pra
cada componente durante a implementação.

## Meta / head

Reescrever `<head>` de `layout.hbs` no padrão `META.md` §1: título
`{{title}} · {{site_name}}` (hoje é `{{site_name}} | {{title}}` — trocar separador e
ordem), `theme-color` dark/light, favicons trocados pros vendorizados
(`favicon-32/48/192/512.png`, `apple-touch-icon.png`) copiados pra
`static/images/rumbee/`, OG image = `og-image.png` vendorizado, `robots: noindex,nofollow`
nas páginas autenticadas. `logo.png` do header vira
`rumbee-logo-horizontal-light-text.png` (fundo escuro do header/sidebar).

## Execução — lotes (commits nesta branch, cada um com PR próprio se o usuário preferir
separar; por padrão, commits sequenciais nesta branch já isolada)

1. **Vendorização** — `docs/design-system/rumbee-brand/`, `CLAUDE.md`. Zero mudança visual.
2. **Tokens + tipografia + botões base + infra de tema** — `rumbee-tokens.css`, reescrita
   do `:root` de `styles.css`, script de tema em `layout.hbs`, botões globais.
3. **Shell** — `partials/shell/*`, classificação Bare vs App, sidebar + topbar,
   reorganização de Settings/Admin/Logout.
4. **Tabelas + badges + estados** — `partials/links/*`, `partials/admin/*` (domains/users
   tables), badges de status.
5. **Formulários + modais/dialogs** — `partials/*/dialog/*`, `partials/settings/*`,
   `partials/auth/*`.
6. **Telas restantes + meta/head** — `stats.hbs`, `url_info.hbs`, `report.hbs`,
   `terms.hbs`, `error.hbs`/`404.hbs`/`banned.hbs`, favicons/OG/`.example.env`.
7. **Auditoria full-repo** — achados P0–P3 com arquivo:linha contra o checklist de
   `DESIGN.md` §9 e `AI-AGENT.md` "Autoverificação"; corrigir sobras; `CLAUDE.md` declara
   o Brand Book fonte de verdade pra UI nova.

Cada lote fecha só depois de conferência visual real no browser embutido (dark **e**
light), não só build passando.

## Riscos / pontos de atenção pro plano de implementação

- **Não implementar busca global fake** no topbar — Kutt não tem endpoint de busca hoje;
  ou implementa de verdade (fora de escopo de design) ou deixa a topbar só com o toggle e
  documenta a lacuna.
- **HTMX + tema — já verificado nesta spec:** `verify.hbs`, `verify_change_email.hbs`,
  `logout.hbs` e `partials/auth/welcome.hbs` usam `hx-get="/" hx-target="body"` sem
  `hx-select`, então a resposta completa (com `<html>`/`<head>` embutidos) é parseada
  como fragmento e só o conteúdo de `<body>` é inserido — `<head>` e o atributo
  `data-theme` do `<html>` real nunca são tocados por esse swap. Não achei nenhum
  `hx-target="html"`/`"head"` nem manipulação de `document.documentElement` em
  `main.js`/`stats.js`. Sem risco pro tema; não precisa reverificar no lote 2.
- **Admin tables** (`partials/admin/domains|links|users`) repetem a mesma estrutura de
  tabela 3x — oportunidade de consolidar markup ao reskinar (não é escopo obrigatório,
  mas serve ao lote 4 se o tempo permitir).
