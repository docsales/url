const { test } = require("node:test");
const assert = require("node:assert/strict");

const { createPreProvisioner } = require("./pre-provision");

function fakeClient({ fail } = {}) {
  const calls = [];
  return {
    calls,
    async preProvisionUser(payload) {
      calls.push(payload);
      if (fail) throw new Error("RumBee user pre-provisioning failed: 422 {}");
      return { email: payload.email, status: "pending_provisioning" };
    },
  };
}

test("an admin created in url. is pre-provisioned on the shared account as admin", async () => {
  const client = fakeClient();
  const preProvision = createPreProvisioner({ preProvisionUser: client.preProvisionUser, accountId: "WCAR7" });

  await preProvision({ email: "ana@example.com", role: "ADMIN" });

  assert.deepEqual(client.calls, [{ email: "ana@example.com", rumbeeId: "WCAR7", role: "admin" }]);
});

test("a regular user is pre-provisioned with the lowercase user role", async () => {
  const client = fakeClient();
  const preProvision = createPreProvisioner({ preProvisionUser: client.preProvisionUser, accountId: "WCAR7" });

  await preProvision({ email: "bia@example.com", role: "USER" });

  assert.equal(client.calls[0].role, "user");
});

test("no role falls back to user, matching Kutt's own default", async () => {
  const client = fakeClient();
  const preProvision = createPreProvisioner({ preProvisionUser: client.preProvisionUser, accountId: "WCAR7" });

  await preProvision({ email: "caio@example.com" });

  assert.equal(client.calls[0].role, "user");
});

test("an id. failure surfaces as a 502 the admin dialog can show", async () => {
  const client = fakeClient({ fail: true });
  const preProvision = createPreProvisioner({ preProvisionUser: client.preProvisionUser, accountId: "WCAR7" });

  await assert.rejects(preProvision({ email: "dani@example.com", role: "USER" }), error => {
    assert.equal(error.statusCode, 502);
    assert.match(error.message, /RumBee ID/);
    return true;
  });
});
