const env = require("../env");

// This deployment is single-tenant (one Kutt instance, one company) — every
// Kutt user shares this one RumBee account, not one rumbeeId per user.
const ACCOUNT_ID = "WCAR7";

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

async function preProvisionUser(payload) {
  const response = await fetch(new URL("/api/v1/users", env.RUMBEE_LOGIN_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RUMBEE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`RumBee user pre-provisioning failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function revokeAccess(payload) {
  const response = await fetch(new URL("/api/v1/access-revocations", env.RUMBEE_LOGIN_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RUMBEE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`RumBee access revocation failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

module.exports = { ACCOUNT_ID, checkAccess, preProvisionUser, revokeAccess };
