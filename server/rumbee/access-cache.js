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
  try {
    const claims = await verify(result.token, env.RUMBEE_LOGIN_BASE_URL);
    return { allowed: true, claims };
  } catch {
    await evict(clerkUserId);
    return { allowed: false };
  }
}

module.exports = { getAccess, evict };
