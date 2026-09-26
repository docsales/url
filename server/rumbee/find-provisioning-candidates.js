// One-off read-only lookup: local Kutt users not yet migrated to RumBee ID
// (no rumbee_id/clerk_user_id yet). Run against the real service env, e.g.:
//   railway run --service "Rumbee URL" -- node server/rumbee/find-provisioning-candidates.js
// Reuses server/knex.js's own connection config — never touches DATABASE_URL directly.

const db = require("../knex");

async function main() {
  const rows = await db("users")
    .select("id", "email", "role", "rumbee_id", "clerk_user_id", "created_at")
    .whereNull("rumbee_id")
    .orderBy("id");

  console.log(JSON.stringify(rows, null, 2));
  console.log(`\n${rows.length} user(s) with no rumbee_id yet.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
