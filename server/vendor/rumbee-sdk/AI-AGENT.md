# Integrating with id.rumbee.ai — for whoever (human or AI agent) is doing it

## What you get from the RumBee admin

An e-mail (or message) pointing you to `https://id.rumbee.ai/activate`.
Enter the e-mail address the admin registered you with, and the page shows
your `API_KEY`, `CALLBACK_SECRET`, and (if your satellite uses Clerk)
`CLERK_SECRET_KEY` — plus a ready-to-paste prompt with this same guide's
key points already filled in with your real values, **including the exact
env var names to use** (`RUMBEE_API_KEY`, `RUMBEE_CALLBACK_SECRET`,
`CLERK_SECRET_KEY` — the labels on the page are generic, those three names
are the ones your code actually reads). Put them in your own env vars —
never commit them. Clicking FINALIZAR on that page is irreversible: it's a
one-time reveal, so copy everything before you do.

## Before any code: two questions that decide your integration

Answer both in your spec, in writing. Every integration that went wrong so
far skipped one of them.

**1. Is your app multi-tenant or single-tenant?** A RumBee account
(`rumbeeId`) is a **customer company**, never a person. Several teammates
share one account, each with their own access row.

- **Multi-tenant** — your app has its own table of customer companies
  (workspaces, tenants, clients). Each of _your_ accounts calls
  `POST /api/v1/accounts` once (usually at signup) and stores the returned
  `rumbeeId` on its own row. Never a fixed `rumbeeId` in env/config: that
  only works for one customer.
- **Single-tenant** — one deployment serves exactly one customer company
  and your app has no accounts table (e.g. `url.`). Create the account
  **once, at setup** (a one-off `POST /api/v1/accounts`), and keep that one
  `rumbeeId` in config (e.g. `RUMBEE_ACCOUNT_ID`). Every access-check uses
  it.

Either way: if `POST /api/v1/accounts` would run once **per user**, you've
mapped the wrong entity — every user becomes a separate company and the
access-check denies everyone.

**2. How does your app render, and does the browser load Clerk?** This
decides how much of SSO you get for free (see SSO below):

| Your stack                                                                    | What you implement                                                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Next.js with `@clerk/nextjs` (`clerkMiddleware` + `ClerkProvider`)            | Nothing — handshake, token refresh and sign-out are handled.                     |
| React SPA with `@clerk/clerk-react` + a separate API                          | API verifies a Bearer token per request (SSO below).                             |
| Express with `@clerk/express` (`clerkMiddleware`)                             | clerk-js on every page (token refresh, sign-out detection).                      |
| Server-rendered without React (Handlebars, EJS…) or `@clerk/backend` directly | Handshake forwarding, session sync, clerk-js on every page — all of "SSO" below. |

## The 3 things you need to build

Two ids matter here, and they are not the same thing: `clerkUserId` (_who_
— Clerk gives you this directly, see SSO below) and `rumbeeId` (_which
customer company_ — see the tenancy question above).

1. **Get and verify an access token.**
   - Once per account (multi-tenant: at signup; single-tenant: once at
     setup): call `POST /api/v1/accounts` with the account's basic info
     (`Authorization: Bearer <API_KEY>`). The response includes
     `"rumbeeId": "AB3XZ"` — save it (multi-tenant: on your account row;
     single-tenant: in config).
   - Per user, when you need to know what they can access: call
     `POST /api/v1/access-checks` with
     `{ "rumbeeId": "AB3XZ", "clerkUserId": "user_2xyz..." }`
     (same `Authorization` header). Response is either
     `{ "allowed": true, "token": "eyJ...", "expiresAt": "2026-09-18T20:00:00Z" }`
     or `{ "allowed": false }`. Cache the `token` keyed by `clerkUserId` —
     you don't need to track `expiresAt` yourself, `verifyAccessToken`
     (next bullet) rejects it on its own once it expires.
   - On every request from that user, while the cached token still
     verifies: `verifyAccessToken(token, loginBaseUrl)`
     (`lib/verify-access.ts`) checks it against `id.`'s public JWKS
     locally — no network call. Once it's rejected (expired), repeat the
     access-check above to get a fresh one.

2. **Read the user's entitlements** (only if you show a cross-app launcher —
   most satellites don't need this). `lib/entitlements-client.ts`.
