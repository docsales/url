// One-off: pre-provision the 2 "url" operators on id.rumbee.ai (idempotent —
// safe to re-run). Run against the real service env:
//   railway run --service "Rumbee URL" -- node server/rumbee/provision-operators.js

const rumbeeClient = require("./client");

const OPERATORS = [
  { email: "mk@rumbee.ai", role: "admin" },
  { email: "dev@docsales.com", role: "admin" },
];

async function main() {
  for (const { email, role } of OPERATORS) {
    const result = await rumbeeClient.preProvisionUser({
      email,
      rumbeeId: rumbeeClient.ACCOUNT_ID,
      role,
    });
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
