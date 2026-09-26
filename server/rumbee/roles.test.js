const { test } = require("node:test");
const assert = require("node:assert/strict");

const { toRumbeeRole, createRoleSync } = require("./roles");

test("Kutt roles map to id.'s lowercase role keys, defaulting to user", () => {
  assert.equal(toRumbeeRole("ADMIN"), "admin");
  assert.equal(toRumbeeRole("USER"), "user");
  assert.equal(toRumbeeRole(undefined), "user");
});

function fakeUpdate() {
  const calls = [];
  return {
    calls,
    async updateUser(match, update) {
      calls.push({ match, update });
      return { id: match.id, email: "adrian@example.com", ...update };
    },
  };
}

test("a role promoted on id. is written to the local user", async () => {
  const db = fakeUpdate();
  const syncRole = createRoleSync({ updateUser: db.updateUser });

  const user = await syncRole({ id: 4, role: "USER" }, "admin");

  assert.deepEqual(db.calls, [{ match: { id: 4 }, update: { role: "ADMIN" } }]);
  assert.equal(user.role, "ADMIN");
});

test("a role demoted on id. is written to the local user", async () => {
  const db = fakeUpdate();
  const syncRole = createRoleSync({ updateUser: db.updateUser });

  const user = await syncRole({ id: 3, role: "ADMIN" }, "user");

  assert.equal(user.role, "USER");
});

test("a role that already matches touches nothing", async () => {
  const db = fakeUpdate();
  const syncRole = createRoleSync({ updateUser: db.updateUser });
  const local = { id: 3, role: "ADMIN" };

  const user = await syncRole(local, "admin");

  assert.equal(db.calls.length, 0);
  assert.equal(user, local);
});

test("an unknown or missing role key from id. leaves the local role alone", async () => {
  const db = fakeUpdate();
  const syncRole = createRoleSync({ updateUser: db.updateUser });
  const local = { id: 3, role: "ADMIN" };

  assert.equal(await syncRole(local, "owner"), local);
  assert.equal(await syncRole(local, undefined), local);
  assert.equal(db.calls.length, 0);
});
