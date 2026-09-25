# RumBee ID (id.rumbee.ai) SSO Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make this app ("Rumbee URL", `url.rumbee.ai`) authenticate exclusively through RumBee ID SSO (shared Clerk session on `*.rumbee.ai`), register each Kutt user as a RumBee "account", gate every authenticated request on a cached, locally-verified access token, and react in real time to suspend/revoke/block webhooks from `id.rumbee.ai`.

**Architecture:** A new `rumbee-login` entry route verifies the shared Clerk session server-side (`@clerk/backend`, no React/client SDK needed since we're same-apex-domain), finds-or-creates the matching Kutt `users` row by e-mail (mirroring the existing OIDC auto-provision pattern), registers a RumBee account once (`rumbee_id` stored on that row), then issues Kutt's own JWT exactly as today — RumBee ID only governs the front door, Kutt's existing session governs everything after. A composed `jwtWithAccess`/`jwtPageWithAccess` middleware pair (used everywhere `auth.jwt`/`auth.jwtPage` is used today) adds a per-request access-check, cached and verified locally via JWKS (no network on the hot path). A new webhook route evicts that cache the instant `id.` reports a suspend/revoke/block, so access loss takes effect in seconds, not up to the ~8h token lifetime.

**Tech Stack:** Express 4, Knex/Postgres, Passport (unchanged — this integration does **not** use Passport; see Task 8 rationale), `@clerk/backend` (new), `jose` (new, vendored SDK's own JWKS verification dependency), Node's built-in `node:test` runner (new — no test framework exists in this repo today; zero extra dependency).

**Spec:** [docs/superpowers/specs/2026-09-25-rumbee-id-integration-design.md](../specs/2026-09-25-rumbee-id-integration-design.md)

## Global Constraints

- SSO fully replaces local login in production: `DISALLOW_LOGIN_FORM=true`, `DISALLOW_REGISTRATION=true` (set on Railway by the user, not by this plan — see Task 12).
- One Kutt `users` row = one RumBee "account" (no separate account/org entity exists in this schema).
- Never build a custom sign-up screen or a "delete user" call against RumBee's API — per `AI-AGENT.md`, new users come in through the shared Clerk session, and access removal goes through `id.`'s own revocation, never a delete from our side.
- Never commit `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `RUMBEE_API_KEY`, `RUMBEE_CALLBACK_SECRET` anywhere — they're already set on the Railway "Rumbee URL" service (production env `5eec86f4-6790-47b0-9581-e929b49a5d1a`) by the user; this plan only ever reads them via `env.js`.
- `@clerk/backend`'s real, verified API (checked against `clerk/javascript@main` source, package version `3.20.1`, 2026-09-25): `createClerkClient({secretKey, publishableKey}).authenticateRequest(request)` returns `{ status: "signed-in" | "signed-out" | "handshake", toAuth(): AuthObject }` — always branch on `status`, never on `toAuth()` truthiness alone.
- Node 22 (Dockerfile). `Request`/`Response`/`Headers`/`fetch` are all real globals — never `require`/`import` them.

---

## Task 1: Vendor the RumBee SDK's callback handler + JWKS verifier

The upstream SDK (`docsales/rumbee-app-sdk`) ships these as TypeScript ESM; this app is plain CommonJS with no TS build step, so they're ported by hand (logic unchanged, types stripped) rather than pulled in as a package — matching the `docsales/rumbee-app-sdk` README's own instruction ("Copy this whole repo into your own app").

**Files:**
- Create: `server/vendor/rumbee-sdk/callback-handler.js`
- Create: `server/vendor/rumbee-sdk/verify-access.js`
- Create: `server/vendor/rumbee-sdk/callback-handler.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `handleCallback(request: Request, callbackSecret: string, handlers: object): Promise<Response>` — `handlers` keys: `onAccountSuspended`, `onAccessRevoked`, `onUserBlocked`, `onUserUnblocked`, `onAccessGranted`, `onAccountReactivated`, `onRoleChanged`, each `(event) => Promise<void>`, all optional.
- Produces: `verifyAccessToken(token: string, loginBaseUrl: string): Promise<{sub, rumbee_id, product, role}>` — throws if invalid/expired.

- [ ] **Step 1: Install `jose` (the vendored verifier's only dependency)**

```bash
npm install jose@^6.2.12
```

- [ ] **Step 2: Write `server/vendor/rumbee-sdk/verify-access.js`**

```js
// Vendored (CommonJS port) from docsales/rumbee-app-sdk lib/verify-access.ts.
// Logic must stay identical to upstream — re-port by hand if upstream changes.
const { createRemoteJWKSet, jwtVerify } = require("jose");

let jwks = null;

async function verifyAccessToken(token, loginBaseUrl) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("/.well-known/jwks.json", loginBaseUrl));
  }
  const { payload } = await jwtVerify(token, jwks, { algorithms: ["RS256"] });
  return payload;
}

module.exports = { verifyAccessToken };
```

- [ ] **Step 3: Write the failing test for `handleCallback`**

Create `server/vendor/rumbee-sdk/callback-handler.test.js`:

```js
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { handleCallback } = require("./callback-handler");

function request(body, secret) {
  return new Request("http://internal/api/webhooks/rumbee-login", {
    method: "POST",
    headers: secret !== undefined ? { "X-Rumbee-Callback-Secret": secret } : {},
    body: JSON.stringify(body),
  });
}

test("rejects a missing or wrong callback secret", async () => {
  const res = await handleCallback(request({ event: "ping" }, "wrong"), "right", {});
  assert.equal(res.status, 401);

  const resNoHeader = await handleCallback(request({ event: "ping" }), "right", {});
  assert.equal(resNoHeader.status, 401);
});

test("ping is a 200 no-op even with no handlers", async () => {
  const res = await handleCallback(request({ event: "ping" }, "right"), "right", {});
  assert.equal(res.status, 200);
});

test("dispatches account_suspended to onAccountSuspended with the parsed event", async () => {
  let received = null;
  const handlers = {
    onAccountSuspended: async (event) => {
      received = event;
    },
  };
  const body = { event: "account_suspended", rumbeeId: "AB3XZ", occurredAt: "2026-09-25T00:00:00Z" };
  const res = await handleCallback(request(body, "right"), "right", handlers);
  assert.equal(res.status, 200);
  assert.deepEqual(received, body);
});

test("an event with no matching handler still returns 200", async () => {
  const body = { event: "role_changed", rumbeeId: "AB3XZ", productSlug: "url", userId: "u1", newRole: "admin", occurredAt: "2026-09-25T00:00:00Z" };
  const res = await handleCallback(request(body, "right"), "right", {});
  assert.equal(res.status, 200);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `node --test server/vendor/rumbee-sdk/callback-handler.test.js`
Expected: FAIL — `Cannot find module './callback-handler'`

- [ ] **Step 5: Write `server/vendor/rumbee-sdk/callback-handler.js`**

```js
// Vendored (CommonJS port) from docsales/rumbee-app-sdk lib/callback-handler.ts.
// Logic must stay identical to upstream — re-port by hand if upstream changes.
const { timingSafeEqual } = require("node:crypto");

async function handleCallback(request, callbackSecret, handlers) {
  const receivedSecret = request.headers.get("X-Rumbee-Callback-Secret") ?? "";
  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(callbackSecret);
  const isValid = received.length === expected.length && timingSafeEqual(received, expected);
  if (!isValid) {
    return new Response(null, { status: 401 });
  }

  const body = await request.json();

  switch (body.event) {
    case "ping":
      break;
    case "account_suspended":
      await handlers.onAccountSuspended?.(body);
      break;
    case "access_revoked":
      await handlers.onAccessRevoked?.(body);
      break;
    case "user_blocked":
      await handlers.onUserBlocked?.(body);
      break;
    case "user_unblocked":
      await handlers.onUserUnblocked?.(body);
      break;
    case "access_granted":
      await handlers.onAccessGranted?.(body);
      break;
    case "account_reactivated":
      await handlers.onAccountReactivated?.(body);
      break;
    case "role_changed":
      await handlers.onRoleChanged?.(body);
      break;
  }

  return new Response(null, { status: 200 });
}

module.exports = { handleCallback };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test server/vendor/rumbee-sdk/callback-handler.test.js`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 7: Add the `test` script to `package.json`**

In `package.json`, inside `"scripts"`, add (keep existing entries):

```json
    "test": "node --test server/**/*.test.js",
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json server/vendor/rumbee-sdk/verify-access.js server/vendor/rumbee-sdk/callback-handler.js server/vendor/rumbee-sdk/callback-handler.test.js
git commit -m "feat: vendor RumBee SDK callback handler and JWKS verifier"
```

---

## Task 2: `rumbee_id` / `clerk_user_id` migration

Both are needed: `rumbee_id` to call `access-checks`, `clerk_user_id` to resolve *which* cached access-token entry to evict when an **account**-level webhook event fires (`account_suspended`/`account_reactivated` carry only `rumbeeId`, not a user id — see Task 6).

**Files:**
- Create: `server/migrations/20260925120000_rumbee_ids.js`

**Interfaces:**
- Produces: `users.rumbee_id` (string, nullable), `users.clerk_user_id` (string, nullable, indexed).

- [ ] **Step 1: Write the migration**

```js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
  const hasRumbeeId = await knex.schema.hasColumn("users", "rumbee_id");
  const hasClerkUserId = await knex.schema.hasColumn("users", "clerk_user_id");
  if (hasRumbeeId && hasClerkUserId) return;

  await knex.schema.alterTable("users", table => {
    if (!hasRumbeeId) table.string("rumbee_id");
    if (!hasClerkUserId) table.string("clerk_user_id").index();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {}

module.exports = {
  up,
  down,
}
```

- [ ] **Step 2: Run it against the local dev DB**

Run: `npm run migrate`
Expected: `Batch N run: 1 migrations` and no error. Re-run the same command once more — expected: `Already up to date` (confirms the `hasColumn` guard is idempotent, matching the house style used by every other migration in `server/migrations/`).

- [ ] **Step 3: Commit**

```bash
git add server/migrations/20260925120000_rumbee_ids.js
git commit -m "feat: add rumbee_id and clerk_user_id columns to users"
```

---

## Task 3: RumBee API client (account registration + access checks)

Thin fetch wrappers around the two `id.rumbee.ai` REST endpoints this app calls directly (as opposed to the vendored SDK, which only covers JWKS verification and the callback contract). No unit tests here — there's nothing to test beyond "does it call fetch with the right shape", and the actual contract is verified end-to-end by `verify.ts` in Task 12 against the real deployed service.

**Files:**
- Create: `server/rumbee/client.js`
- Modify: `server/env.js`
- Modify: `.example.env`

**Interfaces:**
- Consumes: `env.RUMBEE_LOGIN_BASE_URL`, `env.RUMBEE_API_KEY` (added this task).
- Produces: `createAccount({email}): Promise<string>` (returns `rumbeeId`), `checkAccess(rumbeeId, clerkUserId): Promise<{allowed: true, token: string, expiresAt: string} | {allowed: false}>`.

- [ ] **Step 1: Add the new env vars to `server/env.js`**

In `server/env.js`, inside the `spec` object, right after the `OIDC_BUTTON_TEXT` line, add:

```js
  RUMBEE_ENABLED: bool({ default: false }),
  RUMBEE_LOGIN_BASE_URL: str({ default: "https://id.rumbee.ai" }),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: str({ default: "" }),
  CLERK_SECRET_KEY: str({ default: "" }),
  RUMBEE_API_KEY: str({ default: "" }),
  RUMBEE_CALLBACK_SECRET: str({ default: "" }),
```

- [ ] **Step 2: Document the new vars in `.example.env`**

At the end of `.example.env`, add:

```bash
# Optional - Log in with RumBee ID (id.rumbee.ai) SSO instead of local email/password.
# Set the first 4 from the values id.rumbee.ai/activate revealed for this satellite —
# never commit real values here. Leave RUMBEE_ENABLED=false to keep local login.
RUMBEE_ENABLED=false
RUMBEE_LOGIN_BASE_URL=https://id.rumbee.ai
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
RUMBEE_API_KEY=
RUMBEE_CALLBACK_SECRET=
```

- [ ] **Step 3: Write `server/rumbee/client.js`**

```js
const env = require("../env");

async function createAccount(payload) {
  const response = await fetch(new URL("/api/v1/accounts", env.RUMBEE_LOGIN_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RUMBEE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`RumBee account registration failed: ${response.status}`);
  }
  const body = await response.json();
  return body.rumbeeId;
}

async function checkAccess(rumbeeId, clerkUserId) {
  const response = await fetch(new URL("/api/v1/access-checks", env.RUMBEE_LOGIN_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RUMBEE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rumbeeId, clerkUserId }),
  });
  if (!response.ok) {
    throw new Error(`RumBee access check failed: ${response.status}`);
  }
  return response.json();
}

module.exports = { createAccount, checkAccess };
```

- [ ] **Step 4: Commit**

```bash
git add server/env.js .example.env server/rumbee/client.js
git commit -m "feat: add RumBee ID API client and its env vars"
```

---

## Task 4: Access-token cache

The per-request gate's core logic: cache a `{rumbeeId, clerkUserId} -> access token` mapping, verify it locally (JWKS, no network) before trusting a cache hit, and fall back to a fresh `access-checks` call on miss or expiry. Both the checker and the RumBee client are injected so this is fully unit-testable without real network/JWKS calls.

**Files:**
- Create: `server/rumbee/access-cache.js`
- Create: `server/rumbee/access-cache.test.js`

**Interfaces:**
- Consumes: `checkAccess` from Task 3 (`server/rumbee/client.js`), `verifyAccessToken` from Task 1 (`server/vendor/rumbee-sdk/verify-access.js`).
- Produces: `getAccess(rumbeeId, clerkUserId, deps?): Promise<{allowed: true, claims: object} | {allowed: false}>`, `evict(clerkUserId): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `server/rumbee/access-cache.test.js`:

```js
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { getAccess, evict } = require("./access-cache");

test("cache miss calls checkAccess, caches the token, returns allowed + claims", async () => {
  let checkAccessCalls = 0;
  const deps = {
    checkAccess: async () => {
      checkAccessCalls++;
      return { allowed: true, token: "tok-1", expiresAt: "2099-01-01T00:00:00Z" };
    },
    verifyAccessToken: async (token) => ({ sub: "user-a", token }),
  };

  const result = await getAccess("RB1", "user-a", deps);

  assert.equal(checkAccessCalls, 1);
  assert.equal(result.allowed, true);
  assert.equal(result.claims.sub, "user-a");
});

test("cache hit with a still-valid token does not call checkAccess again", async () => {
  let checkAccessCalls = 0;
  const deps = {
    checkAccess: async () => {
      checkAccessCalls++;
      return { allowed: true, token: "tok-2", expiresAt: "2099-01-01T00:00:00Z" };
    },
    verifyAccessToken: async (token) => ({ sub: "user-b", token }),
  };

  await getAccess("RB1", "user-b", deps);
  await getAccess("RB1", "user-b", deps);

  assert.equal(checkAccessCalls, 1);
});

test("cache hit with an expired token evicts and re-checks", async () => {
  let checkAccessCalls = 0;
  let verifyCalls = 0;
  const deps = {
    checkAccess: async () => {
      checkAccessCalls++;
      return { allowed: true, token: "tok-3", expiresAt: "2099-01-01T00:00:00Z" };
    },
    verifyAccessToken: async () => {
      verifyCalls++;
      if (verifyCalls === 1) return { sub: "user-c" };
      throw new Error("expired");
    },
  };

  await getAccess("RB1", "user-c", deps);
  await getAccess("RB1", "user-c", deps);

  assert.equal(checkAccessCalls, 2);
});

test("checkAccess reporting not-allowed returns allowed:false and does not cache", async () => {
  let checkAccessCalls = 0;
  const deps = {
    checkAccess: async () => {
      checkAccessCalls++;
      return { allowed: false };
    },
    verifyAccessToken: async () => {
      throw new Error("should never be called for a denied check");
    },
  };

  const result = await getAccess("RB1", "user-d", deps);
  assert.deepEqual(result, { allowed: false });

  await getAccess("RB1", "user-d", deps);
  assert.equal(checkAccessCalls, 2);
});

test("evict removes a cached entry so the next getAccess re-checks", async () => {
  let checkAccessCalls = 0;
  const deps = {
    checkAccess: async () => {
      checkAccessCalls++;
      return { allowed: true, token: "tok-5", expiresAt: "2099-01-01T00:00:00Z" };
    },
    verifyAccessToken: async () => ({ sub: "user-e" }),
  };

  await getAccess("RB1", "user-e", deps);
  await evict("user-e");
  await getAccess("RB1", "user-e", deps);

  assert.equal(checkAccessCalls, 2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test server/rumbee/access-cache.test.js`
Expected: FAIL — `Cannot find module './access-cache'`

- [ ] **Step 3: Write `server/rumbee/access-cache.js`**

```js
const env = require("../env");
const redis = require("../redis");
const rumbeeClient = require("./client");
const { verifyAccessToken } = require("../vendor/rumbee-sdk/verify-access");

const memoryCache = new Map();

function cacheKey(clerkUserId) {
  return `rumbee-access:${clerkUserId}`;
}

async function getEntry(clerkUserId) {
  if (env.REDIS_ENABLED) {
    const raw = await redis.client.get(cacheKey(clerkUserId));
    return raw ? JSON.parse(raw) : null;
  }
  return memoryCache.get(clerkUserId) || null;
}

async function setEntry(clerkUserId, entry) {
  if (env.REDIS_ENABLED) {
    await redis.client.set(cacheKey(clerkUserId), JSON.stringify(entry));
    return;
  }
  memoryCache.set(clerkUserId, entry);
}

async function evict(clerkUserId) {
  if (env.REDIS_ENABLED) {
    await redis.client.del(cacheKey(clerkUserId));
    return;
  }
  memoryCache.delete(clerkUserId);
}

async function getAccess(rumbeeId, clerkUserId, deps = {}) {
  const checkAccess = deps.checkAccess || rumbeeClient.checkAccess;
  const verify = deps.verifyAccessToken || verifyAccessToken;

  const cached = await getEntry(clerkUserId);
  if (cached) {
    try {
      const claims = await verify(cached.token, env.RUMBEE_LOGIN_BASE_URL);
      return { allowed: true, claims };
    } catch {
      await evict(clerkUserId);
    }
  }

  const result = await checkAccess(rumbeeId, clerkUserId);
  if (!result.allowed) {
    return { allowed: false };
  }

  await setEntry(clerkUserId, { token: result.token });
  const claims = await verify(result.token, env.RUMBEE_LOGIN_BASE_URL);
  return { allowed: true, claims };
}

module.exports = { getAccess, evict };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test server/rumbee/access-cache.test.js`
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add server/rumbee/access-cache.js server/rumbee/access-cache.test.js
git commit -m "feat: add access-check cache with local JWKS re-verification"
```

---

## Task 5: Express ↔ Fetch adapter for the webhook route

The vendored `handleCallback` (Task 1) speaks the Fetch `Request`/`Response` API; this app is plain Express. `express.json()` already runs globally (`server/server.js:41`) before any route, so `req.body` is already the parsed object by the time it reaches this adapter — the raw body stream is gone, so the `Request` is built by re-serializing `req.body`, not by piping the original stream.

**Files:**
- Create: `server/rumbee/fetch-adapter.js`
- Create: `server/rumbee/fetch-adapter.test.js`

**Interfaces:**
- Produces: `toFetchRequest(req): Request`, `writeFetchResponse(fetchResponse: Response, res): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `server/rumbee/fetch-adapter.test.js`:

```js
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { toFetchRequest, writeFetchResponse } = require("./fetch-adapter");

test("toFetchRequest carries method, secret header, and re-serialized JSON body", async () => {
  const req = {
    method: "POST",
    originalUrl: "/api/webhooks/rumbee-login",
    get: (name) => (name === "X-Rumbee-Callback-Secret" ? "s3cr3t" : undefined),
    body: { event: "ping" },
  };

  const fetchRequest = toFetchRequest(req);

  assert.equal(fetchRequest.method, "POST");
  assert.equal(fetchRequest.headers.get("X-Rumbee-Callback-Secret"), "s3cr3t");
  assert.deepEqual(await fetchRequest.json(), { event: "ping" });
});

test("toFetchRequest sends an empty secret header when none was sent", async () => {
  const req = {
    method: "POST",
    originalUrl: "/api/webhooks/rumbee-login",
    get: () => undefined,
    body: { event: "ping" },
  };

  const fetchRequest = toFetchRequest(req);

  assert.equal(fetchRequest.headers.get("X-Rumbee-Callback-Secret"), "");
});

test("writeFetchResponse copies status and body onto the Express response", async () => {
  const calls = { status: null, sent: null };
  const res = {
    status(code) {
      calls.status = code;
      return this;
    },
    send(body) {
      calls.sent = body;
    },
  };

  await writeFetchResponse(new Response(null, { status: 401 }), res);

  assert.equal(calls.status, 401);
  assert.equal(calls.sent, "");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test server/rumbee/fetch-adapter.test.js`
Expected: FAIL — `Cannot find module './fetch-adapter'`

- [ ] **Step 3: Write `server/rumbee/fetch-adapter.js`**

```js
function toFetchRequest(req) {
  return new Request(`http://internal${req.originalUrl}`, {
    method: req.method,
    headers: { "X-Rumbee-Callback-Secret": req.get("X-Rumbee-Callback-Secret") ?? "" },
    body: JSON.stringify(req.body),
  });
}

