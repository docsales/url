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
