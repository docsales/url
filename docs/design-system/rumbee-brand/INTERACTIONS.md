# RumBee — Regras de Interação e Definições

Versão 1.0 · Setembro 2026

`DESIGN.md` responde **como uma coisa é**. Este documento responde **como uma coisa se
comporta**: onde fica o botão, o que o clique faz, o que a confirmação pergunta, onde vive
a ação de excluir. São decisões de produto, não de estética — e é por isso que moram num
arquivo separado: a paleta pode mudar sem que nada aqui mude, e vice-versa.

**A regra-mãe: não me faça pensar.** Toda decisão abaixo escolhe a opção que exige menos
raciocínio do usuário, mesmo quando isso custa mais trabalho para quem constrói.

---

## 1. Botões e ações

### 1.1 Rótulo descreve a ação, nunca a resposta

O rótulo do botão diz **o que vai acontecer quando ele for clicado** — sempre verbo no
infinitivo, sempre o objeto quando há ambiguidade. O usuário que lê só o botão, sem ler o
texto acima, tem que acertar.

| Nunca | Sempre |
|---|---|
| OK · Sim · Confirmar | Excluir lançamento · Pagar lote · Conciliar |
| Não · Cancelar (isolado) | Manter · Voltar sem salvar · Cancelar exclusão |
| Enviar | Enviar ao Chargebee |
| Salvar | Salvar e fechar · Salvar rascunho |

**Sem par Sim/Não em diálogo.** "Deseja excluir este item? [Sim] [Não]" obriga o usuário a
reler a pergunta para saber o que "Sim" faz. `[Excluir item] [Manter]` não obriga.

### 1.2 Posição

**Em diálogo e modal, no rodapé:**

```
[ Excluir ]                       [ Cancelar ] [ Salvar alterações ]
 destrutiva                        recuo        ação primária
 à esquerda, isolada               ────────────────────────────→
                                   a primária é sempre a última, mais à direita
```

- **A primária é a última à direita.** O olho termina a leitura do rodapé nela, e o
  polegar (em mobile) chega nela primeiro.
- **A destrutiva vai para a extremidade esquerda**, em **fill vermelho**, separada por
  espaço livre das demais. Nunca encostada na primária: é assim que se clica em "Excluir"
  querendo "Salvar".
- **Exceção deliberada: no diálogo de confirmação a ordem inverte** — a destrutiva fica à
  esquerda e `Cancelar` à direita (§4.2). O motivo é o mesmo: a posição mais à direita é
  para onde a mão vai no automático, e num diálogo destrutivo é exatamente onde a ação
  destrutiva **não** deve estar.
- **Cancelar fica imediatamente à esquerda da primária**, como variante fantasma/secundária.
- Ordem completa quando há mais de duas: `[destrutiva] ……… [Cancelar] [secundária] [primária]`.

**Em tela (não modal):** ações de tela no cabeçalho, à direita do título, na mesma ordem
relativa. Ação que cria algo é primária âmbar; navegação de volta é secundária.

**Em linha de tabela:** ação de linha **dentro** da linha, à direita.

### 1.3 Um primário por viewport

Se duas ações parecem igualmente importantes, uma delas não é. Escolha, e deixe a outra
secundária. Duas primárias âmbar na mesma tela anulam o significado do âmbar.

### 1.4 Botão desabilitado precisa dizer por quê

Botão desabilitado sem explicação é beco sem saída. Ou você mostra o motivo ao lado
(`"1 documento sem vínculo — vincule ou remova para pagar"`), ou você deixa o botão ativo
e mostra o erro no clique. Nunca um botão cinza e silencioso.

---

## 2. Listas e tabelas

### 2.1 A linha inteira é clicável e abre o detalhe

**Clicar na linha abre o lightbox de detalhe do registro, em modo leitura.** Não navega
para outra tela, não expande a linha, não entra em edição.

Por quê: o usuário de produto de trabalho passa o dia varrendo lista e inspecionando
registro. Navegar tira o contexto da lista (posição de scroll, filtro, seleção) e obriga a
voltar. O modal preserva tudo e sai com `Esc`.

Exceção: quando o registro **é** uma tela (um lote com sub-lista, um projeto com abas), a
linha navega. A regra prática: se o detalhe cabe em ~10 pares rótulo/valor, é modal.

### 2.2 O menu `⋯` é para ações, não para "ver detalhe"

Cada linha termina com um menu `⋯` (três pontos horizontais, 16px, `--text-faint`).
Ele contém **ações que mudam o estado do registro**:

