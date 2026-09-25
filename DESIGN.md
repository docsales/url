---
name: RumBee URL
description: Encurtador de URLs interno RumBee — grafite e âmbar sobre Archivo, dark e light
colors:
  grafite: "#0E1013"
  chrome: "#0B0D10"
  superficie: "#1B2028"
  borda: "#262B33"
  osso: "#ECE9E2"
  nevoa: "#8A9099"
  ambar: "#E8A020"
  ambar-ink: "#8A5A05"
  paper: "#F7F6F2"
  tinta: "#17181B"
typography:
  h1:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  h3:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ambar}"
    textColor: "#17130A"
    rounded: "{rounded.md}"
    height: "38px"
    padding: "0 18px"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.osso}"
    rounded: "{rounded.md}"
    height: "38px"
    padding: "0 16px"
  input-default:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.osso}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 14px"
  card-default:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: RumBee URL

## Overview

**Creative North Star: "A beeline até o destino."**

RumBee vem de rumo + bee: a abelha não vagueia, ela volta em linha reta pra colmeia. Um
link curto é, literalmente, isso — a menor distância entre um clique e o destino real.
Essa é a leitura própria deste produto do conceito da marca (herdado de `BRAND.md`), sem
tomar emprestado o vocabulário de "fechamento" de venda de outros produtos RumBee.

RumBee URL é ferramenta interna, de uso diário: densidade confortável, nada decorativo,
neutro carrega a informação e âmbar carrega a única decisão na tela. É um app mais simples
que o shell de dashboard RumBee (sem sidebar, sem seletor de entidade, sem período) —
cabeçalho fixo, formulários, uma tabela de links e um shell de autenticação próprio para
quem ainda não entrou.

**Key Characteristics:**
- Grafite como base em 90%+ da tela; âmbar só no ponto de decisão.
- Superfícies planas com borda, não sombra — a profundidade vem do contraste, não do
  `box-shadow`.
- Uma família tipográfica (Archivo), hierarquia só por tamanho e peso.
- Dark é a âncora da marca; light é o mesmo sistema, nunca "invertido".

## Colors

Duas cores de marca e uma escala neutra de trabalho — nada além disso.

### Primary
- **Âmbar** (`#E8A020`): o alvo, a ação. Botão primário, item de navegação ativo, anel de
  foco, barra "previsto" em gráfico. Fill constante nos dois temas; texto sobre o fill é
  sempre `#17130A` (12.6:1). Como texto/link sobre superfície, a tinta muda —
  `ambar-ink` `#8A5A05` no claro, `#E8A020` no escuro.

### Neutral
- **Grafite** (`#0E1013`): fundo da área de trabalho no tema escuro.
- **Chrome** (`#0B0D10`): cabeçalho/chrome de marca — não clareia no tema claro.
- **Superfície** (`#1B2028` escuro / `#FFFFFF` claro): card, tabela, campo de formulário.
- **Borda** (`#262B33` escuro / `#E4E1D8` claro): toda borda e divisor.
- **Osso** (`#ECE9E2`): texto principal sobre grafite.
- **Névoa** (`#8A9099` escuro / `#5F6266` claro): texto secundário.
- **Paper** (`#F7F6F2`): fundo da área de trabalho no tema claro.
- **Tinta** (`#17181B`): texto principal sobre paper.

### Named Rules
**A Regra do Alvo.** Âmbar nunca é fundo de página, card grande ou área de chrome —
aparece só no ponto de decisão, e não passa de ~8% de qualquer tela.

**A Regra da Cor de Texto.** Uma cor de texto (`--err-text`, `--accent-ink`) não vira cor
de fundo de botão/badge. Quem precisa de fill tem seu próprio token `-fill`, constante nos
dois temas.

## Typography

**Display/Body Font:** Archivo (com fallback `system-ui, -apple-system, 'Helvetica Neue',
sans-serif`) — a única família em uso, herdada de `rumbee-tokens.css`.

**Character:** Grotesca de proporções levemente condensadas; a hierarquia acontece por
tamanho e peso, nunca por troca de família.

### Hierarchy
- **H1** (700, 26px, 1.2): título de página/seção.
- **H2** (700, 20px, 1.3): subtítulo de seção.
- **H3** (600, 16px, 1.4): título de card/modal.
- **Body** (400, 13.5px, 1.55): texto corrido, formulário, célula de tabela.
- **Label** (600, 11px, uppercase, tracking 0.05em): rótulo, overline, cabeçalho de coluna.

### Named Rules
**A Regra da Família Única.** Zero mono, inclusive em valores e IDs — números em Archivo
500/600 alinhados à direita já tabulam bem.

