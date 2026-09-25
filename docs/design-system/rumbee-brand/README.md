# RumBee Brand Book — pacote de design para desenvolvimento com IA

Versão 1.0 · Setembro 2026

Este pacote é o **ponto de partida de qualquer produto RumBee**. Ele não descreve um
produto específico: descreve a marca, os tokens e os padrões de interface que todo
produto RumBee herda. O primeiro consumidor foi o RumBee Fin; os próximos (5 apps
existentes em migração + 2 apps novos) devem começar daqui, não de uma cópia do Fin.

## O que tem aqui

| Arquivo | Para quê | Quem lê |
|---|---|---|
| `BRAND.md` | Marca: nome, símbolo, logo, voz, uso do âmbar | designer, marketing, IA |
| `DESIGN.md` | Sistema de interface: tokens, shell, componentes, acessibilidade — **como uma coisa é** | designer, dev, IA |
| `INTERACTIONS.md` | Regras de interação: posição de CTA, menu `⋯`, excluir, confirmações, toast, estados — **como uma coisa se comporta** | designer, dev, PM, IA |
| `META.md` | `<head>` canônico, títulos, description, favicons, manifest, domínios | dev, marketing |
| `marca.dc.html` | **Página pública** da marca: logos, cores, tipografia, uso e downloads | qualquer pessoa, imprensa, parceiro |
| `sistema.dc.html` | **Página interna**: os componentes reais, clicáveis, nos dois temas | designer, dev |
| `support.js` | Runtime (React) que roda as páginas `.dc.html` — gerado, não editar à mão | — |
| `AI-AGENT.md` | Instruções operacionais para agentes de IA que geram código | **cole isto no prompt** |
| `tokens.css` | Implementação dos tokens em CSS custom properties, dark + light | dev |
| `assets/` | Logos, ícone, favicons, apple-touch-icon, og-image | todos |
| `migration-playbook.html` | Este README em formato de página, com os dois prompts prontos pra copiar | quem vai rodar a migração |

## As duas páginas e o Artifact

**`marca.dc.html` — pública.** Vai no ar em `rumbee.ai/marca`. Contém só o que qualquer
pessoa de fora precisa: o conceito, os lockups, a paleta, a tipografia, o que pode e o que
não pode, e os downloads. **Não** contém componente de produto, token interno nem regra de
interação — nada que revele como o app é construído.

**`sistema.dc.html` — interna.** Referência viva para o time: cada componente renderizado
de verdade, nos dois temas, com os modais, o toast e os menus funcionando. É onde se
confere um comportamento em dez segundos em vez de reler o `.md`. Mantém `noindex` e não
vai para domínio público.