```
⋯  Editar
   Duplicar
   Marcar como transferência
   Criar vínculo
   ─────────────────
   Excluir            ← vermelho, sempre o último, depois de separador
```

Regras do menu de linha:

- **"Ver detalhes" não entra no menu.** Isso é o clique na linha.
- **Excluir é sempre o último item**, em `--err-text`, separado por divisor. Nunca no meio
  da lista, nunca vizinho de "Duplicar".
- **Máximo 6 itens.** Acima disso, o registro precisa de tela própria.
- O menu abre em clique (não hover) e fecha com `Esc`, clique fora ou ação escolhida.
- `⋯` não é a única porta para nenhuma ação crítica: tudo que está no menu também está no
  rodapé do lightbox de detalhe.

### 2.3 Excluir mora nos dois lugares

| Onde | Como |
|---|---|
| Menu `⋯` da linha | último item, vermelho, após divisor |
| Rodapé do lightbox de detalhe | botão destrutivo na extremidade esquerda |

Por quê nos dois: quem já sabe qual registro quer apagar não deve precisar abrir o
detalhe; quem abriu o detalhe para conferir antes de apagar não deve precisar fechar e
achar a linha de novo. O que **não** existe é excluir em terceiro lugar (ícone de lixeira
solto na linha) — um ícone de lixeira à vista é um clique acidental esperando acontecer.

### 2.4 Seleção múltipla

- Checkbox na primeira coluna; checkbox no cabeçalho seleciona a **página visível**
  (nunca o conjunto filtrado inteiro sem avisar).
- Com 1+ selecionado, aparece uma **barra de ação** no rodapé da tabela: contagem
  (`"3 selecionados · total R$ 31.940,00"`) à esquerda, ações à direita.
- Ação em lote destrutiva sempre passa por confirmação com a **contagem** no texto.
- Seleção se perde ao mudar filtro ou página — e avise antes se houver seleção ativa.

### 2.5 Ordenação, paginação, scroll

- **Ordenação:** clique no cabeçalho, seta 12px ao lado do rótulo. Um critério por vez.
  A ordem entra na URL.
- **Paginação, não scroll infinito.** Produto de trabalho precisa de "onde eu estava" e de
  total. Rodapé: `"Mostrando 8 de 1.249"` à esquerda, `[Anterior] [Próxima]` à direita.
- Scroll infinito só em feed cronológico (log, auditoria) onde o total é irrelevante.
- Cabeçalho sticky acima de 20 linhas.

### 2.6 Os quatro estados

Toda lista entrega: **vazio** (com o próximo passo e o botão que o executa), **carregando**
(skeleton com as alturas reais, não spinner), **erro** (o que falhou + "Tentar novamente"),
**sem permissão** (o que falta e quem concede). Ver `DESIGN.md` §4.9.

Distinga **vazio-de-verdade** ("Nenhum lançamento ainda — importe um extrato") de
**vazio-por-filtro** ("Nenhum resultado para estes filtros" + "Limpar filtros"). São
mensagens diferentes e ações diferentes.

---

## 3. Modais

### 3.1 Três tipos, e só três

| Tipo | Para que | Tamanho | Fecha com |
|---|---|---|---|
| **Detalhe** (lightbox) | inspecionar um registro | `lg` 780px | `Esc`, clique no overlay, botão fechar |
| **Formulário** | criar/editar algo curto | `md` 580px | `Esc` e clique no overlay **só se limpo** |
| **Confirmação** | confirmar ação irreversível | `sm` 420px | `Esc` = cancelar; clique no overlay **não** fecha |

Qualquer coisa que não caiba nesses três é tela, não modal.

### 3.2 Anatomia (obrigatória, idêntica em todo produto)

1. **Overlay** com blur; clicar nele fecha — exceto formulário sujo e confirmação.
2. **Header sticky:** ícone do tipo + título + subtítulo de contexto + badge de status;
   botão fechar (X) no canto superior direito. O X existe **sempre**, mesmo com Cancelar
   no rodapé.
3. **Corpo** com scroll próprio, `max-height: 86vh`.
4. **Rodapé sticky** com a ordem de botões de §1.2.
5. **Foco entra no modal** ao abrir (primeiro campo, ou o painel); `Tab` circula dentro
   dele; ao fechar, o foco volta para o elemento que o abriu.
6. **Nunca modal sobre modal.** Editar é in-place, trocando o modo do painel. Se um fluxo
   exige dois níveis, o segundo nível é tela.

