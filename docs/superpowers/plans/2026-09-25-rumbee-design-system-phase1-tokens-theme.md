# RumBee Design System — Fase 1: Vendorização + Tokens + Tema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendorizar o RumBee Brand Book neste repo e trocar o sistema de cor/tipografia/tema
do app (hoje ad-hoc, sem dark/light) pelos tokens RumBee, sem quebrar nenhuma tela existente —
via uma camada de alias no `:root` que redireciona os nomes de variável que o Kutt já usa em
2322 linhas de CSS pros novos tokens, em vez de reescrever cada seletor agora.

**Architecture:** `static/css/rumbee-tokens.css` (cópia de `tokens.css`) é linkado antes de
`static/css/styles.css`. O `:root` atual de `styles.css` — hoje ~35 custom properties com
valores literais (hsl/gradiente) — é reescrito pra apontar pros aliases semânticos do RumBee
(`var(--bg)`, `var(--accent)`, etc.), preservando os NOMES que o resto do arquivo consome. Isso
retema o app inteiro (cor + tipografia + dark/light) num único lote seguro, sem tocar forma de
botão/tabela/modal ainda — isso é Fase 2+. Tema é ativado por `data-theme` no `<html>`, setado
por script inline síncrono no `<head>` (lê `localStorage`), antes de qualquer paint.

**Tech Stack:** Node/Express, `hbs` (Handlebars), CSS puro (sem build step, sem Tailwind), HTMX
pra interatividade. Sem framework de teste no repo — verificação é conferência visual ao vivo no
browser (dark e light), conforme o próprio processo do RumBee (`migration-playbook.html`).

**Spec:** [docs/superpowers/specs/2026-09-25-rumbee-design-system-migration-design.md](../specs/2026-09-25-rumbee-design-system-migration-design.md)

## Global Constraints

Regras do Brand Book que valem pra QUALQUER tarefa de UI neste repo daqui pra frente, não só
esta fase (copiadas verbatim de `AI-AGENT.md`/`DESIGN.md`/`BRAND.md`):

- Uma família tipográfica: **Archivo**. Zero mono — nem em valor monetário, nem em ID.
- Âmbar (`--accent` `#E8A020`) ≤ 8% da área da tela; **um único botão primário âmbar por
  viewport**.
- Fill âmbar é `#E8A020` com texto `--accent-on` (`#17130A`) nos **dois** temas — nunca texto
  branco sobre âmbar (2.1:1, reprova).
- Texto/link âmbar usa `--accent-ink` (varia por tema: `#E8A020` dark · `#8A5A05` light) —
  nunca o fill cru (`--accent`) como cor de texto sobre paper.
- Destrutivo é `--err-fill` (`#B3261E`) + `--err-on-fill` (branco) — nunca `--err-text` como
  fundo de botão (2.77:1, reprova). Cor de texto não vira cor de fundo.
- Sidebar / `--chrome` (`#0B0D10`) **nunca clareia** no tema claro.
- Nenhum hex/hsl fora de `tokens.css` — tudo consumido via `var(--*)`.
- `white-space: nowrap` em todo rótulo de botão, badge e cabeçalho de coluna.
- `table-layout: fixed` + `<colgroup>` + ellipsis em tabela — sem rolagem lateral em tabela
  que caberia.
- Nunca `alert()`/`confirm()`/`prompt()` nativo.
- Sem zebra em tabela, sem sombra em card (tabela tem borda, não sombra), sem gradiente
  decorativo, sem glassmorphism, sem bounce/elástico em animação.
- `data-theme` no `<html>` é setado por script inline no `<head>`, **antes** de qualquer CSS
  pintar — nunca depois (causa flash).

---

## Contexto que os próximos tasks assumem (já verificado, não reverificar)

- `express.static("static")` serve tudo em `static/` na raiz (`/css/styles.css`,
  `/images/logo.png` etc.) como fallback; `/css` e `/images` são checados primeiro em
  `custom/css`/`custom/images` (mecanismo de override do operador, vazio hoje, fora de escopo).
