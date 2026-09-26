const { test } = require("node:test");
const assert = require("node:assert/strict");

const { classify, createSessionSync } = require("./session");

function signedIn(userId, headers = new Headers()) {
  return { status: "signed-in", headers, toAuth: () => ({ userId }) };
}

function signedOut(reason, headers = new Headers()) {
  return { status: "signed-out", reason, headers, toAuth: () => ({ userId: null }) };
}

function handshake(location) {
  const headers = new Headers();
  headers.set("location", location);
  headers.append("set-cookie", "__clerk_redirect_count=1; Path=/");
  return { status: "handshake", headers, toAuth: () => null };
}

function fakeRes() {
  const res = {
    appended: [],
    locals: {},
    redirected: null,
    tokenSet: null,
    tokenDeleted: false,
    append(key, value) {
      res.appended.push([key.toLowerCase(), value]);
    },
    redirect(status, url) {
      res.redirected = { status, url };
    },
  };
  return res;
}

function setup({ state, tokens = {}, ssoOnly = true, users = {} }) {
  const provisioned = [];
  const sync = createSessionSync({
    authenticateRequest: async () => state,
    findOrProvisionUser: async clerkUserId => {
      provisioned.push(clerkUserId);
      return users[clerkUserId];
    },
    signToken: user => `token-for-${user.id}`,
    setToken: (res, token) => {
      res.tokenSet = token;
    },
    deleteToken: res => {
      res.tokenDeleted = true;
    },
    verifyToken: token => tokens[token] ?? null,
    ssoOnly,
  });
  return { sync, provisioned };
}

test("classify: handshake", () => {
  assert.deepEqual(classify(handshake("https://clerk.rumbee.ai/v1/client/handshake")), { kind: "handshake" });
});

test("classify: signed-in with a user id", () => {
  assert.deepEqual(classify(signedIn("user_1")), { kind: "signed-in", clerkUserId: "user_1" });
});

test("classify: signed-in without a user id (pending session) is signed out", () => {
  assert.deepEqual(classify(signedIn(null)), { kind: "signed-out" });
});

test("classify: no client_uat and no session token is signed out", () => {
  assert.deepEqual(classify(signedOut("session-token-and-uat-missing")), { kind: "signed-out" });
});

test("classify: client_uat zeroed by a sign-out elsewhere is signed out", () => {
  assert.deepEqual(classify(signedOut("session-token-but-no-client-uat")), { kind: "signed-out" });
});

test("classify: an expired token on a non-document request is unknown, not signed out", () => {
  assert.deepEqual(classify(signedOut("session-token-expired")), { kind: "unknown" });
  assert.deepEqual(classify(signedOut("client-uat-but-no-session-token")), { kind: "unknown" });
});

test("handshake is forwarded as a redirect and ends the request", async () => {
  const { sync, provisioned } = setup({ state: handshake("https://clerk.rumbee.ai/v1/client/handshake?x=1") });
  const req = { cookies: {} };
  const res = fakeRes();

  const handled = await sync(req, res);

  assert.equal(handled, true);
  assert.deepEqual(res.redirected, { status: 307, url: "https://clerk.rumbee.ai/v1/client/handshake?x=1" });
  assert.deepEqual(provisioned, []);
});

test("signed-in with no local session issues one for the Clerk user", async () => {
  const { sync, provisioned } = setup({
    state: signedIn("user_1"),
    users: { user_1: { id: 7 } },
  });
  const req = { cookies: {} };
  const res = fakeRes();

  const handled = await sync(req, res);

  assert.equal(handled, false);
  assert.deepEqual(provisioned, ["user_1"]);
  assert.equal(res.tokenSet, "token-for-7");
  assert.equal(req.cookies.token, "token-for-7");
  assert.equal(res.locals.rumbee_signed_in, true);
});

test("signed-in with a local session for the same user keeps it", async () => {
  const { sync } = setup({
    state: signedIn("user_1"),
    users: { user_1: { id: 7 } },
    tokens: { existing: { sub: 7 } },
  });
  const req = { cookies: { token: "existing" } };
  const res = fakeRes();

  await sync(req, res);

  assert.equal(res.tokenSet, null);
  assert.equal(req.cookies.token, "existing");
});

test("signed-in as someone else replaces the local session", async () => {
  const { sync } = setup({
    state: signedIn("user_2"),
    users: { user_2: { id: 9 } },
    tokens: { existing: { sub: 7 } },
  });
  const req = { cookies: { token: "existing" } };
  const res = fakeRes();

  await sync(req, res);

  assert.equal(res.tokenSet, "token-for-9");
  assert.equal(req.cookies.token, "token-for-9");
});

test("signed-in with an expired or invalid local token issues a fresh one", async () => {
  const { sync } = setup({
    state: signedIn("user_1"),
    users: { user_1: { id: 7 } },
  });
  const req = { cookies: { token: "expired" } };
  const res = fakeRes();

  await sync(req, res);

  assert.equal(res.tokenSet, "token-for-7");
});

test("Clerk housekeeping headers are applied on a signed-in request", async () => {
  const headers = new Headers();
  headers.append("set-cookie", "__session=abc; Path=/");
  const { sync } = setup({ state: signedIn("user_1", headers), users: { user_1: { id: 7 } } });
  const res = fakeRes();

  await sync({ cookies: {} }, res);

  assert.ok(res.appended.some(([k, v]) => k === "set-cookie" && v === "__session=abc; Path=/"));
});

test("signed out on id. drops the local session in SSO-only mode", async () => {
  const { sync, provisioned } = setup({
    state: signedOut("session-token-but-no-client-uat"),
    tokens: { existing: { sub: 7 } },
    ssoOnly: true,
  });
  const req = { cookies: { token: "existing" } };
  const res = fakeRes();

  const handled = await sync(req, res);

  assert.equal(handled, false);
  assert.equal(res.tokenDeleted, true);
  assert.equal(req.cookies.token, undefined);
  assert.deepEqual(provisioned, []);
});

test("signed out keeps a local-password session when the login form is still allowed", async () => {
  const { sync } = setup({
    state: signedOut("session-token-and-uat-missing"),
    tokens: { existing: { sub: 7 } },
    ssoOnly: false,
  });
  const req = { cookies: { token: "existing" } };
  const res = fakeRes();

  await sync(req, res);

  assert.equal(res.tokenDeleted, false);
  assert.equal(req.cookies.token, "existing");
});

test("signed out drops an SSO-issued session even when the login form is allowed", async () => {
  const { sync } = setup({
    state: signedOut("session-token-and-uat-missing"),
    tokens: { existing: { sub: 7, via: "rumbee" } },
    ssoOnly: false,
  });
  const req = { cookies: { token: "existing" } };
  const res = fakeRes();

  await sync(req, res);

  assert.equal(res.tokenDeleted, true);
  assert.equal(req.cookies.token, undefined);
});

test("unknown state (expired Clerk token on an XHR) keeps the local session untouched", async () => {
  const { sync, provisioned } = setup({
    state: signedOut("session-token-expired"),
    tokens: { existing: { sub: 7 } },
  });
  const req = { cookies: { token: "existing" } };
  const res = fakeRes();

  const handled = await sync(req, res);

  assert.equal(handled, false);
  assert.equal(res.tokenDeleted, false);
  assert.equal(res.tokenSet, null);
  assert.equal(req.cookies.token, "existing");
  assert.deepEqual(provisioned, []);
});
