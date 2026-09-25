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