- `hbs` (o motor de view) não usa cache de view fora de `NODE_ENV=production`, e `npm run dev`
  roda com `node --watch-path=./server --watch-path=./custom` — **não** observa `static/`, mas
  isso não importa: assets estáticos são lidos do disco a cada request de qualquer forma, e
  templates `.hbs` recompilam por request em dev. Editar `static/css/*.css` ou `server/views/*.hbs`
  não exige restart do processo, só reload da página no browser.
- Nenhum outro `font-family`/`font:` shorthand existe em `styles.css` além do único
  `body { font: 16px/1.45 'Nunito', sans-serif; }` — removê-lo é suficiente pra Archivo (herdado
  do `body` de `tokens.css`) se aplicar em toda a árvore.
- Nenhum seletor define `font-size` em `<html>` fora do media query `max-width:768px` — todo
  `rem` no arquivo é relativo à raiz (16px), não ao `body`; mudar o `font-size` do `body` não
  afeta nenhuma medida `rem` existente.
- `a.button.success` / `button.success` / `button.table.success` são **CSS morto**: grep
  confirmado, nenhum `.hbs` usa a variante `success` em botão (só em `p.success` e
  `.icon.success`, que são seletores diferentes e não são tocados nesta fase).
- Repo não tem `.env` nem `node_modules` ainda — Task 3 inclui o bootstrap mínimo pra rodar
  `npm run dev` localmente.

---

### Task 1: Vendorizar o Brand Book em `docs/design-system/rumbee-brand/`

**Files:**
- Create: `docs/design-system/rumbee-brand/README.md`
- Create: `docs/design-system/rumbee-brand/BRAND.md`
- Create: `docs/design-system/rumbee-brand/DESIGN.md`
- Create: `docs/design-system/rumbee-brand/INTERACTIONS.md`
- Create: `docs/design-system/rumbee-brand/META.md`
- Create: `docs/design-system/rumbee-brand/AI-AGENT.md`
- Create: `docs/design-system/rumbee-brand/tokens.css`
- Create: `docs/design-system/rumbee-brand/assets/*` (11 arquivos)

**Interfaces:**
- Produces: o diretório `docs/design-system/rumbee-brand/` que o Task 2 (`CLAUDE.md`) referencia
  por caminho relativo.

- [ ] **Step 1: Copiar os arquivos de doc e os assets**

```bash
mkdir -p docs/design-system/rumbee-brand/assets
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/README.md docs/design-system/rumbee-brand/
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/BRAND.md docs/design-system/rumbee-brand/
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/DESIGN.md docs/design-system/rumbee-brand/
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/INTERACTIONS.md docs/design-system/rumbee-brand/
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/META.md docs/design-system/rumbee-brand/
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/AI-AGENT.md docs/design-system/rumbee-brand/
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/tokens.css docs/design-system/rumbee-brand/
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/assets/*.png docs/design-system/rumbee-brand/assets/
```

- [ ] **Step 2: Verificar que os 11 assets e os 7 arquivos de doc chegaram, e que são
  byte-idênticos à fonte**

```bash
diff -rq /Users/mauriciokigiela/Documents/git/rumbee-design-system/assets docs/design-system/rumbee-brand/assets
ls docs/design-system/rumbee-brand/ | wc -l   # espera 8 (7 arquivos + assets/)
ls docs/design-system/rumbee-brand/assets | wc -l   # espera 11
```

Expected: `diff -rq` não imprime nada (sem diferenças); as duas contagens batem.

- [ ] **Step 3: Commit**

```bash
git add docs/design-system/rumbee-brand
git commit -m "$(cat <<'EOF'
docs: vendor the RumBee Brand Book design system

Reference copy from docsales/rumbee-design-system — not hand-edited.
Entry point is AI-AGENT.md; DESIGN.md/INTERACTIONS.md for detail.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Criar `CLAUDE.md` na raiz apontando pro Brand Book

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: `docs/design-system/rumbee-brand/` (Task 1).
- Produces: nada que outro task consome — é documentação terminal.

- [ ] **Step 1: Escrever `CLAUDE.md`**

```markdown
# CLAUDE.md