async function writeFetchResponse(fetchResponse, res) {
  const text = await fetchResponse.text();
  res.status(fetchResponse.status).send(text);
}

module.exports = { toFetchRequest, writeFetchResponse };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test server/rumbee/fetch-adapter.test.js`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add server/rumbee/fetch-adapter.js server/rumbee/fetch-adapter.test.js
git commit -m "feat: add Express-to-Fetch adapter for the RumBee webhook route"
```

---

## Task 6: Webhook route (`POST /api/webhooks/rumbee-login`)

Wires Tasks 1, 4 and 5 together. `account_suspended`/`account_reactivated` carry only `rumbeeId` (no user id), so those two handlers look up the one Kutt user with that `rumbee_id` and evict by *their* `clerk_user_id`. The other five event types carry a `userId` field directly — per `AI-AGENT.md`, `clerkUserId` is the only per-user identifier used throughout this integration, so `event.userId` is treated as that same id (documented inline since the SDK's own type names it differently).

**Files:**
- Create: `server/routes/webhook.routes.js`
- Modify: `server/routes/routes.js`

**Interfaces:**
- Consumes: `handleCallback` (Task 1), `toFetchRequest`/`writeFetchResponse` (Task 5), `evict` (Task 4), `query.user.find` (existing, `server/queries/user.queries.js`).

- [ ] **Step 1: Write `server/routes/webhook.routes.js`**

```js
const { Router } = require("express");

const { handleCallback } = require("../vendor/rumbee-sdk/callback-handler");
const { toFetchRequest, writeFetchResponse } = require("../rumbee/fetch-adapter");
const asyncHandler = require("../utils/asyncHandler");
const accessCache = require("../rumbee/access-cache");
const query = require("../queries");
const env = require("../env");

const router = Router();

async function evictByRumbeeId(rumbeeId) {
  const user = await query.user.find({ rumbee_id: rumbeeId });
  if (user?.clerk_user_id) {
    await accessCache.evict(user.clerk_user_id);
  }
}

router.post(
  "/rumbee-login",
  asyncHandler(async function (req, res) {
    const fetchResponse = await handleCallback(
      toFetchRequest(req),
      env.RUMBEE_CALLBACK_SECRET,
      {
        onAccountSuspended: (event) => evictByRumbeeId(event.rumbeeId),
        onAccountReactivated: (event) => evictByRumbeeId(event.rumbeeId),
        onAccessRevoked: (event) => accessCache.evict(event.userId),
        onAccessGranted: (event) => accessCache.evict(event.userId),
        onUserBlocked: (event) => accessCache.evict(event.userId),
        onUserUnblocked: (event) => accessCache.evict(event.userId),
        onRoleChanged: (event) => accessCache.evict(event.userId),
      }
    );
    await writeFetchResponse(fetchResponse, res);
  })
);

module.exports = router;
```

- [ ] **Step 2: Mount it in `server/routes/routes.js`**

In `server/routes/routes.js`, add the require alongside the others:

```js
const webhooks = require("./webhook.routes");
```

And mount it alongside the other `apiRouter.use(...)` lines:

```js
apiRouter.use("/webhooks", webhooks);
```

- [ ] **Step 3: Manual smoke test (unauthenticated secret check — the only part testable without a real deployed callback target)**

Run: `RUMBEE_CALLBACK_SECRET=test-secret npm run dev`, then in another terminal:

```bash
curl -i -X POST http://localhost:3000/api/webhooks/rumbee-login \
  -H "X-Rumbee-Callback-Secret: wrong" \
  -H "Content-Type: application/json" \
  -d '{"event":"ping"}'
```

Expected: `HTTP/1.1 401`. Re-run with `-H "X-Rumbee-Callback-Secret: test-secret"` — expected `HTTP/1.1 200`.

- [ ] **Step 4: Commit**

```bash
git add server/routes/webhook.routes.js server/routes/routes.js
git commit -m "feat: add POST /api/webhooks/rumbee-login route"
```

---

## Task 7: `rumbeeLogin` entry handler + `rumbeeAccessGate` middleware

This is the auth-provisioning core (Task 2's columns, Task 3's client, the account-mapping decision from the spec) and the per-request gate (Task 4's cache). **Not** implemented as a Passport strategy: unlike OIDC, there's no external authorization-code redirect/callback exchange to model — the Clerk session is either already present on the shared `*.rumbee.ai` cookie or it isn't, checkable synchronously per request. Passport's `passport.authenticate(type, callback)` doesn't await an async callback (confirmed by reading `server/passport.js`/`server/handlers/auth.handler.js`'s existing `authenticate()` factory), which would make an async gate silently race past `next()` — a plain middleware avoids that hazard entirely.

**Files:**
- Modify: `server/handlers/auth.handler.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `query.user.find/create/update` (existing), `rumbeeClient.createAccount` (Task 3), `accessCache.getAccess` (Task 4), `utils.signToken/setToken/generateRandomPassword/getSiteURL` (existing, `server/utils/utils.js`).
- Produces: `auth.rumbeeLogin(req, res)`, `auth.jwtWithAccess` (array), `auth.jwtPageWithAccess` (array) — consumed by Tasks 8 and 9.

- [ ] **Step 1: Install `@clerk/backend`**

```bash
npm install @clerk/backend@^3.20.1
```

- [ ] **Step 2: Add the requires and Clerk client to the top of `server/handlers/auth.handler.js`**

After the existing `const env = require("../env");` line, add:

```js
const { createClerkClient } = require("@clerk/backend");

const asyncHandler = require("../utils/asyncHandler");
const accessCache = require("../rumbee/access-cache");
const rumbeeClient = require("../rumbee/client");

const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});
```

- [ ] **Step 3: Add `rumbeeLogin` and `rumbeeAccessGate` (and the composed arrays) after the existing `oidc` constant**

Right after the line `const oidc = authenticate("oidc", "Unauthorized", true, "page");`, add:

```js
async function authenticateClerkRequest(req) {
  const request = new Request(utils.getSiteURL() + req.originalUrl, {
    method: "GET",
    headers: new Headers(req.headers),
  });
  const requestState = await clerkClient.authenticateRequest(request);
  if (requestState.status !== "signed-in") return null;
  return requestState.toAuth();
}