### 3.3 Lightbox de detalhe

Abre **em leitura**. Rodapé padrão do lightbox de detalhe, como está em produção:

```
[ 🗑 Excluir ]                    [ Fechar ]  [ ⧉ Clonar ]  [ ✎ Editar ]
 fill vermelho                       fantasma   secundária    primária âmbar
```

"Editar" troca o mesmo painel para modo edição (campos no lugar dos valores, rodapé passa
a `[Cancelar] [Salvar alterações]`). "Clonar" abre o formulário de criação pré-preenchido
com o registro — está no rodapé, e não no menu `⋯`, porque quem clona quase sempre acabou
de conferir o original.

Cabeçalho: `<Tipo do registro> · <nome do objeto>` + o **ID do registro** em
`--text-faint` ao lado do título (`#230554`) — o ID é o que o usuário cola no chat quando
pede ajuda sobre um lançamento.

Corpo: grade de dois pares por linha (rótulo `--text-faint` acima do valor), seções de
vínculo com **contagem no título** (`"Lançamentos conciliados (1)"`) e cada vínculo como
linha clicável com ação de desvincular à direita. Sempre expõe, em `<details>` colapsado,
os **campos técnicos** e o **payload bruto** da origem — é o que torna o dado auditável.

### 3.4 Formulário em modal

- Título diz o que se está fazendo (`"Novo lançamento"`, `"Editar pessoa"`).
- Validação **no blur do campo**, não no submit. Mensagem abaixo do campo, em `--err-text`,
  dizendo como corrigir (`"Informe um CNPJ com 14 dígitos"`).
- No submit com erro, foco vai para o primeiro campo inválido.
- **Fechar com alteração pendente** (`Esc`, X ou overlay) dispara a confirmação de descarte
  de §4.3. Fechar um formulário limpo não pergunta nada.
- Enquanto salva: botão primário vira `"Salvando…"` e desabilita; o resto do modal
  permanece legível.

---

## 4. Confirmações

### 4.1 Quando confirmar

**Confirme** quando a ação é irreversível, afeta terceiros, ou envolve dinheiro:
excluir, pagar, enviar para sistema externo, fechar período, revogar acesso, cancelar
assinatura.

**Não confirme** quando a ação é reversível: arquivar, marcar como lido, alterar filtro,
reordenar. Nesses casos use **toast com desfazer** — é mais rápido e não treina o usuário
a clicar "Confirmar" no automático.

> Confirmação em excesso é pior que nenhuma: o usuário aprende a despachar o diálogo sem
> ler, e aí a confirmação que importava também é despachada.

### 4.2 Anatomia da confirmação

```
┌────────────────────────────────────────────┐
│  Excluir lançamento  #230554              ✕  │  título = verbo + tipo, ID ao lado
├────────────────────────────────────────────┤
│  Excluir "GERAÇÃO SOCIAL (500089)"?       │  pergunta com o objeto NOMEADO em negrito
│                                           │
│  Há 1 lançamento de extrato conciliado    │  consequência colateral, concreta
│  com este AR/AP — ele será desvinculado   │  (e o que NÃO acontece:
│  (o extrato em si não é apagado).         │   "o extrato não é apagado")
│                                           │
│  Faz parte de uma série (Mensal).         │  regra de escopo explicada ANTES
│  "Esta e as futuras" apaga desta data em  │  de o usuário escolher
│  diante; "Toda a série" apaga tudo.       │
├────────────────────────────────────────────┤
│  [ Excluir ▾ ]                [ Cancelar ] │  destrutiva À ESQUERDA, recuo à direita
└────────────────────────────────────────────┘
```

Regras:

1. **Título é a pergunta com o verbo da ação**, não "Tem certeza?" — `"Excluir
   lançamento?"`, `"Pagar 3 documentos?"`, `"Fechar setembro 2026?"`.
2. **O corpo nomeia o objeto.** Não "este item": o nome, o valor, a data. O usuário tem que
   poder verificar que é o registro certo sem fechar o diálogo.
3. **O corpo diz a consequência**, inclusive a colateral (vínculos desfeitos, cobrança
   disparada, período travado).
4. **"Esta ação não pode ser desfeita"** aparece **só** quando é verdade. Se aparece em
   tudo, não significa nada.
