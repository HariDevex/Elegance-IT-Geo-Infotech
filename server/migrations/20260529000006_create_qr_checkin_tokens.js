export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  const exists = await knex.schema.hasTable("qr_checkin_tokens");
  if (!exists) {
    await knex.schema.createTable("qr_checkin_tokens", (table) => {
      if (isSqlite) {
        table.string("id", 36).primary();
      } else {
        table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      }
      table.string("token").unique().notNullable();
      table.uuid("user_id").references("users.id").onDelete("CASCADE");
      table.boolean("used").defaultTo(false);
      table.uuid("used_by");
      table.timestamp("used_at");
      table.timestamp("expires_at").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("qr_checkin_tokens");
}
