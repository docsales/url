// Maps a Clerk user (RumBee ID) to its local Kutt user, creating or linking
// the row on first sight. Looked up by clerk_user_id first — the only call
// to Clerk's Backend API is the one-time e-mail lookup for a user this app
// has never seen.

const { randomBytes } = require("node:crypto");

function createProvisioner({ users, getClerkUser, accountId }) {
  async function linkByEmail(clerkUserId) {
    const clerkUser = await getClerkUser(clerkUserId);
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) {
      const error = new Error("Your RumBee ID account has no verified e-mail address.");
      error.statusCode = 400;
      throw error;
    }

    let user = await users.find({ email });
    if (!user) {
      try {
        user = await users.create({
          email,
          // never used: RumBee ID is the only way in
          password: randomBytes(32).toString("base64url"),
          verified: true,
        });
      } catch (error) {
        // a concurrent first request for the same person already created it
        user = await users.find({ email });
        if (!user) throw error;
      }
    }
    return user;
  }

  return async function findOrProvisionUser(clerkUserId) {
    let user = await users.find({ clerk_user_id: clerkUserId });
    if (!user) user = await linkByEmail(clerkUserId);

    const updates = {};
    if (user.clerk_user_id !== clerkUserId) updates.clerk_user_id = clerkUserId;
    if (!user.rumbee_id) updates.rumbee_id = accountId;
    // Clerk only signs people in with a verified e-mail address
    if (!user.verified) updates.verified = true;

    if (Object.keys(updates).length > 0) {
      user = await users.update({ id: user.id }, updates);
    }
    return user;
  };
}

module.exports = { createProvisioner };
