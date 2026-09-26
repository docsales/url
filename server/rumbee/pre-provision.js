// Mirrors a user an admin creates in url.'s admin panel onto RumBee ID. Login
// here is RumBee ID only, so a user that exists solely in Kutt's database can
// never sign in: id. has to know about them (and invite them) first. The
// local row is linked to the Clerk user on their first sign-in (provision.js).

const { CustomError } = require("../utils");

// id.'s role_key vocabulary for the "url" product (GET /api/v1/roles):
// lowercase — "Admin" is the display label and id. rejects it with a 422.
const ROLE_KEYS = { ADMIN: "admin", USER: "user" };

function createPreProvisioner({ preProvisionUser, accountId }) {
  return async function preProvision({ email, role }) {
    try {
      return await preProvisionUser({
        email,
        rumbeeId: accountId,
        role: ROLE_KEYS[role] ?? ROLE_KEYS.USER,
      });
    } catch (error) {
      console.error(error);
      throw new CustomError("Could not create the user on RumBee ID. Try again.", 502);
    }
  };
}

module.exports = { createPreProvisioner };
