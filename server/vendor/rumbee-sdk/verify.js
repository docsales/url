// Vendored (CommonJS port) from docsales/rumbee-app-sdk verify.ts.
// Logic must stay identical to upstream — re-port by hand if upstream changes.
const LOGIN_BASE_URL = process.env.RUMBEE_LOGIN_BASE_URL ?? "https://id.rumbee.ai";
const API_KEY = process.env.RUMBEE_API_KEY;
const TEST_RUMBEE_ID = process.env.RUMBEE_VERIFY_TEST_RUMBEE_ID;
const TEST_CLERK_USER_ID = process.env.RUMBEE_VERIFY_TEST_CLERK_USER_ID;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function checkApiKey() {
  const response = await fetch(new URL("/api/v1/access-checks", LOGIN_BASE_URL), {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rumbeeId: TEST_RUMBEE_ID, clerkUserId: TEST_CLERK_USER_ID }),
  });
  if (response.status === 401) {
    console.error("  API key rejected — check RUMBEE_API_KEY.");
    return false;
  }
  if (!response.ok) {
    console.error(`  Unexpected status ${response.status} from /api/v1/access-checks.`);
    return false;
  }
  return true;
}

async function checkJwks() {
  const response = await fetch(new URL("/.well-known/jwks.json", LOGIN_BASE_URL));
  if (!response.ok) return false;
  const body = await response.json();
  return Array.isArray(body.keys) && body.keys.length > 0;
}

async function checkCallback() {
  const response = await fetch(new URL("/api/v1/callbacks/ping", LOGIN_BASE_URL), {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return response.ok;
}

async function main() {
  requireEnv("RUMBEE_API_KEY", API_KEY);
  requireEnv("RUMBEE_VERIFY_TEST_RUMBEE_ID", TEST_RUMBEE_ID);
  requireEnv("RUMBEE_VERIFY_TEST_CLERK_USER_ID", TEST_CLERK_USER_ID);

  const checks = [
    ["API key (id. -> satellite auth)", checkApiKey],
    ["JWKS reachable", checkJwks],
    ["Callback round-trip (id. -> your callback_base_url)", checkCallback],
  ];

  let allPassed = true;
  for (const [label, check] of checks) {
    const passed = await check();
    console.log(`${passed ? "PASS" : "FAIL"} — ${label}`);
    if (!passed) allPassed = false;
  }

  process.exit(allPassed ? 0 : 1);
}

main();
