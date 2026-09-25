# RumBee — Instruções para agentes de IA

Cole este arquivo no início da sessão ao gerar qualquer interface RumBee.
Referência completa, no mesmo diretório: `DESIGN.md` (como uma coisa é),
`INTERACTIONS.md` (como uma coisa se comporta) e `BRAND.md` (marca).

---

## Contrato

Você está construindo interface para um produto **RumBee**: software de trabalho,
usado o dia inteiro por operadores. **Grafite carrega a informação, âmbar carrega a
decisão.** Densidade confortável, hierarquia clara, zero decoração.

**Antes de escrever qualquer estilo:** linke `tokens.css` e use `var(--*)`.
Não invente cor, tamanho de fonte, raio ou altura de controle. Se você está digitando um
hex, pare — o token já existe.

---

## As regras, em ordem de frequência com que são violadas

1. **Uma família:** Archivo. Hierarquia por tamanho e peso (400/500/600/700).
   **Zero mono** — nem para valor monetário, nem para ID, nem para JSON inline.
2. **Âmbar ≤ 8% da área.** Um único botão primário por viewport. Âmbar nunca é fundo de
   página, card grande ou sidebar.
3. **Fill âmbar `#E8A020` + texto `#17130A` nos dois temas.** Texto branco sobre âmbar
   reprova contraste. O que muda entre temas é **texto/link âmbar**: use `--accent-ink`
   (dark `#E8A020`, light `#8A5A05`). Mesma lógica no vermelho: **fill destrutivo é
   `--err-fill` (`#B3261E`) com `--err-on-fill`**; `--err-text` é só para texto e ícone
   sobre fundo neutro — usado como fundo, reprova.
4. **A sidebar é `--chrome` `#0B0D10` nos dois temas.** Não clareie no tema claro.
5. **Ícone e logo nunca juntos.** Sidebar expandida → logo horizontal de texto claro;
   recolhida → ícone sozinho, que **é** o botão de expandir.
6. **Sidebar recolhida exige tooltip** em todo item no hover. Sem isso o menu é
   adivinhação.
7. **`table-layout:fixed` + `<colgroup>` + ellipsis em toda célula de texto.**
   `min-width` só quando a tabela realmente não cabe, e o menor possível (520–560px é o
   normal). Rolagem lateral em tabela que caberia é defeito.
8. **`white-space:nowrap` em todo rótulo de botão, badge e cabeçalho de coluna.**
9. **`--text-faint` é o piso de contraste** (`#9AA0A8` dark / `#6B6E72` light). Não
   escureça mais no dark nem clareie mais no light "para parecer secundário".
10. **Badge = par bg/texto da tabela de semânticas.** Nunca texto da mesma matiz do tint.
11. **Verde só para estado terminal confirmado.** Previsto/agendado é `neutral`.
12. **Os quatro estados** (vazio, carregando, erro, sem permissão) fazem parte da entrega
    de qualquer lista.

---

## Comportamento — o essencial (completo em `INTERACTIONS.md`)

- **Clique na linha abre o lightbox de detalhe em leitura.** Não navega. "Ver detalhes"
  não existe como item de menu.
- **Menu `⋯` no fim da linha** para ações de estado; **excluir é o último item, vermelho,
  após divisor** — e também aparece como destrutiva no rodapé do detalhe. Nunca uma
  lixeira solta na linha.
- **Rodapé de modal:** destrutiva na extremidade esquerda; à direita `[Cancelar]` e depois
  a primária âmbar, sempre a última.
- **Confirmação nunca usa Sim/Não.** Título = `<Verbo> <objeto>?`; corpo nomeia o objeto e
  diz a consequência; botões = verbo da ação vs resultado de não agir (`[Manter
  lançamento] [Excluir]`). Foco inicial no recuo, `Esc` cancela, overlay não fecha.
- **Reversível → toast com "Desfazer"; irreversível → confirmação.** Confirmar tudo treina
  o usuário a não ler.
- **Toast de sucesso traz número** ("8 lançamentos conciliados").
- **Nunca modal sobre modal**; editar é in-place no mesmo painel.
- **Paginação, não scroll infinito**; filtros aplicam na hora; estado da tela vive na URL.
- **Nunca `alert()`/`confirm()`/`prompt()` nativos.**

---

## Shell obrigatório

Toda tela autenticada tem exatamente esta estrutura — não reinvente por tela:

