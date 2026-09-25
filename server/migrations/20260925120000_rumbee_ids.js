/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
  const hasRumbeeId = await knex.schema.hasColumn("users", "rumbee_id");
  const hasClerkUserId = await knex.schema.hasColumn("users", "clerk_user_id");
  if (hasRumbeeId && hasClerkUserId) return;

  await knex.schema.alterTable("users", table => {
    if (!hasRumbeeId) table.string("rumbee_id");
    if (!hasClerkUserId) table.string("clerk_user_id").index();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {}

module.exports = {
  up,
  down,
}
