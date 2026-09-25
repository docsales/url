# RumBee — Web, meta tags e favicons

Versão 1.0 · Setembro 2026

Padrão de `<head>`, títulos, descrições e ícones para qualquer página RumBee — site
público, app autenticado ou página compartilhável.

---

## 1. Bloco canônico de `<head>`

Copie inteiro e troque só o que está entre `{}`.

```html
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>{Título da página} · RumBee {Produto}</title>
  <meta name="description" content="{Uma frase de 110–155 caracteres, com verbo, dizendo o que a página resolve.}">
  <link rel="canonical" href="https://{subdominio}.rumbee.ai/{caminho}">

  <!-- Ícones -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/assets/favicon-512.png" type="image/png" sizes="512x512">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#0B0D10" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#F7F6F2" media="(prefers-color-scheme: light)">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="RumBee">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="{Título da página} · RumBee {Produto}">
  <meta property="og:description" content="{Mesma description.}">
  <meta property="og:url" content="https://{subdominio}.rumbee.ai/{caminho}">
  <meta property="og:image" content="https://{subdominio}.rumbee.ai/assets/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="RumBee — a linha reta até o fechamento.">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{Título da página} · RumBee {Produto}">
  <meta name="twitter:description" content="{Mesma description.}">
  <meta name="twitter:image" content="https://{subdominio}.rumbee.ai/assets/og-image.png">

  <!-- Tipografia e tokens -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="/assets/tokens.css">
</head>
```

**App autenticado acrescenta:**

```html
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="strict-origin-when-cross-origin">
```

**Página com link-token (dashboard compartilhado, proposta, documento):** `noindex` é
**obrigatório** — link não listado que o Google indexa deixa de ser não listado.

---

## 2. Título

```
{Página} · RumBee {Produto}          ← padrão
{Página} · {Contexto} · RumBee Fin   ← quando o contexto é parte da identidade da tela
RumBee {Produto}                     ← só na home do produto
RumBee — a linha reta até o fechamento.  ← só na home institucional
```

Regras: separador é `·` (ponto médio com espaços), nunca `|` nem `-`. Máximo ~60
caracteres. Mais específico primeiro, marca por último. Sem "Bem-vindo ao", sem
"Home", sem nome de produto repetido duas vezes.

Exemplos: `Extratos · RumBee Fin` · `Setembro 2026 · DRE · RumBee Fin` ·
`Painel financeiro · RumBee Fin`.

**No app, o título da aba acompanha o estado da tela** (mês, conta, registro aberto) —
quem trabalha com cinco abas abertas se orienta por elas.

---

## 3. Description

Uma frase, 110–155 caracteres, com verbo, dizendo **o que a página faz pelo leitor**.
Sem adjetivo de marketing, sem lista de palavras-chave, sem repetir o título.

| Ruim | Bom |
|---|---|
| "A melhor plataforma de gestão financeira do mercado." | "Reconciliação financeira multi-moeda: bate cada centavo do extrato bancário com a contabilidade, todos os dias." |
| "RumBee Fin — extratos, lançamentos, conciliação, DRE, pagamentos." | "Importe extratos, concilie com os lançamentos e feche o mês com o resultado auditável, em BRL e USD." |

---

## 4. Ícones e imagens sociais

| Arquivo | Tamanho | Onde |
|---|---|---|
| `favicon-32.png` | 32×32 | aba do navegador |
| `favicon-48.png` | 48×48 | atalho, alta densidade |
| `favicon-192.png` | 192×192 | Android / PWA |
| `favicon-512.png` | 512×512 | PWA, splash |
| `apple-touch-icon.png` | 180×180 | iOS — **fundo grafite sólido**, 18% de respiro |
| `og-image.png` | 1200×630 | Open Graph e Twitter |

- O favicon é o **ícone hexagonal isolado**, nunca o logo horizontal: acima de 32px o
  texto vira borrão.
- `favicon.ico` (32+48) é gerado a partir dos PNG no build e serve o `/favicon.ico` da
  raiz, que navegadores antigos pedem sem perguntar.
- **iOS ignora transparência**: o `apple-touch-icon` tem fundo `#0B0D10` chapado.
- `og-image` é grafite com o ícone, o nome e a faixa âmbar inferior. Não use screenshot de
  produto como og-image: ilegível em miniatura.

---

## 5. `manifest.webmanifest`

```json
{
  "name": "RumBee Fin",
  "short_name": "Fin",
  "description": "Reconciliação financeira multi-moeda, automatizada e auditável.",
  "lang": "pt-BR",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B0D10",
  "theme_color": "#0B0D10",
  "icons": [
    { "src": "/assets/favicon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/favicon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/assets/favicon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 6. Domínios

| Uso | Padrão |
|---|---|
| Institucional | `rumbee.ai` |
| Marca / brand book público | `rumbee.ai/marca` |
| Produto | `{produto}.rumbee.ai` — `fin.rumbee.ai` |
| E-mail | `{nome}@rumbee.ai` |

`data-theme="dark"` no `<html>` é o padrão; o app troca para `light` conforme
`localStorage` ou `prefers-color-scheme`. Defina `data-theme` **no servidor ou em script
inline no `<head>`**, antes da primeira pintura — trocar depois causa flash branco.
