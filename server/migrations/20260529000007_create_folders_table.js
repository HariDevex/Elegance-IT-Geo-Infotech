export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  const exists = await knex.schema.hasTable("folders");
  if (!exists) {
    await knex.schema.createTable("folders", (table) => {
      if (isSqlite) {
        table.string("id", 36).primary();
      } else {
        table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      }
      table.string("name").notNullable();
      table.uuid("parent_id").references("id").inTable("folders").onDelete("CASCADE");
      table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.index(["user_id", "parent_id"]);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("folders");
}