```
┌──────────┬──────────────────────────────────────────────┐
│ sidebar  │ topbar 80px: busca global + toggle de tema   │
│ 216/68px ├──────────────────────────────────────────────┤
│ #0B0D10  │ conteúdo: padding 28px 32px 40px, gap 16px   │
│          │   1. overline RUMBEE <PRODUTO> + h1 + sub    │
│  logo    │   2. barra de contexto (card)                │
│  nav     │   3. cards de resumo (auto-fit 180px)        │
│  ...     │   4. filtros da lista                        │
│  user ▲  │   5. tabela                                  │
└──────────┴──────────────────────────────────────────────┘
```

- **Busca global:** pílula 50px, `max-width:760px`, texto 15px, lupa 20px. É a ferramenta
  mais usada — trate como campo principal.
- **O usuário mora no rodapé da sidebar** (avatar 28px + nome + e-mail → menu para cima).
  **Não** coloque avatar no topbar.
- **Topbar tem só duas coisas.** Sem breadcrumb, sem notificação, sem avatar.
- **Item de menu ativo:** ícone âmbar + peso 600 + barra vertical âmbar de 3px à esquerda.
  Jamais fundo âmbar preenchido.
- **Navegação idêntica em todas as telas** — mesmo inventário, mesma ordem, mesmos links.
  Se cada arquivo tem sua própria lista, ela vai divergir: mantenha uma constante única.

---

## Tema

Dark é a âncora da marca. Persista a escolha em `localStorage`; sem valor salvo, siga
`prefers-color-scheme`. O tema claro **não** é o escuro invertido: as semânticas do claro
são tints opacos com tinta profunda (`#D6F5E6` + `#046B4D`), não `rgba()` sobre paper.

---

## Copy

Português brasileiro, direto, sem entusiasmo performático. Número específico em vez de
adjetivo. Estado vazio explica o próximo passo. Erro diz o que aconteceu e o que fazer.
**Sem emoji, sem exclamação, sem "Ops!".** Verbo no infinitivo em botão.

Formatos: `R$ 1.234,56` · `DD/MM/AAAA` · CNPJ `XX.XXX.XXX/XXXX-XX` · negativo com `−`.

---

## Recriando uma tela que já existe em código

1. **Leia o código antes de desenhar.** Título, subtítulo, rótulos de coluna e nomes de
   ação vêm do arquivo real, verbatim — não da sua memória do que um produto assim teria.
2. **Não invente campo, coluna, métrica ou fluxo** que o código não tem.
3. **Declare o que é seu.** Se você adicionou estrutura (etapas, cards, colunas, ações),
   ponha na tela uma faixa `warn` discreta: badge "proposta nova" + frase dizendo o que
   veio do código (arquivo, tabela, migration) e o que é proposta. Protótipo sem essa
   marca vira documentação falsa do que existe.

---

## Autoverificação antes de entregar

- [ ] Nenhum hex fora de `tokens.css`.
- [ ] Dark e light conferidos na tela renderizada.
- [ ] Um primário âmbar; âmbar claramente abaixo de 8%.
- [ ] Sidebar grafite nos dois temas, com tooltip quando recolhida.
- [ ] Nenhuma rolagem lateral em tabela que cabe.
- [ ] `nowrap` em botões, badges e cabeçalhos.
- [ ] Quatro estados da lista presentes.
- [ ] Navegação igual à das outras telas.
- [ ] Overline `RUMBEE <PRODUTO>` no cabeçalho.
- [ ] Nota de proveniência, se houver proposta sua na tela.

---

## Erros que já aconteceram (não repita)

- Texto de badge `#8A9099` sobre tint `rgba(138,144,153,0.18)` — mesma matiz, 3.89:1,
  impossível de aprovar. Corrigido para `#B9BEC5`.
- `--text-faint` em `#5A616C`: 3.6:1 sobre grafite. Rótulo de coluna é conteúdo.
- Botão primário com texto branco sobre âmbar: 2.1:1.
- Botão destrutivo com fundo `--err-text` (`#F87171`) e texto branco: **2.77:1**. Cor de
  texto não vira cor de fundo — fill destrutivo é `--err-fill` (`#B3261E`).
- Âmbar como texto sobre paper no tema claro: 2.4:1 — daí o `--accent-ink`.
- `min-width: 1180px` numa tabela de 8 colunas que caberia em 560px.
- Ícone RumBee ao lado do logo horizontal na mesma barra — duas marcas aparentes.
- Cada tela com sua própria lista de navegação: 6 telas, 6 menus diferentes.
- Tela de motor de processamento inventada de memória, com métricas que o
  código não produzia.
