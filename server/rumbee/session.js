// The RumBee ID (Clerk) session is the source of truth for who is signed in.
// Kutt's own JWT cookie is only a cache of "which local user that session
// maps to", re-derived from Clerk on every authenticated request:
//
//   Clerk signed in   → make sure the Kutt cookie belongs to that user
//                       (auto sign-in after logging in on id. or any app)
//   Clerk signed out  → drop the Kutt cookie (logout on id. logs out here)
//   Clerk handshake   → forward the redirect so Clerk can sync its cookies
//   can't tell        → leave the Kutt cookie alone (e.g. an htmx request
//                       carrying an expired 60s session token — Clerk only
//                       handshakes full-page GETs; clerk-js on the page
//                       refreshes the token in the background)

const { forwardHandshake } = require("./handshake");

// Reasons that mean the browser has no RumBee session at all: no client_uat
// cookie on .rumbee.ai, or client_uat zeroed by a sign-out on id. or any
// other RumBee app.
const SIGNED_OUT_REASONS = new Set([
  "session-token-and-uat-missing",
  "session-token-but-no-client-uat",
]);

function classify(requestState) {
  if (requestState.status === "handshake") return { kind: "handshake" };
  if (requestState.status === "signed-in") {
    const userId = requestState.toAuth()?.userId;
    // no userId: a pending session (Clerk treats it as signed out)
    return userId ? { kind: "signed-in", clerkUserId: userId } : { kind: "signed-out" };
  }
  if (SIGNED_OUT_REASONS.has(requestState.reason)) return { kind: "signed-out" };
  return { kind: "unknown" };
}

function createSessionSync({
  authenticateRequest,
  findOrProvisionUser,
  signToken,
  setToken,
  deleteToken,
  verifyToken,
  ssoOnly,
}) {
  // Returns true when a response was already sent (handshake redirect).
  return async function syncSession(req, res) {
    const requestState = await authenticateRequest(req);

    if (forwardHandshake(requestState, res)) return true;

    // Clerk's contract: always apply requestState.headers (client_uat sync,
    // refreshed session cookie), whatever the status.
    for (const [key, value] of requestState.headers) {
      if (key.toLowerCase() !== "location") res.append(key, value);
    }

    const session = classify(requestState);
    const current = req.cookies?.token ? verifyToken(req.cookies.token) : null;

    if (session.kind === "signed-in") {
      const user = await findOrProvisionUser(session.clerkUserId);
      if (!current || current.sub !== user.id) {
        const token = signToken(user);
        setToken(res, token);
        req.cookies = { ...req.cookies, token };
      }
      res.locals.rumbee_signed_in = true;
      return false;
    }

    if (session.kind === "signed-out" && req.cookies?.token) {
      // a local-password session (login form still enabled) isn't ours to end
      if (ssoOnly || !current || current.via === "rumbee") {
        deleteToken(res);
        const { token, ...rest } = req.cookies;
        req.cookies = rest;
      }
    }

    return false;
  };
}

module.exports = { classify, createSessionSync };
