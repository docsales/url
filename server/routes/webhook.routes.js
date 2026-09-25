const { Router } = require("express");

const { handleCallback } = require("../vendor/rumbee-sdk/callback-handler");
const { toFetchRequest, writeFetchResponse } = require("../rumbee/fetch-adapter");
const asyncHandler = require("../utils/asyncHandler");
const accessCache = require("../rumbee/access-cache");
const query = require("../queries");
const env = require("../env");

const router = Router();

async function evictByRumbeeId(rumbeeId) {
  const user = await query.user.find({ rumbee_id: rumbeeId });
  if (user?.clerk_user_id) {
    await accessCache.evict(user.clerk_user_id);
  }
}

router.post(
  "/rumbee-login",
  asyncHandler(async function (req, res) {
    // An empty/unset RUMBEE_CALLBACK_SECRET (env.js's default when it's not
    // configured) must never be treated as "no secret required." Without this
    // guard, a caller that also sends no X-Rumbee-Callback-Secret header would
    // pass handleCallback's timingSafeEqual check (0-length buffer == 0-length
    // buffer), silently accepting unauthenticated webhook events. Reject before
    // handleCallback ever runs so an unconfigured secret can't be trivially
    // satisfied by an equally-empty/missing header.
    if (!env.RUMBEE_CALLBACK_SECRET) {
      res.status(401).end();
      return;
    }

    const fetchResponse = await handleCallback(
      toFetchRequest(req),
      env.RUMBEE_CALLBACK_SECRET,
      {
        onAccountSuspended: (event) => evictByRumbeeId(event.rumbeeId),
        onAccountReactivated: (event) => evictByRumbeeId(event.rumbeeId),
        // event.userId here is the same clerkUserId used everywhere else in this
        // integration — the vendored SDK's TypeScript types just name this field
        // differently in this webhook-event context.
        onAccessRevoked: (event) => accessCache.evict(event.userId),
        onAccessGranted: (event) => accessCache.evict(event.userId),
        onUserBlocked: (event) => accessCache.evict(event.userId),
        onUserUnblocked: (event) => accessCache.evict(event.userId),
        onRoleChanged: (event) => accessCache.evict(event.userId),
      }
    );
    await writeFetchResponse(fetchResponse, res);
  })
);

module.exports = router;
