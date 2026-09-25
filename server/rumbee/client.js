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