async function rumbeeLogin(req, res) {
  const clerkAuth = await authenticateClerkRequest(req);

  if (!clerkAuth?.userId) {
    res.redirect(env.RUMBEE_LOGIN_BASE_URL);
    return;
  }

  const clerkUser = await clerkClient.users.getUser(clerkAuth.userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress;
  if (!email) {
    throw new CustomError("Your RumBee ID account has no verified e-mail address.", 400);
  }

  let user = await query.user.find({ email });

  if (!user) {
    user = await query.user.create({
      email,
      password: utils.generateRandomPassword(),
      verified: true,
    });
  }

  if (user.clerk_user_id !== clerkAuth.userId) {
    user = await query.user.update({ id: user.id }, { clerk_user_id: clerkAuth.userId });
  }

  if (!user.rumbee_id) {
    const rumbeeId = await rumbeeClient.createAccount({ email: user.email });
    user = await query.user.update({ id: user.id }, { rumbee_id: rumbeeId });
  }

  const token = utils.signToken(user);
  utils.setToken(res, token);
  res.redirect("/");
}

async function rumbeeAccessGate(req, res, next) {
  if (!req.user?.rumbee_id || !req.user?.clerk_user_id) return next();

  const result = await accessCache.getAccess(req.user.rumbee_id, req.user.clerk_user_id);
  if (result.allowed) return next();

  if (!req.isHTML) {
    res.status(403).json({ error: "You don't have access to this app." });
    return;
  }
  res.status(403).render("no_access", { title: "No access" });
}

const jwtWithAccess = [asyncHandler(jwt), asyncHandler(rumbeeAccessGate)];
const jwtPageWithAccess = [asyncHandler(jwtPage), asyncHandler(rumbeeAccessGate)];
```

- [ ] **Step 4: Export the new members**

In the `module.exports` block at the bottom of the file, add (keep the existing alphabetical-ish list, insert these near their related entries):

```js
  jwtPageWithAccess,
  jwtWithAccess,
  rumbeeAccessGate,
  rumbeeLogin,
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json server/handlers/auth.handler.js
git commit -m "feat: add RumBee ID login handler and access-gate middleware"
```

---

## Task 8: `/login/rumbee` route + "no access" page

Mirrors the existing `/login/oidc` route in `server/routes/renders.routes.js` exactly (same guard order: view-template-for-errors, feature flag, loose JWT pass-through, then the real handler) and reuses the `renders.notFound`-style status+render pattern for the new page.

**Files:**
- Modify: `server/routes/renders.routes.js`
- Create: `server/views/no_access.hbs`

**Interfaces:**
- Consumes: `auth.rumbeeLogin` (Task 7).

- [ ] **Step 1: Add the route to `server/routes/renders.routes.js`**

Right after the existing `/login/oidc` route block, add:

```js
router.get(
  "/login/rumbee",
  locals.viewTemplate("login"),
  auth.featureAccess([env.RUMBEE_ENABLED]),
  asyncHandler(auth.jwtLoosePage),
  asyncHandler(auth.rumbeeLogin)
);
```

- [ ] **Step 2: Create `server/views/no_access.hbs`**

Same shell as the sibling `server/views/banned.hbs` (`{{> header}}`/`{{> footer}}`, `.section-container`):

```hbs
{{> header}}
<section id="no-access" class="section-container">
  <h2>
    You don't have access to <span class="bold underline">{{site_name}}</span>.
  </h2>
  <h4>
    You're signed in with RumBee ID, but this account isn't set up for this app yet.
    Ask a RumBee ID admin to grant access, or
    <a href="/report" title="Send report">contact support</a>.
  </h4>
</section>
{{> footer}}
```

- [ ] **Step 3: Manual smoke test**

Run: `RUMBEE_ENABLED=true npm run dev`, visit `http://localhost:3000/login/rumbee` in a browser with no `*.rumbee.ai` Clerk session. Expected: redirected to `https://id.rumbee.ai`. (Full success-path testing — an actual signed-in Clerk session, a real `RUMBEE_API_KEY` account registration — is only meaningfully doable against the deployed Railway service; covered by Task 12's manual checklist.)

- [ ] **Step 4: Commit**

```bash
git add server/routes/renders.routes.js server/views/no_access.hbs
git commit -m "feat: add /login/rumbee route and no-access page"
```

---

## Task 9: Gate the render routes with `jwtPageWithAccess`/`jwtWithAccess`

Applies Task 7's composed middleware everywhere `renders.routes.js` currently uses strict `auth.jwtPage`/`auth.jwt` (the full pages and HTMX partial dialogs that require a logged-in user). Routes using `auth.jwtLoosePage` (homepage, login, 404, banned, report, etc.) are deliberately **not** touched — those intentionally allow anonymous/loose access today and RumBee access denial isn't relevant to them.

**Files:**
- Modify: `server/routes/renders.routes.js`

- [ ] **Step 1: Replace every strict-jwt usage in this file**

Using find-and-replace-all within `server/routes/renders.routes.js` only (do **not** touch `jwtLoosePage`/`jwtLoose`, which are different identifiers and won't match):

Replace every occurrence of:
```
asyncHandler(auth.jwtPage),
```
with:
```
...auth.jwtPageWithAccess,
```

Then replace every occurrence of:
```
asyncHandler(auth.jwt),
```
with:
```
...auth.jwtWithAccess,
```

This affects: `/settings`, `/admin`, `/stats` (jwtPage), and `/confirm-link-delete`, `/confirm-link-ban`, `/confirm-user-delete`, `/confirm-user-ban`, `/create-user`, `/add-domain`, `/confirm-domain-ban`, `/confirm-domain-delete-admin`, `/link/edit/:id`, `/admin/link/edit/:id`, `/add-domain-form`, `/confirm-domain-delete` (jwt).

- [ ] **Step 2: Verify the file still parses and the app boots**

Run: `node -c server/routes/renders.routes.js && npm run dev`
Expected: no syntax error, server logs `> Ready on http://localhost:3000`. Stop it with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/routes/renders.routes.js
git commit -m "feat: gate authenticated render routes on RumBee access"
```

---

## Task 10: Gate the API-style routes (`auth.routes.js`, `link.routes.js`, `domain.routes.js`, `user.routes.js`)

Same substitution as Task 9, across the remaining four route files. These are the routes a browser session hits via HTMX/JSON fetches for CRUD actions (creating/editing/deleting links, domains, users, changing password/e-mail) — without this task, a user whose RumBee access was just revoked could still perform those actions until their page-level session next redirected them, even though Task 9 already blocks the pages themselves. `asyncHandler(auth.apikey)` lines are untouched: an API-key caller never has `clerk_user_id` set, so `rumbeeAccessGate` already no-ops for them via its own guard (`if (!req.user?.clerk_user_id) return next()`) — API-key access is intentionally out of scope for this integration.

**Files:**
- Modify: `server/routes/auth.routes.js`
- Modify: `server/routes/link.routes.js`
- Modify: `server/routes/domain.routes.js`
- Modify: `server/routes/user.routes.js`

- [ ] **Step 1: `server/routes/auth.routes.js`**

Replace every occurrence of `asyncHandler(auth.jwt),` with `...auth.jwtWithAccess,`. Affects: `/change-password`, `/change-email`, `/apikey`.

- [ ] **Step 2: `server/routes/link.routes.js`**

Replace every occurrence of `asyncHandler(auth.jwt),` with `...auth.jwtWithAccess,`. Affects: `/`, `/admin` (GET), `POST /` (the `env.DISALLOW_ANONYMOUS_LINKS ? auth.jwt : auth.jwtLoose` ternary line — replace only the `auth.jwt` branch: `env.DISALLOW_ANONYMOUS_LINKS ? auth.jwt : auth.jwtLoose` has no `asyncHandler(...)` wrapper around it directly since the ternary itself is inside `asyncHandler(...)` — leave `POST /` as-is; it already goes through the same `authenticate()` factory as `auth.jwt`, and since `DISALLOW_ANONYMOUS_LINKS` is `true` in production per this app's `.example.env` default, this route is out of scope for this substitution pass — do not edit this line), `PATCH /:id`, `PATCH /admin/:id`, `DELETE /:id`, `POST /admin/ban/:id`, `GET /:id/stats`.

- [ ] **Step 3: `server/routes/domain.routes.js`**

Replace every occurrence of `asyncHandler(auth.jwt),` with `...auth.jwtWithAccess,`. Affects: `/admin` (GET), `POST /`, `POST /admin`, `DELETE /:id`, `DELETE /admin/:id`, `POST /admin/ban/:id`.

- [ ] **Step 4: `server/routes/user.routes.js`**

Replace every occurrence of `asyncHandler(auth.jwt),` with `...auth.jwtWithAccess,`. Affects: `/` (GET), `/admin` (GET), `POST /admin`, `POST /delete`, `DELETE /admin/:id`, `POST /admin/ban/:id`.

- [ ] **Step 5: Verify every touched file still parses and the app boots**

Run:
```bash
node -c server/routes/auth.routes.js && node -c server/routes/link.routes.js && node -c server/routes/domain.routes.js && node -c server/routes/user.routes.js && npm run dev
```
Expected: no syntax error, server logs `> Ready on http://localhost:3000`. Stop it with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add server/routes/auth.routes.js server/routes/link.routes.js server/routes/domain.routes.js server/routes/user.routes.js
git commit -m "feat: gate authenticated API routes on RumBee access"
```

---

## Task 11: Login button, launcher widget, `login_disabled` fix

`locals.handler.js`'s existing `login_disabled` computation (`env.DISALLOW_LOGIN_FORM && !env.OIDC_ENABLED`) doesn't know about RumBee yet — with `DISALLOW_LOGIN_FORM=true` and `OIDC_ENABLED=false` (this app doesn't use the generic OIDC feature), it would currently compute `true` and render the dead-end `login_disabled.hbs` partial instead of the RumBee button, even once RumBee is enabled. This task fixes that and adds the button + the optional app-launcher script tag.

**Files:**
- Modify: `server/handlers/locals.handler.js`
- Modify: `server/views/partials/auth/form.hbs`
- Modify: `server/views/layout.hbs`

- [ ] **Step 1: Fix `login_disabled` and add `rumbee_enabled` in `server/handlers/locals.handler.js`**

In the `config` function, replace:

```js
  res.locals.login_disabled = env.DISALLOW_LOGIN_FORM && !env.OIDC_ENABLED;
```

with:

```js
  res.locals.rumbee_enabled = env.RUMBEE_ENABLED;
  res.locals.login_disabled = env.DISALLOW_LOGIN_FORM && !env.OIDC_ENABLED && !env.RUMBEE_ENABLED;
```

- [ ] **Step 2: Add the RumBee button in `server/views/partials/auth/form.hbs`**

Right after the existing `{{#if oidc_enabled}}...{{/if}}` block (before the `{{#unless disallow_login_form}}` block that follows it), add:

```hbs
  {{#if rumbee_enabled}}
    <div class="buttons-wrapper">
      <a class="button primary full" href="/login/rumbee" title="Login with RumBee ID">
        <span>{{> icons/key}}</span>
        Login with RumBee ID
      </a>
    </div>
  {{/if}}
```

- [ ] **Step 3: Add the launcher widget script in `server/views/layout.hbs`**

Right before the closing `</body>` tag (after the existing `<script src="/scripts/main.js"></script>` line), add:

```hbs
  {{#if rumbee_enabled}}
    <script src="https://id.rumbee.ai/launcher.js" data-lang="pt" data-theme="dark"></script>
  {{/if}}
```

- [ ] **Step 4: Manual smoke test**

Run: `RUMBEE_ENABLED=true npm run dev`, visit `http://localhost:3000/login`. Expected: page shows a "Login with RumBee ID" button (local email/password form absent since `DISALLOW_LOGIN_FORM` is unset here — set `DISALLOW_LOGIN_FORM=true RUMBEE_ENABLED=true npm run dev` to see the exact production combination: only the RumBee button, no `login_disabled.hbs` dead end). View source, confirm the `id.rumbee.ai/launcher.js` script tag is present.

- [ ] **Step 5: Commit**

```bash
git add server/handlers/locals.handler.js server/views/partials/auth/form.hbs server/views/layout.hbs
git commit -m "feat: add RumBee ID login button and app launcher widget"
```

---

## Task 12: Deploy-time verification

Everything up to here is verifiable locally except the parts that require RumBee ID's backend to reach this app publicly (the callback round-trip) and a real Clerk session (the full login flow). This task is a checklist against the deployed Railway "Rumbee URL" service, run after every change to the integration — not just once.

**Files:** none (verification only).

- [ ] **Step 1: Get the two test-account values from the user**

Ask for `RUMBEE_VERIFY_TEST_RUMBEE_ID` and `RUMBEE_VERIFY_TEST_CLERK_USER_ID` (a `rumbeeId`/`clerkUserId` pair for a real test account) — these were flagged as missing back when the pasted setup runbook was first reviewed, and `verify.ts` requires both.

- [ ] **Step 2: Port `verify.ts` to plain Node and run it**

Create `server/vendor/rumbee-sdk/verify.js` (CommonJS port, same logic as upstream `verify.ts`, using `env.RUMBEE_LOGIN_BASE_URL` etc. — do not hand-invent new checks, port exactly):

```js
const LOGIN_BASE_URL = process.env.RUMBEE_LOGIN_BASE_URL ?? "https://id.rumbee.ai";
const API_KEY = process.env.RUMBEE_API_KEY;
const TEST_RUMBEE_ID = process.env.RUMBEE_VERIFY_TEST_RUMBEE_ID;
const TEST_CLERK_USER_ID = process.env.RUMBEE_VERIFY_TEST_CLERK_USER_ID;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function checkApiKey() {
  const response = await fetch(new URL("/api/v1/access-checks", LOGIN_BASE_URL), {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rumbeeId: TEST_RUMBEE_ID, clerkUserId: TEST_CLERK_USER_ID }),
  });
  if (response.status === 401) {
    console.error("  API key rejected — check RUMBEE_API_KEY.");
    return false;
  }
  if (!response.ok) {
    console.error(`  Unexpected status ${response.status} from /api/v1/access-checks.`);
    return false;
  }
  return true;
}

async function checkJwks() {
  const response = await fetch(new URL("/.well-known/jwks.json", LOGIN_BASE_URL));
  if (!response.ok) return false;
  const body = await response.json();
  return Array.isArray(body.keys) && body.keys.length > 0;
}

async function checkCallback() {
  const response = await fetch(new URL("/api/v1/callbacks/ping", LOGIN_BASE_URL), {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return response.ok;
}

async function main() {
  requireEnv("RUMBEE_API_KEY", API_KEY);
  requireEnv("RUMBEE_VERIFY_TEST_RUMBEE_ID", TEST_RUMBEE_ID);
  requireEnv("RUMBEE_VERIFY_TEST_CLERK_USER_ID", TEST_CLERK_USER_ID);

  const checks = [
    ["API key (id. -> satellite auth)", checkApiKey],
    ["JWKS reachable", checkJwks],
    ["Callback round-trip (id. -> your callback_base_url)", checkCallback],
  ];

  let allPassed = true;
  for (const [label, check] of checks) {
    const passed = await check();
    console.log(`${passed ? "PASS" : "FAIL"} — ${label}`);
    if (!passed) allPassed = false;
  }

  process.exit(allPassed ? 0 : 1);
}

main();
```

Add to `package.json` `"scripts"`:
```json
    "verify:rumbee": "node server/vendor/rumbee-sdk/verify.js",
```

Run (needs the real production `RUMBEE_API_KEY` from Railway, plus the two test values from Step 1 — get the API key value from the user or the Railway dashboard, never print it back in full):
```bash
RUMBEE_API_KEY=<from Railway> RUMBEE_VERIFY_TEST_RUMBEE_ID=<from step 1> RUMBEE_VERIFY_TEST_CLERK_USER_ID=<from step 1> npm run verify:rumbee
```
Expected: 3x `PASS`.

- [ ] **Step 3: Browser smoke test against `url.rumbee.ai`**

Before flipping `DISALLOW_LOGIN_FORM=true` in production, check whether any local
(password) `users` rows already exist there (`SELECT id, email FROM users LIMIT 5`
against the Railway Postgres) — per the spec's explicit scope decision, those accounts
lose their login path the moment local login is disabled, until they sign in once via
RumBee ID with the same e-mail. If any exist, tell the user before proceeding; this
plan does not build a migration path for them.

With `RUMBEE_ENABLED=true`, `DISALLOW_LOGIN_FORM=true`, `DISALLOW_REGISTRATION=true` set on the Railway service and deployed:
1. Sign out of everything on `*.rumbee.ai`, visit `https://url.rumbee.ai/login` — only the RumBee button shows.
2. Click it, sign in via `id.rumbee.ai` — land back on `url.rumbee.ai/` authenticated, a new `users` row exists with `rumbee_id` and `clerk_user_id` set.
3. Revisit any page — no extra `access-checks` call fires (cache hit; confirm via Railway logs or a quick DB/Redis peek, not guesswork).
4. Ask a RumBee ID admin to suspend the test account; within a few seconds, reload a page in the app — see the "No access" page, not a redirect loop.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json server/vendor/rumbee-sdk/verify.js
git commit -m "feat: add plain-Node verify:rumbee script"
```
