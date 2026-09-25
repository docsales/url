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
