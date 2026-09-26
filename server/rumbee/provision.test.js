const { test } = require("node:test");
const assert = require("node:assert/strict");

const { createProvisioner } = require("./provision");

function fakeUsers(rows) {
  const calls = { created: [], updated: [] };
  let nextId = 100;
  const users = {
    async find(match) {
      return rows.find(row => Object.entries(match).every(([k, v]) => row[k] === v)) || null;
    },
    async create(params) {
      calls.created.push(params);
      const row = { id: nextId++, rumbee_id: null, clerk_user_id: null, ...params };
      rows.push(row);
      return row;
    },
    async update(match, update) {
      calls.updated.push({ match, update });
      const row = rows.find(r => r.id === match.id);
      Object.assign(row, update);
      return row;
    },
  };
  return { users, calls };
}

function clerkWith(email) {
  const calls = [];
  return {
    calls,
    async getUser(id) {
      calls.push(id);
      return { primaryEmailAddress: email ? { emailAddress: email } : null };
    },
  };
}

test("a user already linked to the Clerk id is returned without calling Clerk", async () => {
  const { users, calls } = fakeUsers([{ id: 1, email: "a@x.com", clerk_user_id: "user_1", rumbee_id: "ACC", verified: true }]);
  const clerk = clerkWith("a@x.com");
  const provision = createProvisioner({ users, getClerkUser: clerk.getUser, accountId: "ACC" });

  const user = await provision("user_1");

  assert.equal(user.id, 1);
  assert.deepEqual(clerk.calls, []);
  assert.deepEqual(calls.updated, []);
});

test("an existing local user is linked by e-mail on first SSO visit", async () => {
  const { users, calls } = fakeUsers([{ id: 1, email: "a@x.com", clerk_user_id: null, rumbee_id: null, verified: false }]);
  const clerk = clerkWith("a@x.com");
  const provision = createProvisioner({ users, getClerkUser: clerk.getUser, accountId: "ACC" });

  const user = await provision("user_1");

  assert.equal(user.id, 1);
  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.updated, [
    { match: { id: 1 }, update: { clerk_user_id: "user_1", rumbee_id: "ACC", verified: true } },
  ]);
});

test("a brand-new RumBee user gets a verified local account", async () => {
  const { users, calls } = fakeUsers([]);
  const clerk = clerkWith("new@x.com");
  const provision = createProvisioner({ users, getClerkUser: clerk.getUser, accountId: "ACC" });

  const user = await provision("user_9");

  assert.equal(calls.created.length, 1);
  assert.equal(calls.created[0].email, "new@x.com");
  assert.equal(calls.created[0].verified, true);
  assert.equal(typeof calls.created[0].password, "string");
  assert.equal(user.clerk_user_id, "user_9");
  assert.equal(user.rumbee_id, "ACC");
});

test("a linked user missing the RumBee account id gets it filled in", async () => {
  const { users, calls } = fakeUsers([{ id: 1, email: "a@x.com", clerk_user_id: "user_1", rumbee_id: null, verified: true }]);
  const provision = createProvisioner({ users, getClerkUser: clerkWith("a@x.com").getUser, accountId: "ACC" });

  const user = await provision("user_1");

  assert.equal(user.rumbee_id, "ACC");
  assert.deepEqual(calls.updated, [{ match: { id: 1 }, update: { rumbee_id: "ACC" } }]);
});

test("a Clerk user with no e-mail address is rejected", async () => {
  const { users } = fakeUsers([]);
  const provision = createProvisioner({ users, getClerkUser: clerkWith(null).getUser, accountId: "ACC" });

  await assert.rejects(() => provision("user_1"), /e-mail/);
});

test("losing a create race to a concurrent request reuses the row that won", async () => {
  const rows = [];
  const { users } = fakeUsers(rows);
  users.create = async () => {
    rows.push({ id: 5, email: "a@x.com", clerk_user_id: null, rumbee_id: null, verified: true });
    throw new Error("duplicate key value violates unique constraint");
  };
  const provision = createProvisioner({ users, getClerkUser: clerkWith("a@x.com").getUser, accountId: "ACC" });

  const user = await provision("user_1");

  assert.equal(user.id, 5);
  assert.equal(user.clerk_user_id, "user_1");
});