Instruções pra qualquer agente de IA trabalhando neste repo (Kutt / RumBee URL).

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
padrão.

## Migração em andamento

A migração deste app pro Brand Book está sendo feita em fases (nunca um PR gigante único,
cada fase com conferência visual dark+light antes de fechar). Spec completa:
`docs/superpowers/specs/2026-09-25-rumbee-design-system-migration-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: add CLAUDE.md pointing agents to the vendored Brand Book

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Bootstrap do dev local + servir `rumbee-tokens.css` + infraestrutura de tema

**Files:**
- Create: `static/css/rumbee-tokens.css`
- Create: `.env` (não versionado — local only, a partir de `.example.env`)
- Modify: `server/views/layout.hbs`

**Interfaces:**
- Consumes: nenhum output de Task 1/2.
- Produces: `<html data-theme="...">` funcional lido de `localStorage['rb-theme']`; rota
  `/css/rumbee-tokens.css` servindo os tokens no navegador. Task 4 depende de
  `rumbee-tokens.css` já estar linkado.

- [ ] **Step 1: Bootstrap do ambiente local (uma vez só, não versiona `.env`/`node_modules`)**

```bash
npm install
cp .example.env .env
npm run migrate
```

Expected: `npm install` termina sem erro; `npm run migrate` roda as migrations do
`better-sqlite3` (client default do `.example.env`) e cria o arquivo de banco local.

- [ ] **Step 2: Subir o servidor dev e confirmar que responde**

```bash
npm run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: imprime `200`. Deixe o processo rodando pro resto da fase (não precisa
reiniciar entre edições de `.hbs`/CSS — só recarregar a página no browser).

- [ ] **Step 3: Copiar `tokens.css` pra `static/css/` (é a cópia que o navegador de fato
  carrega — a de `docs/design-system/` é só referência)**

```bash
cp /Users/mauriciokigiela/Documents/git/rumbee-design-system/tokens.css static/css/rumbee-tokens.css
```

- [ ] **Step 4: Adicionar o script de tema e o link do `rumbee-tokens.css` em
  `server/views/layout.hbs`**

Estado atual do arquivo (41 linhas, será lido antes de editar):

```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ...
  <link rel="stylesheet" href="/css/styles.css">
  {{#each custom_styles}}
    <link rel="stylesheet" href="/css/{{this}}">
  {{/each}}
  {{{block "stylesheets"}}}
</head>
```

