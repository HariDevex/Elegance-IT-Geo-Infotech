/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  await knex.schema.createTable("chat_groups", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.string("name").notNullable();
    table.text("description");
    table.uuid("created_by").references("id").inTable("users").onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("chat_groups");
}