5. **Botão afirmativo = o verbo da ação**, em variante destrutiva se destrutiva.
6. **Botão de recuo = `Cancelar`**, como secundária, **na extremidade direita**. Em
   diálogo cujo único ato é destruir, "Cancelar" não é ambíguo — não há outra operação
   em curso para ele cancelar. (Em formulário, o recuo é nomeado: `"Continuar editando"`.)
7. **A destrutiva fica à esquerda**, em fill vermelho — longe da posição onde a mão vai
   no automático procurando a primária.
8. **O foco inicial vai no `Cancelar`.** `Enter` acidental não destrói nada. `Esc` = recuo.
   Clique no overlay **não** fecha.

### 4.3 Ação destrutiva com escopo (série, lote, recorrência)

Quando "excluir" pode significar coisas diferentes, **o botão afirmativo não executa: ele
abre as opções de escopo.** É um split button vermelho cujo rótulo enuncia a escolha:

```
[ Escolha o que excluir ▾ ]
     → Só esta ocorrência
     → Esta e as futuras
     → Toda a série
```

- O corpo do diálogo **explica o que cada escopo faz** antes de o menu abrir.
- O rótulo do botão não é "Excluir" — é "Escolha o que excluir". Assim um clique só nunca
  destrói: o usuário é obrigado a nomear o escopo.
- Cada opção do menu é uma frase completa, na ordem do menos para o mais destrutivo.
- Vale para qualquer ação com escopo, não só excluir: reprogramar, cancelar, reenviar.

### 4.4 Descarte de rascunho

```
Descartar alterações?
As alterações em "Pessoa · Gastrocentro" não foram salvas.
[ Descartar ]                        [ Continuar editando ]
```

Dispara ao fechar formulário sujo ou ao navegar para fora dele. Aqui o recuo **é**
nomeado (`"Continuar editando"`), porque existe uma operação em curso para retomar.

### 4.5 Confirmação com digitação

Só para o topo da escala: excluir organização, apagar em lote acima de 50 registros,
revogar todas as chaves de API. O usuário digita o nome do objeto para liberar o botão.
Use com parcimônia — é atrito de propósito, e atrito demais vira contorno.

### 4.6 Nunca `alert()`, `confirm()` ou `prompt()` nativos

Sem exceção. Não são estilizáveis, não são traduzíveis, travam a aba e quebram a
identidade.

---

## 5. Feedback

### 5.1 Toast — padrão completo

**Onde.** Canto **inferior direito**, `position:fixed`, `right:24px`, `bottom:24px`,
`z-index:80` (acima de tudo, inclusive modal). Empilha **para cima**, o mais novo embaixo,
`gap:10px`. **Máximo 3 visíveis** — o quarto substitui o mais antigo.
Em mobile (<768px): `left:16px; right:16px; bottom:16px`, largura total, empilhando para
cima do mesmo jeito.

Por que inferior direito: é onde a ação acabou de acontecer (botão de rodapé, botão
flutuante) e não cobre o cabeçalho, o menu nem a primeira linha da tabela. Toast no topo
central tapa justamente o título da tela que o usuário está lendo.

**Cor.** O fundo **nunca** é a cor semântica — o toast é sempre um card do sistema, e a
semântica entra pelo ícone:

| Parte | Valor |
|---|---|
| Fundo | `--surface` |
| Borda | `1px solid var(--border)` |
| Raio | `--rb-radius-lg` (12px) |
| Sombra | `--shadow-lg` |
| Chip do ícone | 24px, raio 6px, `background: var(--{ok\|warn\|err\|info}-bg)`, ícone 14px em `var(--{...}-text)` |
| Título | 13px / 600 / `--text` |
| Corpo | 12px / 400 / `--text` (**nunca** `--text-muted`: corpo de toast é conteúdo) |
| Ação ("Desfazer") | 12.5px / 600 / `--accent-ink`, sem fundo |
| Fechar (✕) | 14px / `--text-faint`, canto superior direito |
| Largura | `min-width:300px`, `max-width:420px` |
| Padding | `13px 14px`, `gap:11px` |

**Quanto tempo.**

| Tipo | Duração | ✕ |
|---|---|---|
| sucesso / info | **5s** | opcional |
| aviso | **6s** | sim |
| erro | **8s** | **obrigatório** |
| com "Desfazer" | **8s** (mínimo, nunca menos) | sim |
| ação em andamento ("Importando…") | **persistente** até concluir, e aí se transforma no toast de resultado | não |

- **Hover ou foco no toast pausa o cronómetro**, e ele recomeça do zero ao sair — quem
  está lendo ou indo clicar em "Desfazer" não perde a chance.
