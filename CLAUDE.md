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
