// Vendored (CommonJS port) from docsales/rumbee-app-sdk lib/callback-handler.ts.
// Logic must stay identical to upstream — re-port by hand if upstream changes.
const { timingSafeEqual } = require("node:crypto");

async function handleCallback(request, callbackSecret, handlers) {
  const receivedSecret = request.headers.get("X-Rumbee-Callback-Secret") ?? "";
  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(callbackSecret);
  const isValid = received.length === expected.length && timingSafeEqual(received, expected);
  if (!isValid) {
    return new Response(null, { status: 401 });
  }

  const body = await request.json();

  switch (body.event) {
    case "ping":
      break;
    case "account_suspended":
      await handlers.onAccountSuspended?.(body);
      break;
    case "access_revoked":
      await handlers.onAccessRevoked?.(body);
      break;
    case "user_blocked":
      await handlers.onUserBlocked?.(body);
      break;
    case "user_unblocked":
      await handlers.onUserUnblocked?.(body);
      break;
    case "access_granted":
      await handlers.onAccessGranted?.(body);
      break;
    case "account_reactivated":
      await handlers.onAccountReactivated?.(body);
      break;
    case "role_changed":
      await handlers.onRoleChanged?.(body);
      break;
  }

  return new Response(null, { status: 200 });
}

module.exports = { handleCallback };