3. **Receive account/access status changes.** Expose one POST route at
   `/api/webhooks/rumbee-login` (fixed path — only your domain changes
   between satellites; that's the `callback-url` you gave the RumBee
   admin at registration) and call
   `handleCallback(request, callbackSecret, { onAccountSuspended, ... })`
   from `lib/callback-handler.ts` inside it. When a handler fires for a
   user you have a cached token for, delete that cache entry immediately
   — don't wait for the token to expire on its own. This callback is the
   whole reason revocation doesn't take up to 8h to take effect: an admin
   revoking access should lock the user out in seconds.
   - Seven handlers exist: `onAccountSuspended`, `onAccessRevoked`,
     `onUserBlocked`, `onUserUnblocked`, and three newer ones —
     `onAccessGranted`, `onAccountReactivated`, `onRoleChanged` — that fire
     on the positive/restorative counterpart of each negative action
     (granting/restoring access, un-suspending an account, changing a
     role). All seven are optional: an integration that only implements
     the first four keeps working exactly as before, it just won't hear
     about grants/reactivations/role changes in real time (it'll pick
     them up next time it calls `access-checks`).
   - **None of the seven is a sign-out.** They're about _access_, not
     _sessions_. Signing out on `id.` (or any RumBee app) sends you no
     callback — you learn about it from Clerk itself (SSO below).
   - Running on Cloudflare Workers? Set
     `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml` —
     `handleCallback` uses Node's `crypto.timingSafeEqual`.
   - **Access revoked is not the same as not signed in.** The user is still
     signed in on `*.rumbee.ai` (SSO, see below) — only their access to
     _your_ product is gone. If your own login page redirects an
     authenticated-but-unauthorized user back to your home, and your home
     redirects an unauthorized user to your login page, you've built a
     redirect loop: your app never gets to show them anything. Show an
     explicit "you don't have access to this app" state instead of
     redirecting through your own auth pages.

## SSO — Clerk's session is the source of truth