- **Entrada:** 8px da direita + fade, 220ms `--rb-ease`. **Saída:** fade + colapso de
  altura, 150ms. Com `prefers-reduced-motion`, só fade.
- **Acessibilidade:** container com `role="status"` e `aria-live="polite"`; erro usa
  `aria-live="assertive"`. O ✕ tem `aria-label="Fechar aviso"`.

**O que entra e o que não entra.**

| Situação | Toast? |
|---|---|
| Salvou, excluiu, conciliou, enviou | **sim** — com o número: `"8 lançamentos conciliados"` |
| Ação reversível (arquivar, marcar, reordenar) | **sim**, com "Desfazer" |
| Erro de validação de campo | não — mensagem abaixo do campo |
| Erro que impede o fluxo / lista não carregou | não — faixa de erro no lugar do conteúdo |
| Confirmação de algo irreversível | não — diálogo (§4) |
| Progresso longo (import, fechamento de mês) | toast persistente, virando resultado no fim |

Silêncio depois de um clique é a forma mais comum de o usuário repetir a ação e duplicar o
registro. **Toda ação que muda dado responde algo.**

### 5.2 Carregamento

| Duração | Tratamento |
|---|---|
| < 300ms | nada (spinner que pisca é pior que espera) |
| 300ms–2s | skeleton no lugar do conteúdo, com as alturas reais |
| > 2s | skeleton + linha de status dizendo o que está acontecendo |
| ação em botão | rótulo troca para gerúndio (`"Salvando…"`) e desabilita |

Nunca bloqueie a tela inteira por carregamento de uma parte.

### 5.3 Otimismo

**Ações locais e reversíveis** (marcar, arquivar, reordenar) atualizam a UI na hora e
reconciliam depois; falha reverte com toast de erro.
**Ações que envolvem dinheiro ou sistema externo** esperam a confirmação do servidor.
Nunca mostre "pago" antes de o servidor confirmar.

---

## 6. Formulários

- **Rótulo acima do campo**, 13px/600. Sem placeholder como rótulo — ele desaparece ao
  digitar e deixa o usuário sem referência.
- **Placeholder é exemplo de formato**: `"voce@rumbee.ai"`, `"XX.XXX.XXX/XXXX-XX"`.
- **Texto de ajuda** abaixo do campo, 11.5px `--text-muted`, quando a regra não é óbvia.
- **Obrigatório vs opcional:** marque o que é **opcional** quando a maioria é obrigatória,
  e o inverso quando a maioria é opcional. Asterisco em tudo não informa nada.
- **Validação no blur**; mensagem abaixo do campo. No submit, foco no primeiro inválido.
- **Máscara ao digitar** para CNPJ, CPF, telefone, CEP, moeda e data.
- **Salvar explícito** em formulário de registro (o usuário decide quando commita).
  **Autosave** só em configuração e preferência, com toast discreto de "Salvo".
- **Campo desabilitado com motivo:** ao lado ou abaixo, diga por que não pode editar.
- **Um formulário longo é etapas**, não uma página infinita: stepper de `DESIGN.md` §4.7,
  com o estado de cada etapa visível e navegação para trás permitida.

---

## 7. Navegação

- **Sidebar é o inventário completo** e é idêntica em toda tela: mesmo conjunto, mesma
  ordem. Nada de item que aparece só em algumas telas.
- **Item ativo reflete a tela atual**, inclusive em sub-rota.
- **Estado navegável vive na URL:** período, filtros, aba, ordenação, página, registro
  aberto. Se o usuário não pode mandar o link para um colega e ver a mesma coisa, o estado
  está no lugar errado.
- **Sair de formulário sujo** dispara §4.3.
- **Abas vs segmented:** abas quando são visões diferentes do mesmo objeto (permanecem
  visíveis); segmented quando é um parâmetro da mesma visão (mês/ano, BRL/USD).
- **Breadcrumb só em hierarquia real** (lote → documento). Não em tela de primeiro nível.
- **Sessão expirada:** modal não-dispensável com relogin, preservando a tela atual — nunca
  jogar o usuário na tela de login perdendo o trabalho.

---

## 8. Busca e filtros

- **Busca global** (topbar) atravessa entidades e mostra resultados agrupados por tipo.
  Debounce 250ms, mínimo 2 caracteres, `/` foca o campo, `Esc` limpa.
- **Busca local da lista** é rotulada como tal (`"Buscar nesta lista"`), para não ser
  confundida com a global.