**[Instruções](https://claude.ai/artifact/V9JcB5zxUVjN6LW3cdNENy?sk=WbKtHXIn6OpoG2G7LT5RGA)**

## Como usar

**Com um agente de IA (Claude, Cursor, Copilot):** cole `AI-AGENT.md` no início da
sessão e mantenha `DESIGN.md` e `INTERACTIONS.md` acessíveis no repositório. O
`AI-AGENT.md` é escrito em forma de regra, não de explicação — é o que evita as dez
quebras mais comuns.

**A divisão entre os dois documentos de sistema importa:** a paleta pode mudar sem que
nenhuma regra de comportamento mude, e a posição do botão de excluir pode mudar sem que
nenhum token mude. Misturar os dois num arquivo só faz com que ninguém releia nenhum.

**Em um produto novo:**

1. Copie `tokens.css` e `assets/` para o projeto.
2. Linke o CSS e defina `data-theme` no `<html>` (`dark` é a âncora da marca).
3. Monte o shell de `DESIGN.md` §3 — sidebar, topbar, conteúdo. Ele é o mesmo em
   todos os produtos: é o que faz dois produtos RumBee parecerem a mesma empresa.
4. Adote `INTERACTIONS.md` **inteiro**, sem adaptação: a matriz de decisão do §12 responde
   as perguntas que costumam ser decididas tela a tela (e por isso saem diferentes em cada
   tela).
5. Escreva `DESIGN-<produto>.md` para o que é só daquele produto (domínio, telas,
   vocabulário). **Não edite este pacote para acomodar um produto.**

**Em um produto existente:** troque a paleta e a tipografia primeiro, o shell depois.
A ordem inversa gera meses de tela híbrida.

## Prompts prontos — migração dos 5 apps existentes + bootstrap dos 2 novos

Cole um dos dois abaixo como primeira mensagem numa sessão nova do Claude Code no
repositório do app-alvo. Versão em página, com botão de copiar: `migration-playbook.html`
(também publicada em https://claude.ai/artifact/V9JcB5zxUVjN6LW3cdNENy?sk=WbKtHXIn6OpoG2G7LT5RGA).

### Prompt A — app existente (retrofit 100%)

```
Este app vai adotar 100% o RumBee Brand Book como design system — trocar tudo que
existe hoje (cores, tipografia, espaçamento, componentes visuais) pelo padrão RumBee,
mantendo só o que for específico do DOMÍNIO deste produto (fluxos de negócio, não
estilo visual).

## Passo 1 — Baseline: o que existe hoje

Antes de mudar qualquer coisa, leia e resuma (não mude nada ainda):
- Documentação de design/UI existente (DESIGN.md, STYLEGUIDE.md ou equivalente — se
  não existir, inventarie direto no código: tema, tokens, tailwind.config, CSS
  variables).
- Stack de frontend real (framework, se usa Tailwind ou CSS puro/outra lib de estilo,
  se já tem um design system de componentes tipo shadcn/MUI).
- Onde vivem os componentes visuais reutilizáveis hoje.

## Passo 2 — Traga o RumBee Brand Book pro repo

Clone/copie o conteúdo de https://github.com/docsales/rumbee-design-system pra `docs/design-system/rumbee-brand/` (ou
o local equivalente de docs deste projeto): README.md, BRAND.md, DESIGN.md,
INTERACTIONS.md, META.md, AI-AGENT.md, tokens.css, assets/*. Trate como material
vendorizado — referência, não editar à mão.

Aponte o arquivo de instruções do agente deste repo (CLAUDE.md/AGENTS.md) pra esse
material, SOB DEMANDA (não auto-carregado) — AI-AGENT.md é o ponto de entrada (regras
compactas), DESIGN.md/INTERACTIONS.md pro detalhe.

`tokens.css` usa CSS custom properties puras — funciona em qualquer stack. Se este
projeto usa Tailwind, mapeie o tailwind.config pra apontar pros var(--...) do
tokens.css (cores, radius, shadow etc.) em vez de duplicar valores. Se não usa
Tailwind, aplique as CSS variables direto no tema/CSS global.

## Passo 3 — Escreva o DESIGN-<produto>.md

Depois de ler o Brand Book, identifique o que é genuinamente específico deste app
(vocabulário de domínio, padrões de tela que a marca genérica não cobre) vs. o que é
só estilo que o Brand Book já resolve. Documente só a parte específica, se sobrar
alguma, em `DESIGN-<produto>.md` (convenção deste pacote — ver "A regra de herança"
no README do Brand Book) — a marca genérica NUNCA é duplicada ali, só referenciada.

## Passo 4 — Auditoria full-repo

Rode uma auditoria completa (não só diff) comparando toda tela/modal do app contra o
Brand Book. Se este ambiente já tem o skill /impeccable instalado, use
`/impeccable audit`; senão, faça você mesmo uma varredura por área/tela, produzindo
uma lista de achados com severidade (P0-P3) e arquivo:linha de cada um.

## Passo 5 — Corrija tudo, em lotes, nesta ordem

Paleta e tipografia PRIMEIRO, shell (sidebar/topbar) DEPOIS, resto por último — a
ordem inversa deixa telas híbridas por meses (lição do próprio time, não teórica).
Agrupe o resto por tema (formulários, tabelas, modais...) — nunca um PR gigante único.
Pra cada lote: um PR próprio, rode a suíte de qualidade que este repo já usa
(testes/lint/typecheck — o que o CLAUDE.md/AGENTS.md daqui já mandar), e qualquer
mudança visualmente observável precisa de conferência ao vivo no browser (screenshot
ou preview rodando) antes de considerar o lote pronto — não basta o build passar.

## Passo 6 — Fechamento

No final, AI-AGENT.md/DESIGN.md/INTERACTIONS.md do Brand Book devem ser a fonte de
verdade pra qualquer UI nova daqui pra frente — deixe isso explícito no
CLAUDE.md/AGENTS.md do repo.
```

### Prompt B — app novo (bootstrap do zero)

```
Este é um app NOVO — desde o primeiro commit de UI, o design system é o RumBee Brand
Book, sem estilo ad hoc.

## Passo 1 — Traga o Brand Book antes de qualquer tela

Clone/copie https://github.com/docsales/rumbee-design-system pra `docs/design-system/rumbee-brand/`. Leia
AI-AGENT.md primeiro (regras compactas) — é referência obrigatória antes de escrever
qualquer componente visual.

## Passo 2 — Wire os tokens

`tokens.css` (CSS custom properties, funciona em qualquer stack) é a fonte de
cor/tipografia/espaçamento/radius/shadow. Se o projeto for Tailwind, configure o
tailwind.config pra apontar pros var(--...) de lá (nunca duplicar valores
hardcoded). Se não for Tailwind, importe as CSS variables direto no CSS global.

## Passo 3 — Monte o shell e adote as interações inteiras

Shell de DESIGN.md §3 (sidebar/topbar/conteúdo) igual a todo produto RumBee.
INTERACTIONS.md inteiro, sem adaptação — a matriz de decisão do §12 já resolve o que
costuma ser decidido tela a tela.

## Passo 4 — Regra permanente

Toda tela/componente novo referencia AI-AGENT.md/DESIGN.md/INTERACTIONS.md antes de
inventar cor, espaçamento ou padrão de interação novo. Nenhum valor de estilo é
hardcoded — sempre via token. O que for genuinamente específico deste produto vai em
`DESIGN-<produto>.md`, nunca duplicando o Brand Book.

## Passo 5 — Higiene contínua

Periodicamente (ex.: a cada N telas novas), rode uma auditoria de conformidade contra
o Brand Book — /impeccable audit se disponível, ou uma varredura manual — pra pegar
drift cedo, antes de virar dívida.
```

## A regra de herança

```
rumbee-brand/          ← marca + sistema. Muda raramente, muda para todos.
└── DESIGN-<produto>.md  ← domínio, telas e vocabulário de um produto.
```

Se um produto precisa de um token que não existe aqui, há duas saídas legítimas:
**resolver com os tokens existentes** (quase sempre é o caso) ou **propor a adição ao
pacote**. Criar o token localmente é a saída ilegítima — é como a identidade se dissolve.

## Estado da marca

O nome **rumbee / RumBee** está em busca formal de registro. Em peças internas e
protótipos, use RumBee normalmente. Em material público antes da conclusão do registro,
confirme com o jurídico.