Your app shares the same Clerk instance as `id.` (use the exact same
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`) and lives on
`*.rumbee.ai`, so a user signed in on any RumBee app is signed in on yours
too. This is not Clerk's paid "Satellite Domains" feature — that's only for
a different root domain, not your case.

**The rule:** who is signed in is whatever Clerk says, on every request.
Don't create a session of your own derived from Clerk (an OIDC-style "trade
the token once, then issue my own cookie" flow is exactly what broke
`url.`: signing in on `id.` never reached it, and signing out on `id.`
never left it).

- If your app already has its own session (legacy), treat it as a cache of
  "which local user this Clerk session maps to" and revalidate it against
  Clerk on **every** authenticated request: signed in → make sure your
  session belongs to that `clerkUserId` (switch it if not); signed out →
  delete yours; handshake → forward the redirect (below).
- Sign-out is `Clerk.signOut()` (or `useClerk().signOut()`), which ends the
  session in **every** RumBee app. Never just delete your own cookie.

**How the cookies actually work** — "free" only holds when something runs
Clerk on both sides:

- `__client_uat` lives on `.rumbee.ai` (every subdomain sees it); sign-out
  anywhere zeroes it. `__session` (the session token) is **host-only**: on
  the first visit to your subdomain your server sees `__client_uat` but no
  `__session`.
- In that case Clerk's `authenticateRequest` returns `status: "handshake"`
  with a `307` to `https://clerk.rumbee.ai/v1/client/handshake?...` plus
  headers. **Forward that response verbatim** (the `Location` and every
  other header in `requestState.headers`). Substituting your own redirect
  (to your login page, or to `id.`) drops the sync and trips Clerk's
  redirect-loop guard — the user never gets signed in.
- On every other response, apply `requestState.headers` too (they refresh
  `__session`/`__client_uat`), whatever the status.
- The session token lives **60 seconds**. Only clerk-js running on the page
  refreshes it — no clerk-js in the browser, and your server sees an
  expired token a minute after every page load.
- Only full-page GETs can handshake. An XHR/fetch/htmx request with an
  expired token comes back `signed-out` with reason
  `session-token-expired`: that's "can't tell", not "signed out". Only the
  reasons `session-token-and-uat-missing` and
  `session-token-but-no-client-uat` mean the user really has no session.
  Treating an expired token as a sign-out logs people out every minute.

**Per stack:**

- **Next.js** (`@clerk/nextjs`): `clerkMiddleware()` in `proxy.ts`/
  `middleware.ts` + `<ClerkProvider>` handle all of the above. Just call
  `auth()` per request.
- **React SPA + separate API** (e.g. Cloudflare Workers, which never sees
  Clerk's cookie parsed for you): `<ClerkProvider>` from
  `@clerk/clerk-react` in the browser; the frontend sends
  `Authorization: Bearer <token>` (`useAuth().getToken()`, always fresh)
  and the API resolves `clerkUserId` with `@clerk/backend`'s `verifyToken`.
  Reference: `docsales/rumbee-fin` (`web/src/components/auth/RequireAuth.tsx`,
  `web/src/lib/auth-context.tsx`).
- **Express**: `clerkMiddleware()` from `@clerk/express` handles the
  handshake for you. With `@clerk/backend` alone you handle it yourself:

  ```js
  const state = await clerk.authenticateRequest(request, {
    authorizedParties: ["https://your-app.rumbee.ai"],
  });
  if (state.status === "handshake") {
    for (const [key, value] of state.headers) {
      if (key.toLowerCase() !== "location") res.append(key, value);
    }
    return res.redirect(307, state.headers.get("location"));
  }
  for (const [key, value] of state.headers) res.append(key, value);
  ```

  Either way you still need clerk-js on every page (next item) to keep the
  token fresh and notice sign-outs.

- **Server-rendered without React** (Clerk Core 3 — clerk-js v6 + `@clerk/ui`
  v1, both served by our Clerk frontend API host `clerk.rumbee.ai`, which is
  also what your publishable key decodes to):

  ```html
  <!-- login page only: the prebuilt <SignIn/> UI -->
  <script
    defer
    crossorigin="anonymous"
    src="https://clerk.rumbee.ai/npm/@clerk/ui@1/dist/ui.browser.js"
  ></script>
  <!-- every page with a session, and the login page -->
  <script
    defer
    crossorigin="anonymous"
    data-clerk-publishable-key="pk_live_..."
    src="https://clerk.rumbee.ai/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
  ></script>
  ```

  ```js
  window.addEventListener("load", async () => {
    await Clerk.load({
      appearance: rumbeeClerkAppearance, // lib/clerk-appearance.ts
      localization: ptBR, // @clerk/localizations — serve it to the page yourself
      ui: { ClerkUI: window.__internal_ClerkUICtor }, // only where ui.browser.js loaded
    });
    // login page: Clerk.mountSignIn(element, { forceRedirectUrl: "/" })
    // logout:     Clerk.signOut().then(() => location.replace("/login"))
    // any other page: reload when the signed-in user changes (signed out,
    // or switched account, on id. or any other app) so the server re-reads
    // the session
    let userId = Clerk.user?.id ?? null;
    Clerk.addListener(({ user }) => {
      if ((user?.id ?? null) !== userId) location.reload();
    });
  });
  ```

  `<SignIn/>` does **not** render in a Shadow DOM: your app's global CSS
  (`input[type=email]`, `button`, `label`…) applies to it and can beat
  Clerk's own classes, deforming the component. Scope your app's form CSS
  to your own forms. Reference implementation, running in production:
  `docsales/url` — `server/rumbee/session.js` (session sync, once per
  request), `server/rumbee/handshake.js`, `server/rumbee/provision.js`
  (link by `clerk_user_id`, then by e-mail),
  `static/scripts/rumbee-session.js` (`<SignIn/>`, global sign-out,
  reacting to a sign-out made in another app).

## The login screen — one standard for every RumBee app

Every RumBee app shows the **same** login screen as `id.rumbee.ai`: same
layout, same Clerk component, same theming, same language. No login form of
your own, no "Login with RumBee ID" button on top of your old form, no
English on a Portuguese app.

- **Component:** Clerk's `<SignIn/>` (React) or `Clerk.mountSignIn()` (no
  React), themed with `rumbeeClerkAppearance` from `lib/clerk-appearance.ts`
  (the exact object `id.` uses — it hides Clerk's own header/footer and
  maps colors to the Brand Book tokens, so your page must load
  `tokens.css`), localized with `@clerk/localizations` (`ptBR` for pt).
- **Layout** (reference: `app/[[...rest]]/page.tsx` in `id.`), two equal
  columns filling the viewport:
  - **Left — brand panel, always dark** (`--chrome` / `--rb-graf-950`,
    whatever the theme), padding `--rb-space-10`, content spread top to
    bottom: the horizontal logo with light text
    (`rumbee-logo-horizontal-light-text.png`, 34px tall) at the top; in the
    middle an `<h1>` **"Entrar no RumBee &lt;Produto&gt;"** (`--rb-osso`,
    bold, h1 size) over **"Use sua conta RumBee para continuar."**
    (`--rb-graf-400`); the beeline art (`rumbee-beeline-target.png`, 160px
    wide, 90% opacity) at the bottom. Assets and `tokens.css` come from the
    RumBee design system (`docsales/rumbee-design-system`, `assets/`).
  - **Right — the sign-in**, `<SignIn/>` centered, nothing else above it (the
    panel carries the heading). A theme toggle in the top-right corner is
    allowed if your app has one; the column follows your app's theme.
  - **Footer**, full width under both columns: "Termos de Uso"
    (`https://www.rumbee.ai/pt-br/termos-de-uso`), "Política de
    Privacidade" (`https://www.rumbee.ai/pt-br/politica-de-privacidade`),
    "© 2026 RumBee, Inc." — small, muted, centered, separated by a top
    border.
  - **Below 768px** the brand panel is hidden and the sign-in stands alone.
- **Who sees it:** only someone with **no** Clerk session. A signed-in user
  without access to your app gets a "no access" screen (with a sign-out
  button), never the login screen — `<SignIn/>` shown to someone already
  signed in detects the session and redirects away, and you have a loop.
- The alternative to hosting `<SignIn/>` yourself is redirecting to
  `https://id.rumbee.ai/?redirect_url=<your URL>` — same screen, hosted by
  `id.`, and the user comes back to your URL after signing in.

## Showing the App Launcher (optional)

Want the RumBee app-switcher (the 3×3-dot icon that lets a user jump
between the RumBee apps they have access to) on your pages? Drop in one
script tag — no backend work, no API key needed for this part:

```html
<script src="https://id.rumbee.ai/launcher.js" data-lang="pt" data-theme="dark"></script>
```

- `data-lang`: `"pt"` | `"en"` | `"es"` — defaults to `"pt"` if omitted.
- `data-theme`: `"dark"` | `"light"` — defaults to `"dark"` if omitted. Match
  whatever theme your page is currently showing; the script doesn't watch
  for changes, so if your app has a light/dark toggle, update this
  attribute and remount, or just pick your app's dominant theme.

It renders as a fixed, top-right floating button on top of your page. It
fetches the current user's entitlements directly from `id.rumbee.ai` using
the shared `.rumbee.ai` session cookie — same SSO as everything else in
this guide, nothing to configure. If nobody is signed in, or the user has
no active RumBee products, it renders nothing.

The widget styles itself entirely through inline `style="..."` attributes
by design, so it renders correctly inside its Shadow DOM with no external
stylesheet. If your page enforces a `style-src` Content-Security-Policy
without `'unsafe-inline'`, the widget will still mount but come out
completely unstyled — no console error, just a blank/broken-looking button.
If the launcher looks broken after adding it, check your CSP first.

## Analytics (optional)

RumBee measures product usage with PostHog, loaded centrally by
`id.rumbee.ai`. You don't need a PostHog account, key or package. Add one
script tag to the `<head>` of every page, before your app's own scripts:

```html
<script src="https://id.rumbee.ai/analytics.js"></script>
```

- It captures page views (including client-side route changes), page
  leaves, clicks and session replay, and identifies the signed-in user
  through `window.Clerk`, which every RumBee app already loads.
- It's safe in every environment. It only captures on your production
  hostname (the `url` registered for your product in `id.`); on staging,
  previews or localhost it loads and does nothing.
- Don't configure masking yourself. All text and inputs are masked
  centrally, both in the replay and in click events.
- CSP: allow `https://id.rumbee.ai` in `script-src` and `connect-src`.
  Events and the replay recorder go through `id.rumbee.ai` too.

For events that matter to your product, call `track()` from
`lib/analytics.ts`:

```ts
import { track } from "./lib/analytics";

track("link_created", { source: "dashboard" });
```

Name events `object_verb`, in snake_case and past tense (`link_created`,
`invoice_paid`). Don't put your product in the name, because
`analytics.js` already attaches it to every event. Never pass personal data
(emails, names, document contents) as properties.

## Pre-provisioning a teammate before they sign up (optional)

Only needed if your product lets someone add a teammate by email before
that person has ever created a RumBee account anywhere. Call
`POST /api/v1/users` (`Authorization: Bearer <API_KEY>`):

```json
{
  "email": "maria@acme.com",
  "rumbeeId": "AB3XZ",
  "role": "salesman",
  "name": "Maria Silva",
  "whatsapp": "+5511999999999",
  "language": "pt-BR",
  "timezone": "America/Sao_Paulo"
}
```

- `email`, `rumbeeId` and `role` are required; `name`, `whatsapp`,
  `language` and `timezone` are optional.
- `role` must be a **`roleKey`** registered for **your own** product —
  exact match, **case-sensitive** (`"admin"` passes, `"Admin"` is a `422`).
  Never send the display `label`. Don't hardcode or guess one — call
  `GET /api/v1/roles` (same `Authorization` header, no body) to list them:
  `{ "roles": [{ "roleKey": "salesman", "label": "Vendedor" }, ...] }`. This
  was chosen once, by whoever registered your satellite, and this endpoint
  is the only place it's discoverable — it's not in this guide because it's
  different per satellite.
- Success (`200`) echoes the person back:
  `{ "email", "rumbeeId", "productSlug", "role", "status": "pending_provisioning", "name", "whatsapp", "language", "timezone" }`.
- Errors come as `{ "error": { "code", "message" } }`: `401`
  `UNAUTHORIZED` (API key), `404` `ACCOUNT_NOT_FOUND` (unknown `rumbeeId`),
  `422` `VALIDATION_ERROR` (bad payload, or a role that isn't one of your
  `roleKey`s — the message lists the valid ones).
- This call creates the person (sending a Clerk invite if they don't have
  an account anywhere yet) and an access row scoped to your product with
  status `pending_provisioning` — it does **not** grant access by itself.
- It becomes `active` automatically the moment that email creates a Clerk
  account for the first time **anywhere in the RumBee ecosystem**
  (accepting your invite, or completing sign-up on any other satellite) —
  no further call needed from you.
- If the person already has a RumBee account (they already use another
  satellite), pre-provisioning alone leaves them stuck at
  `pending_provisioning` forever — the Clerk-account-creation trigger that
  activates access already fired, in the past, for that other product.
  There's no self-serve API to activate this case; ask the RumBee team to
  do it from the `id.` admin panel.

## Verify your integration

```bash
RUMBEE_API_KEY=... RUMBEE_VERIFY_TEST_RUMBEE_ID=... RUMBEE_VERIFY_TEST_CLERK_USER_ID=... \
  npx tsx verify.ts
```

Runs 3 checks and prints PASS/FAIL for each: your API key authenticates,
`id.`'s JWKS is reachable, and `id.` can reach your callback URL. Run
this after every change to your integration, not just once at setup.

**`verify.ts` passing says nothing about SSO** — `url.` passed all three
with sign-in and sign-out completely broken. The integration is done only
when this acceptance checklist passes too, in a real browser, on your
deployed app:

- [ ] Signed in on `id.`, open your app → you're in, signed in, without
      clicking anything.
- [ ] Sign out on `id.` → your app signs out (within ~1 minute, or as soon as
      its tab gets focus).
- [ ] Sign out in your app → `id.` and the other RumBee apps are signed out
      too.
- [ ] A signed-in user without access → your "no access" screen, no redirect
      loop.
- [ ] Signed out, open your app → the standard login screen above
      (`<SignIn/>`, `id.`'s theme, Portuguese, two columns).

**Testing without a browser.** There's only a production Clerk instance, and
it refuses `localhost` (HTTP 400) — you can't run sign-in locally, so test on
your deployed app. You can still check the server side of each session state
with curl, since they're just cookies:

```bash
# no RumBee session at all → your login screen (or a redirect to it); never a 404/500
curl -sI https://your-app.rumbee.ai/
# signed out elsewhere (sign-out zeroes __client_uat) → same as above
curl -sI -H 'Cookie: __client_uat=0' https://your-app.rumbee.ai/
# signed in elsewhere, first visit here → 307 to clerk.rumbee.ai/v1/client/handshake
# (your own redirect here means you're swallowing the handshake)
curl -sI -H 'sec-fetch-dest: document' -H "Cookie: __client_uat=$(date +%s)" \
  https://your-app.rumbee.ai/
```

## What you should NOT build

- Your own sign-up screen calling a `id.` API — new users come in through
  Clerk directly (same instance), or through pre-provisioning above.
- Your own login form, or a session of your own derived from Clerk — see
  SSO and the login screen above.
- A "delete user" call — call `POST /api/v1/access-revocations` instead; it
  only removes that person's access to _your_ product, never their RumBee
  identity.