Novo `<head>` (só duas mudanças: o `<script>` inline como primeiro filho de `<head>`, e o
`<link>` do `rumbee-tokens.css` antes do `styles.css`; nada de favicon/OG/título muda nesta
fase — isso é META.md, fase 6):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <script>
    (function () {
      var stored = localStorage.getItem('rb-theme');
      if (stored === 'dark' || stored === 'light') {
        document.documentElement.setAttribute('data-theme', stored);
      }
    })();
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="icon" sizes="196x196" href="/images/favicon-196x196.png" />
  <link rel="icon" sizes="32x32" href="/images/favicon-32x32.png" />
  <link rel="icon" sizes="16x16" href="/images/favicon-16x16.png" />
  <link rel="apple-touch-icon" href="/images/favicon-196x196.png" />
  <link rel="mask-icon" href="/images/icon.svg" color="blue" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#f3f3f3" />
  <meta property="fb:app_id" content="123456789" />
  <meta name="htmx-config" content='{"withCredentials":true}'>
  <meta property="og:url" content="https://{{default_domain}}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="{{site_name}}" />
  <meta property="og:image" content="https://{{default_domain}}/images/card.png" />
  <meta property="og:description" content="Free & Open Source Modern URL Shortener" />
  <meta name="twitter:url" content="https://{{default_domain}}" />
  <meta name="twitter:title" content="{{site_name}}" />
  <meta name="twitter:description" content="Free & Open Source Modern URL Shortener" />
  <meta name="twitter:image" content="https://{{default_domain}}/images/card.png" />
  <meta name="description" content="{{site_name}} is a free and open source URL shortener with custom domains and stats." />
  <title>{{site_name}} | {{title}}</title>
  <link rel="stylesheet" href="/css/rumbee-tokens.css">
  <link rel="stylesheet" href="/css/styles.css">
  {{#each custom_styles}}
    <link rel="stylesheet" href="/css/{{this}}">
  {{/each}}
  {{{block "stylesheets"}}}
</head>
<body>
  <div class="main-wrapper">
    {{{body}}}
  </div>

  {{{block "scripts"}}}
  <script src="/libs/htmx.min.js"></script>
  <script src="/libs/qrcode.min.js"></script>
  <script src="/scripts/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Verificar ao vivo no browser — tokens carregam e tema alterna sem flash**

Usando o browser embutido (`mcp__Claude_Browser__*`):

1. `preview_start` com `url: "http://localhost:3000/"`.
2. `javascript_tool` (`javascript_exec`), rodar:
   `getComputedStyle(document.body).backgroundColor` — Expected: retorna o rgb de
   `#0E1013` (RumBee `--bg` dark), não mais o azul-acinzentado antigo.
3. `javascript_tool`, rodar:
   `localStorage.setItem('rb-theme','light'); location.reload()`.
4. Depois do reload, `javascript_tool`: `document.documentElement.getAttribute('data-theme')`
   — Expected: `"light"`. E `getComputedStyle(document.body).backgroundColor` — Expected:
   rgb de `#F7F6F2` (RumBee `--bg` light).
5. `computer` `screenshot` da página em light, depois repetir com
   `localStorage.setItem('rb-theme','dark'); location.reload()` e screenshot em dark.
   Confirme visualmente: sem flash de fundo errado ao carregar, `<link>` do
   `rumbee-tokens.css` aparece em `read_network_requests` com status 200.

Expected: os dois passos de computed style batem exatamente com os valores acima; nenhum
erro no console (`read_console_messages`).

- [ ] **Step 6: Commit**

```bash
git add static/css/rumbee-tokens.css server/views/layout.hbs
git commit -m "$(cat <<'EOF'
feat: serve RumBee tokens.css and wire dark/light theme infra

Inline pre-paint script reads localStorage['rb-theme'] and sets
data-theme on <html> before first paint, per META.md's flash warning.
No visible UI toggle yet — that lands with the sidebar/topbar shell.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Bridge de tokens em `styles.css` — recolorir o app inteiro sem quebrar nada

**Files:**
- Modify: `static/css/styles.css:1-45` (remove `@font-face` Nunito, reescreve `:root`)
- Modify: `static/css/styles.css` (seletores globais: `body`, `*`, `hr`; remove CSS morto
  `.success` de botão)
- Delete: `static/fonts/nunito-variable.woff2`

**Interfaces:**
- Consumes: `static/css/rumbee-tokens.css` já linkado (Task 3) — os aliases abaixo resolvem
  `var(--bg)`, `var(--accent)` etc. que `rumbee-tokens.css` define em `:root`/`[data-theme]`.
- Produces: todos os ~35 nomes de variável antigos (`--bg-color`, `--color-primary`,
  `--button-bg-primary`, ...) continuam existindo e são consumidos sem mudança em todo o
  resto do arquivo (linhas 46-2322) e em todo `.hbs` — só o VALOR muda. Fases seguintes
  (botões, tabelas, modais) vão aposentar esses nomes um a um trocando os seletores que os
  consomem pelos aliases RumBee diretamente; até lá, o app já roda 100% recolorido e com
  tema.

- [ ] **Step 1: Remover o `@font-face` do Nunito e o arquivo da fonte**

Em `static/css/styles.css`, deletar as linhas 1-7 (bloco `@font-face { font-family: 'Nunito'; ... }` e a linha em branco seguinte):

```css
@font-face {
  font-family: 'Nunito';
  font-style: normal;
  font-weight: 200 1000;
  src: url(/fonts/nunito-variable.woff2) format('woff2');
}

```

```bash
rm static/fonts/nunito-variable.woff2
```

- [ ] **Step 2: Substituir o `:root` (linhas 8-45 originais, agora 1-38 após o Step 1) pelo
  bridge de aliases**

Conteúdo antigo a remover:

```css
:root {
  --bg-color: hsl(206, 12%, 95%);
  --text-color: hsl(200, 35%, 25%);
  --color-primary: hsl(207, 90%, 54%);
  --outline-color: hsl(188, 100%, 54%);
  --button-bg: linear-gradient(to right, #e0e0e0, #bdbdbd);
  --button-bg-box-shadow-color: rgba(160, 160, 160, 0.5);
  --button-bg-primary: linear-gradient(to right, hsl(207, 90%, 61%), hsl(218, 100%, 58%));
  --button-bg-primary-box-shadow-color: hsla(207, 90%, 61%, 0.5);
  --button-bg-secondary: linear-gradient(to right, hsl(262, 47%, 55%), hsl(265, 100%, 46%));
  --button-bg-secondary-box-shadow-color: hsla(258, 58%, 42%, 0.5);
  --button-bg-danger: linear-gradient(to right, hsl(0, 84%, 58%), hsl(0, 78%, 50%));
  --button-bg-danger-box-shadow-color: hsla(0, 58%, 42%, 0.5);
  --button-bg-success: linear-gradient(to right, hsl(130, 58%, 45%), hsl(130, 67%, 45%));
  --button-bg-success-box-shadow-color: hsla(128, 80%, 48%, 0.5);
  --button-action-shadow-color: hsla(200, 15%, 60%, 0.12);
  --underline-color: hsl(200, 35%, 65%);
  --secondary-text-color: hsl(200, 14%, 60%);
  --send-icon-hover-color: hsl(262, 52%, 47%);
  --send-spinner-icon-color: hsl(200, 15%, 70%);
  --success-icon-color: hsl(144, 40%, 57%);
  --error-icon-color: hsl(0, 86%, 63%);
  --copy-icon-color: hsl(144, 40%, 57%);
  --copy-icon-bg-color: hsl(144, 100%, 96%);
  --copy-icon-shadow-color: hsla(200, 15%, 60%, 0.12);
  --focus-outline-color: hsla(207, 90%, 61%, 0.5);
  --checkbox-bg-color: hsl(262, 47%, 63%);
  --input-shadow-color: hsla(200, 15%, 70%, 0.2);
  --input-hover-shadow-color: hsla(200, 15%, 70%, 0.4);
  --input-label-color: hsl(200, 35%, 25%);
  --table-bg-color: hsl(200, 12%, 95%);
  --table-shadow-color: hsla(200, 20%, 70%, 0.3);
  --table-tr-border-color: hsl(200, 14%, 94%);
  --table-tr-hover-bg-color: hsl(200, 14%, 98%);
  --table-head-tr-border-color: hsl(200, 14%, 90%);
  --table-status-gray-bg-color: hsl(200, 12%, 95%);
  --keyframe-slidey-offset: 0;
}
```

Conteúdo novo (mesmos 35 nomes — nenhum consumidor no resto do arquivo muda — mais um
comentário explicando o porquê pra quem ler depois):

```css
/*
 * Bridge pro RumBee Brand Book: os nomes abaixo são os que o Kutt sempre usou
 * (consumidos em todo o resto deste arquivo e em server/views/**). Os VALORES agora
 * apontam pros tokens RumBee (static/css/rumbee-tokens.css, linkado antes deste arquivo)
 * em vez de cor literal. Isso recolore o app inteiro, com dark/light, sem tocar forma de
 * botão/tabela/modal ainda — essa aposentadoria seletor-a-seletor é trabalho das
 * próximas fases da migração (ver docs/superpowers/specs/2026-09-25-*).
 * Nenhuma cor nova aqui: tudo referencia var(--*) de tokens.css.
 */
:root {
  --bg-color: var(--bg);
  --text-color: var(--text);
  --color-primary: var(--accent-ink);
  --outline-color: var(--accent);
  --button-bg: var(--surface);
  --button-bg-box-shadow-color: rgba(11, 13, 16, 0.25);
  --button-bg-primary: var(--accent);
  --button-bg-primary-box-shadow-color: rgba(232, 160, 32, 0.35);
  --button-bg-secondary: var(--surface);
  --button-bg-secondary-box-shadow-color: rgba(11, 13, 16, 0.25);
  --button-bg-danger: var(--err-fill);
  --button-bg-danger-box-shadow-color: rgba(179, 38, 30, 0.35);
  --button-action-shadow-color: rgba(11, 13, 16, 0.2);
  --underline-color: var(--border);
  --secondary-text-color: var(--text-muted);
  --send-icon-hover-color: var(--accent);
  --send-spinner-icon-color: var(--text-faint);
  --success-icon-color: var(--ok-text);
  --error-icon-color: var(--err-text);
  --copy-icon-color: var(--accent-ink);
  --copy-icon-bg-color: var(--accent-tint);
  --copy-icon-shadow-color: rgba(11, 13, 16, 0.15);
  --focus-outline-color: var(--accent);
  --checkbox-bg-color: var(--accent);
  --input-shadow-color: rgba(11, 13, 16, 0.15);
  --input-hover-shadow-color: rgba(232, 160, 32, 0.18);
  --input-label-color: var(--text);
  --table-bg-color: var(--surface-raised);
  --table-shadow-color: transparent;
  --table-tr-border-color: var(--border);
  --table-tr-hover-bg-color: var(--row-hover);
  --table-head-tr-border-color: var(--border);
  --table-status-gray-bg-color: var(--neutral-bg);
  --keyframe-slidey-offset: 0;
}
```

Note: `--button-bg-success` e `--button-bg-success-box-shadow-color` **não** entram no
bridge — são removidos (ver Step 4, CSS morto).

- [ ] **Step 3: Ajustar os primitivos globais (`body`, `*`, `hr`) que agora têm equivalente
  melhor direto em `tokens.css`**

`body` (linhas originais 68-75) — troca de:

```css
body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-color);
  font: 16px/1.45 'Nunito', sans-serif;
  overflow-x: hidden;
  color: var(--text-color);
}
```

para (o resto — margin, font-family, font-size, background, color — já vem do `body {}` de
`rumbee-tokens.css`, linkado antes):

```css
body {
  overflow-x: hidden;
}
```

`*` (linha original 77-81) — troca de:

```css
* {
  box-sizing: border-box;
  outline-color: var(--outline-color);

}
```

para (o anel de foco correto agora vem do `:focus-visible { outline: 2px solid var(--accent); ... }` global de `tokens.css`):

```css
* {
  box-sizing: border-box;
}
```

`hr` (linha original 91-97) — troca `background-color: hsl(200, 20%, 92%);` por
`background-color: var(--border);` (mantém `width`/`height`/`outline`/`border` como estão).

- [ ] **Step 4: Remover o CSS morto da variante `success` de botão**

Deletar de `static/css/styles.css` as 5 regras (confirmado sem uso em nenhum `.hbs` via
`grep -rn "button.success\|button\.success" server/views` antes de deletar, pra não remover
algo que passou a ser usado entre a exploração e agora):

```css
a.button.success,
button.success {
  color: white;
  background: var(--button-bg-success);
  box-shadow: 0 5px 6px var(--button-bg-success-box-shadow-color);
}
```

```css
a.button.success:focus,
a.button.success:hover,
button.success:focus,
button.success:hover {
  box-shadow: 0 6px 15px var(--button-bg-success-box-shadow-color);
}
```

```css
button.table.success,
button.success:focus,
button.success:hover {
  box-shadow: 0 1px 2px var(--button-bg-success-box-shadow-color);
}
```

- [ ] **Step 5: Rodar o grep de confirmação de novo (paranoia — Step 4 depende disto dar
  vazio) e então validar que o CSS não tem mais nenhum literal de cor no que foi tocado**

```bash
grep -rn "button.success\|button\.success" server/views
grep -n "Nunito\|hsl(\|hsla(\|linear-gradient" static/css/styles.css | head -5
```

Expected: primeiro grep vazio (nenhuma saída). Segundo grep também vazio no trecho tocado
por este task — linhas 1-100 aproximadamente; se aparecer algo abaixo de `/* DISTINCT */`
(linha ~980 antes das edições), **não é bug deste task**, é o restante do arquivo que as
próximas fases ainda vão recolorir através do bridge do Step 2 — só confira que nenhuma
ocorrência aparece nas linhas que Steps 2-4 mexeram.

- [ ] **Step 6: Verificação visual completa do lote — checklist AI-AGENT.md, dark e light,
  em várias rotas**

Com o dev server já rodando (Task 3), usando o browser embutido:

1. `navigate` pra `http://localhost:3000/` — `computer` `screenshot`, dark (padrão sem
   `data-theme` salvo, mas force com `javascript_tool`:
   `localStorage.setItem('rb-theme','dark'); location.reload()` antes do screenshot pra
   garantir determinismo).
