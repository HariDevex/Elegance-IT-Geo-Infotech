/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("token_blacklist", (table) => {
    table.increments("id").primary();
    table.string("token_hash").notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.timestamp("blacklisted_at").defaultTo(knex.fn.now());
    table.index("expires_at");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("token_blacklist");
}
