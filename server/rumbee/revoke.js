// Mirrors deleting a user in url. onto RumBee ID: revokes their access to the
// "url" product on id. (only this product — their RumBee ID account and other
// apps are untouched). Without it the person keeps a valid access on id. and
// their next sign-in simply re-provisions the local row (provision.js).

const { CustomError } = require("../utils");

function createAccessRevoker({ revokeAccess, evict, accountId }) {
  return async function revoke(user) {
    try {
      await revokeAccess({ email: user.email, rumbeeId: accountId });
    } catch (error) {
      console.error(error);
      throw new CustomError("Could not revoke the user's access on RumBee ID. Try again.", 502);
    }
    // id. sends no callback for a revocation the satellite made itself, and a
    // cached access token would keep a signed-in session working for hours
    if (user.clerk_user_id) {
      await evict(user.clerk_user_id);
    }
  };
}

module.exports = { createAccessRevoker };