- **Filtros aplicam na hora** (sem botão "Aplicar"), porque a lista é a resposta imediata.
  Exceção: filtro de consulta caríssima, e aí o botão diz `"Aplicar filtros"`.
- **"Limpar" aparece só quando há filtro ativo**, e diz quantos: `"Limpar 3 filtros"`.
- **Filtro ativo é visível** fora do painel (chip com borda âmbar), para ninguém concluir
  que a base está vazia quando só o filtro está estreito.

---

## 9. Permissões

- **Não mostre o que a pessoa não pode usar sem explicar.** Ação sem permissão: botão
  desabilitado + motivo ("Requer perfil Financeiro"), ou ausência total — nunca botão que
  falha no clique.
- **Tela sem permissão** mostra a faixa `neutral` de §2.6, com quem concede o acesso.
- **Ação de aprovação** distingue "eu solicitei" de "eu aprovo": quem solicitou não pode
  aprovar o próprio pedido, e a UI diz isso antes do clique.

---

## 10. Teclado e acessibilidade operacional

| Tecla | Efeito |
|---|---|
| `Esc` | fecha modal / menu / limpa busca (nessa prioridade) |
| `Enter` | submete o formulário focado; em diálogo de confirmação, aciona o **recuo** |
| `Tab` | circula dentro do modal aberto (focus trap) |
| `/` | foca a busca global |
| `←` `→` | navegador de período, quando nenhum campo tem foco |

- Todo botão só-ícone tem `aria-label`.
- Todo item de menu recolhido tem tooltip no hover **e** nome acessível.
- `:focus-visible` âmbar em tudo que recebe teclado. Nunca `outline: none` sem substituto.

---

## 11. Copy de interface — padrões fixos

| Situação | Padrão |
|---|---|
| Botão | verbo no infinitivo + objeto quando ambíguo |
| Título de confirmação | `<Verbo> <objeto>?` |
| Recuo em confirmação | `Manter <objeto>` · `Continuar editando` · `Voltar sem <verbo>` |
| Toast de sucesso | `<número> <objeto> <particípio>` — "8 lançamentos conciliados" |
| Erro de sistema | `Não foi possível <ação>.` + o que fazer |
| Erro de campo | como corrigir, não o que está errado |
| Vazio | `Nenhum <objeto> <qualificador>.` + próximo passo |
| Vazio por filtro | `Nenhum resultado para estes filtros.` + Limpar filtros |

Sem emoji, sem exclamação, sem "Ops!", sem culpar o usuário, sem pedir desculpa.

---

## 12. Matriz de decisão rápida

| Pergunta | Resposta RumBee |
|---|---|
| Clique na linha faz o quê? | abre lightbox de detalhe em leitura |
| Onde fica "ver detalhes"? | em lugar nenhum — é o clique na linha |
| Onde fica excluir? | último item do menu `⋯` (vermelho, após divisor) **e** destrutiva no rodapé do detalhe |
| Lixeira visível na linha? | não |
| Onde fica a primária no modal de edição/detalhe? | última, à direita |
| Onde fica cancelar? | imediatamente à esquerda da primária |
| Onde fica a destrutiva num modal de edição/detalhe? | extremidade esquerda, fill vermelho |
| E num diálogo de confirmação? | **inverte**: destrutiva à esquerda, `Cancelar` à direita |
| Confirmação usa Sim/Não? | não — verbo da ação à esquerda, `Cancelar` à direita |
| Ação destrutiva com escopo (série)? | split button `"Escolha o que excluir ▾"` — um clique nunca destrói |
| Foco inicial da confirmação? | no `Cancelar` |
| `Esc` na confirmação? | cancela |
| Clique no overlay fecha? | detalhe sim; formulário sujo e confirmação não |
| Modal sobre modal? | nunca |
| Toast ou confirmação? | reversível → toast com desfazer; irreversível → confirmação |
| Toast fica onde, e por quanto tempo? | inferior direito; 5s sucesso, 6s aviso, 8s erro e com "Desfazer"; hover pausa |
| Fundo do toast é colorido? | não — `--surface`; a semântica entra no chip do ícone |
| Paginação ou scroll infinito? | paginação, salvo feed cronológico |
| Filtro tem botão aplicar? | não, salvo consulta caríssima |
| Salvar é automático? | não em registro; sim em configuração |
| Onde vive o estado da tela? | na URL |
| `confirm()` nativo? | nunca |
