const { test } = require("node:test");
const assert = require("node:assert/strict");

const { createAccessRevoker } = require("./revoke");

function fakes({ fail } = {}) {
  const calls = { revoked: [], evicted: [] };
  return {
    calls,
    async revokeAccess(payload) {
      calls.revoked.push(payload);
      if (fail) throw new Error("RumBee access revocation failed: 500 {}");
      return { email: payload.email, status: "revoked" };
    },
    async evict(clerkUserId) {
      calls.evicted.push(clerkUserId);
    },
  };
}

test("deleting a user revokes their url. access on the shared account", async () => {
  const f = fakes();
  const revoke = createAccessRevoker({ revokeAccess: f.revokeAccess, evict: f.evict, accountId: "WCAR7" });

  await revoke({ email: "adrian@example.com", clerk_user_id: "user_1" });

  assert.deepEqual(f.calls.revoked, [{ email: "adrian@example.com", rumbeeId: "WCAR7" }]);
});

test("a signed-in user's cached access token is dropped so the revocation applies now", async () => {
  const f = fakes();
  const revoke = createAccessRevoker({ revokeAccess: f.revokeAccess, evict: f.evict, accountId: "WCAR7" });

  await revoke({ email: "adrian@example.com", clerk_user_id: "user_1" });

  assert.deepEqual(f.calls.evicted, ["user_1"]);
});

test("a user who never signed in has no cached token to drop", async () => {
  const f = fakes();
  const revoke = createAccessRevoker({ revokeAccess: f.revokeAccess, evict: f.evict, accountId: "WCAR7" });

  await revoke({ email: "adrian@example.com", clerk_user_id: null });

  assert.equal(f.calls.revoked.length, 1);
  assert.deepEqual(f.calls.evicted, []);
});

test("an id. failure surfaces as a 502 and leaves the cache alone", async () => {
  const f = fakes({ fail: true });
  const revoke = createAccessRevoker({ revokeAccess: f.revokeAccess, evict: f.evict, accountId: "WCAR7" });

  await assert.rejects(revoke({ email: "adrian@example.com", clerk_user_id: "user_1" }), error => {
    assert.equal(error.statusCode, 502);
    assert.match(error.message, /RumBee ID/);
    return true;
  });
  assert.deepEqual(f.calls.evicted, []);
});
