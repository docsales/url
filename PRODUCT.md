# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internal DocSales team. They create, manage, and track short links (custom domains, expiration, password, description) for their own work, and view usage statistics. Not a customer-facing product — no external signup flow is a goal.

## Product Purpose

RumBee URL is a self-hosted URL shortener (a rebranded, actively maintained fork of the open-source Kutt project). It lets the internal team create trackable short links under domains the company owns, view private statistics per link, and administer users/links from an admin page.

## Positioning

Exists instead of a third-party shortener (bit.ly and similar) specifically for domain and data ownership: links live under the team's own domain(s) and the click/usage data stays in-house rather than passing through an external vendor.

## Operating Context

- Deployed at `url.rumbee.ai`, self-hosted on Railway (Postgres backend), deploys triggered manually via `railway up` (no GitHub-integration auto-deploy configured).
- Part of the broader RumBee product ecosystem alongside `id.rumbee.ai` (centralized identity/SSO — Apple/Google/Microsoft/passkey/email) and `fin.rumbee.ai`. RumBee URL already has generic OIDC config support (`server/env.js`) but it is currently unconfigured/disabled; today's login is email + password.
- The login screen's visual shell (dark-anchored page, small RumBee icon, heading + Portuguese subtitle, theme-aware card, light/dark toggle) was deliberately built to match the id.rumbee.ai / fin.rumbee.ai pattern, without wiring live SSO yet — that integration is a known, explicit future step, not an oversight.
- No automated test suite exists (`npm test` → missing script). Manual verification (live browser check, both themes) is the current QA practice for UI changes.

## Capabilities and Constraints

- Core Kutt feature set: URL shortening, custom short URLs, custom domains, password/description/expiration per link, private per-link statistics, admin page for user/link management, REST API, OIDC login support (present, unconfigured).
- Backend: Node/Express + Handlebars views, plain CSS (no build step, no CSS framework/Tailwind), HTMX for interactivity, Postgres via Knex migrations.
- Self-hosted deploy target is Railway; database is Postgres in production (Kutt itself also supports SQLite/MySQL).
- Design-system migration is in progress, done in verified phases (never one giant rewrite) — see `docs/superpowers/specs/2026-09-25-rumbee-design-system-migration-design.md` and the vendored RumBee Brand Book at `docs/design-system/rumbee-brand/`.

## Brand Commitments

- Product name: **RumBee URL**. No remaining references to the upstream open-source project name ("Kutt") anywhere user-facing (header, footer, settings/API docs link) — deliberately removed.
- RumBee Brand Book is the design-system source of truth, upstream at [github.com/docsales/rumbee-design-system](https://github.com/docsales/rumbee-design-system) (recently implemented there), vendored as reference at `docs/design-system/rumbee-brand/tokens.css` and bridged into `static/css/rumbee-tokens.css`. Sync the vendored copy when the upstream repo updates. No hardcoded color/typography/spacing/radius values — always `var(--*)`.
- Assets: RumBee horizontal wordmark (header logo), RumBee icon mark (login screen, favicons).
- Login screen must visually match the established id.rumbee.ai / fin.rumbee.ai auth-shell pattern (see Operating Context).

## Evidence on Hand

- Live, shipped reference: `url.rumbee.ai` — Phase 1 token/theme migration and the logo/login-shell/favicon branding pass are both merged and deployed.
- No testimonials, case studies, press, or external marketing evidence exist or apply — this is an internal tool; future work must not fabricate any.

## Product Principles

1. Internal-first: built for the DocSales team's own workflow, not to acquire external users — no growth/marketing surface is implied.
2. Domain and data ownership outweighs the convenience of a third-party shortener; that trade is the whole reason this exists.
3. Ecosystem visual (and eventually auth) consistency with id.rumbee.ai / fin.rumbee.ai matters more than this tool having its own distinct identity.
4. Ship design/brand changes in small, independently verified phases (dark + light checked live) rather than one large rewrite.
