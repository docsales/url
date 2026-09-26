// Mirrors a user an admin creates in url.'s admin panel onto RumBee ID. Login
// here is RumBee ID only, so a user that exists solely in Kutt's database can
// never sign in: id. has to know about them (and invite them) first. The
// local row is linked to the Clerk user on their first sign-in (provision.js).

const { CustomError } = require("../utils");
const { toRumbeeRole } = require("./roles");

function createPreProvisioner({ preProvisionUser, accountId }) {
  return async function preProvision({ email, role }) {
    try {
      return await preProvisionUser({
        email,
        rumbeeId: accountId,
        role: toRumbeeRole(role),
      });
    } catch (error) {
      console.error(error);
      throw new CustomError("Could not create the user on RumBee ID. Try again.", 502);
    }
  };
}

module.exports = { createPreProvisioner };