2. Repetir em `http://localhost:3000/login`.
3. Repetir em `http://localhost:3000/404-nao-existe` (dispara a página 404).
4. Pra cada rota acima, trocar pra light
   (`localStorage.setItem('rb-theme','light'); location.reload()`) e screenshot de novo.
5. `read_console_messages` em cada rota — Expected: zero erro novo relacionado a CSS
   (variável não definida não gera erro de console em CSS, mas confira que não há 404 de
   asset via `read_network_requests`, especialmente `/css/rumbee-tokens.css` e
   `/css/styles.css`).

Checklist manual sobre os screenshots (`AI-AGENT.md` "Autoverificação", os itens que já se
aplicam nesta fase — os de sidebar/tabela ainda não, isso é fase 3/4):

- [ ] Fundo geral é grafite `#0E1013` no dark / `#F7F6F2` (paper) no light — não o
      azul-acinzentado antigo.
- [ ] Texto principal legível nos dois temas (não preto-sobre-preto nem cinza-claro-sobre-branco).
- [ ] Botões primary/secondary/danger continuam existindo, com fill sólido (sem gradiente
      visível) — forma ainda é a antiga (pill, sombra), só a cor mudou; isso é esperado
      nesta fase.
- [ ] Nenhum hex/gradiente óbvio "estranho" saltando aos olhos fora da paleta grafite/âmbar.
- [ ] Alternar `rb-theme` entre dark/light e recarregar não mostra flash do tema errado.

