# RumBee — Marca

Versão 1.0 · Setembro 2026

## 1. O conceito

RumBee vem de **rumo** + **bee**. A abelha não vagueia: ela volta da flor em linha reta
para a colmeia — a *beeline*. É o único inseto que os humanos usam como sinônimo de
caminho direto ("to make a beeline for").

Disso saem três ideias que sustentam todo produto da casa:

**Rumo.** O produto sempre sabe onde é o fechamento e mostra o caminho até lá.
**Colmeia.** O trabalho é um sistema coordenado, não heroísmo individual.
**Mel.** O resultado é doce, concreto e mensurável — não é "engajamento", é dinheiro.

A síntese: **a linha reta até o fechamento.**

## 2. Símbolo

O ícone RumBee é um hexágono — célula de colmeia — com a linha da beeline atravessando
até o alvo. Ele funciona sozinho a partir de 20px.

| Asset | Uso |
|---|---|
| `rumbee-icon-transparent.png` | Ícone isolado: favicon, avatar, sidebar recolhida, marcas d'água |
| `rumbee-logo-horizontal-light-text.png` | Logo com texto claro — **para fundos escuros** |
| `rumbee-logo-horizontal-dark-text.png` | Logo com texto escuro — **para fundos claros** |
| `rumbee-beeline-target.png` | Elemento gráfico da beeline chegando ao alvo — telas de marca |
| `rumbee-beeline-stripe.png` | Faixa listrada — divisores e acentos gráficos |

### Regras de uso

- **Nunca ícone e logo lado a lado.** O logo horizontal já contém o símbolo. Repetir os
  dois na mesma barra é o erro mais comum e lê como se fossem duas marcas.
- **Um lockup por contexto:** área de marca expandida → logo horizontal; área reduzida →
  ícone sozinho. A troca é substituição, nunca acúmulo.
- **Altura, não largura.** Defina `height` e deixe `width:auto` com `object-fit:contain`.
  O logo tem 15–18px de altura em chrome de interface, 34px em telas de marca.
- **Margem de respiro** de ao menos a altura do símbolo em toda a volta.
- **Não** recolora, não aplica sombra, não rotaciona, não coloca sobre foto de baixo
  contraste, não usa o logo de texto claro em fundo claro.

## 3. Cor

A marca tem duas cores e nada mais.

**Grafite `#0E1013`** — a base. Não é preto: tem um viés quente que o preto puro não tem.
Ocupa 90% de qualquer tela e é onde a informação vive.

**Âmbar `#E8A020`** — a ação. É o mel, é o alvo, é o ponto onde a mão deve ir.

> **A regra que define o visual RumBee: o âmbar é o alvo, não o caminho.**
> Âmbar aparece no ponto de decisão — o CTA primário, o item de menu ativo, o anel de
> foco. Nunca como fundo de página, nunca como fundo de card grande, nunca como fundo de
> sidebar inteira. **Máximo 8% da área de uma tela.** Um botão âmbar numa tela de grafite
> é inevitável; dez botões âmbar não são nada.

O par completo, com as escalas e os tons de tema, está em `tokens.css` e documentado em
`DESIGN.md` §2.

**Osso `#ECE9E2`** é o texto sobre grafite, e **paper `#F7F6F2`** é o fundo do modo claro.
São neutros de trabalho, não cores de marca — não os use como identidade.

## 4. Tipografia

**Archivo**, e só Archivo. Uma família, hierarquia por tamanho e peso.

Archivo é uma sans-serif grotesca de proporções levemente condensadas — economiza largura
em tabela densa sem apertar a leitura, e os pesos 600/700 fecham títulos sem precisar de
tracking negativo.

Pesos em uso: **400** corpo, **500** ênfase e valores, **600** rótulo e título de card,
**700** título de página e ação primária. Nada acima de 700.

**Não existe segunda família.** Em especial: valores monetários, IDs e documentos **não**
vão em mono. Números em Archivo 500 alinhados à direita já tabulam bem, e a troca de
família em meio a uma tabela é a coisa que mais rápido faz um produto parecer remendado.

## 5. Voz

Direta, concreta, sem entusiasmo performático. A frase certa é a que caberia numa
conversa entre duas pessoas competentes que têm trabalho a fazer.

| Em vez de | Escreva |
|---|---|
| "Ops! Algo deu errado 😕" | "Não foi possível importar o extrato." |
| "Gerencie seus dados de forma inteligente" | "Bate cada centavo com a contabilidade." |
| "Nenhum item encontrado" | "Nenhum lançamento neste mês. Importe um extrato para começar." |
| "Sucesso!" | "8 lançamentos conciliados." |

Regras:
- **Português brasileiro**, formato brasileiro (`R$ 1.234,56`, `16/09/2026`).
- **Número específico em vez de adjetivo.** "1.204 de 1.249 linhas", não "quase tudo".
- **Estado vazio explica o próximo passo**, nunca só constata o vazio.
- **Erro diz o que aconteceu e o que fazer.** Sem culpar o usuário, sem pedir desculpa.
- **Sem emoji**, sem exclamação em interface, sem "simplesmente", sem "apenas".
- **Verbo no infinitivo em botão** ("Conciliar", "Importar extrato"), 1ª pessoa do plural
  só em explicação ("Enviamos um link para o seu e-mail").

## 6. Arquitetura de nomes

O produto é `RumBee <Produto>` — RumBee Fin, RumBee Sign, RumBee Docs. Em interface o
overline de marca é `RUMBEE <PRODUTO>` (11px, 600, uppercase, tracking 0.05em) acima do
título da página. Nunca o nome do produto sozinho: é o que amarra a família.

O domínio é `rumbee.ai`; e-mails de exemplo em protótipo usam `@rumbee.ai`.