## Layout

Sem shell de dashboard: cabeçalho fixo (logo + navegação) no topo, conteúdo em coluna
única abaixo. O shell de autenticação (`.auth-shell`) é uma página inteira à parte —
centralizada, com o card de login no meio e o alternador de tema no canto superior
direito, para quem ainda não está autenticado.

Ritmo de espaçamento pela escala `rb-space` (4/8/12/16/20/24/32px). Nenhum breakpoint de
media query é definido explicitamente hoje — o layout depende de flex-wrap e larguras
fluidas em vez de pontos de quebra documentados; tratar como lacuna a fechar, não como
comportamento mobile intencional.

## Elevation & Depth

Sistema plano por padrão. Sombra só existe em algo que realmente flutua sobre o
conteúdo (menu, diálogo) — card e superfície de formulário não têm `box-shadow`,
têm borda. É o card da tela de login (`.auth-shell-card`) e a tabela de links
(`--table-shadow-color` neutralizado) que fixam esse padrão.

### Named Rules
**A Regra da Borda, não da Sombra.** Se uma superfície precisa se separar do fundo, a
resposta é `border: 1px solid var(--border)`, não `box-shadow`.

## Shapes

- **`sm` (6px):** badge pequeno.
- **`md` (8px):** input, botão, select.
- **`lg` (12px):** card, tabela.
- **`xl` (16px):** modal/diálogo.
- **`pill` (9999px):** alternador de tema (botão circular 36px).

## Components

### Buttons
- **Shape:** raio `md` (8px), altura 38px em toolbar / 44px em formulário.
- **Primary:** fundo âmbar, texto `#17130A`, peso 700 — uma ação por tela.
- **Secondary:** fundo `superficie`/`chrome`, texto `osso`/`text`, borda — ação paralela.
- **Danger:** fundo `err-fill` (`#B3261E`, constante nos dois temas), texto branco.
- Foco: anel âmbar de 2px, nunca o anel azul do navegador.

### Inputs / Fields
- **Style:** fundo `superficie`, raio `md` (8px), borda `border`.
- **Focus:** borda âmbar.
- Checkbox: raio 4px, marca âmbar.

### Table (lista de links)
- **Corner Style:** raio `lg` (12px), `overflow:hidden`.
- **Background:** `superficie` (linhas), `table-bg-color` (cabeçalho).
- **Shadow Strategy:** nenhuma — ver Elevation & Depth.
- **Border:** divisor de 1px entre linhas (`--table-tr-border-color`); hover em
  `--row-hover`.

### Dialog (confirmação/detalhe)
- Overlay + painel `.box`, ícone de estado (sucesso/erro), corpo com formulário quando
  aplicável, rodapé com botões.
- Spinner substitui o conteúdo durante requisição (`htmx-request`).

### Auth Shell (login)
- Página inteira centralizada: ícone RumBee (40px), título, subtítulo, card contendo o
  formulário existente sem alteração de campos.
- **Corner Style:** raio `lg` (12px). **Background:** `superficie`. **Border:** `border`,
  sem sombra. **Internal Padding:** 32px 24px.
- Alternador de tema circular (`pill`, 36px) fixo no canto superior direito da página.

### Theme Toggle
- Botão circular 36px, ícone 16px (lua no claro, sol no escuro) em `text-muted`,
  `text` no hover/foco. Ícone via `stroke: currentColor` declarado como propriedade CSS
  (não só o atributo SVG) — evita um bug de não-resolução do `currentColor` observado
  neste contexto específico de botão+SVG.

## Do's and Don'ts

### Do:
- **Do** usar Archivo em tudo — títulos, corpo, rótulos, valores.
- **Do** manter âmbar como a única cor de decisão por tela (botão primário, item ativo,
  foco).
- **Do** conferir dark **e** light ao vivo antes de considerar uma tela pronta.
- **Do** usar o fill âmbar constante (`#E8A020` + texto `#17130A`) e deixar só a
  tinta de texto/link mudar entre temas.
- **Do** separar superfícies com borda, não sombra.

### Don't:
- **Don't** usar segunda família tipográfica, nem mono para números/IDs.
- **Don't** usar âmbar como fundo de página, card grande ou cabeçalho inteiro.
- **Don't** usar texto branco sobre fill âmbar (2.1:1 — reprova).
- **Don't** usar uma cor de texto (`--err-text`, `--accent-ink`) como cor de fundo de
  botão/badge — cada papel que precisa de fill tem seu próprio token `-fill`.
- **Don't** usar emoji ou exclamação na interface.