Expected: todos os itens acima passam nas 3 rotas × 2 temas.

- [ ] **Step 7: Commit**

```bash
git add static/css/styles.css
git rm static/fonts/nunito-variable.woff2
git commit -m "$(cat <<'EOF'
feat: retheme the app on RumBee tokens via a CSS variable bridge

Kutt's ~35 ad-hoc custom properties keep their names (every existing
selector keeps working unmodified) but now resolve through RumBee's
semantic tokens instead of literal hsl()/gradients, so the whole app
picks up brand color + dark/light theming in one safe pass. Shape
(button radius, shadows, table layout) is untouched — that's the next
phases. Drops the dead `.success` button variant (unused in any view)
and the Nunito font in favor of Archivo (inherited from
rumbee-tokens.css's own body rule).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Depois desta fase

Fase 1 entrega: Brand Book vendorizado, `CLAUDE.md` apontando pra ele, tema dark/light
funcional (sem toggle visível ainda — chega com a sidebar), e o app inteiro recolorido nos
tokens RumBee através do bridge. Nenhuma forma (botão pill, tabela flex-fake, modal) mudou
ainda — isso é decisão deliberada pra manter o lote pequeno e 100% verificável ao vivo.

Próxima fase (plano novo, escrito quando esta for concluída e aprovada): botões base
(`a.button`/`button`, variantes primary/secondary/ghost/destrutivo, tamanhos
`--rb-control-*`, remover pill+gradiente+scale-bounce) + campos de formulário base
(`input`/`select`/checkbox) — ainda dentro do que a spec chamou de "Lote 2", mais o shell
(sidebar+topbar) do "Lote 3". Cada uma vira sua própria chamada a `writing-plans` depois que
o lote anterior estiver mesclado e conferido.
