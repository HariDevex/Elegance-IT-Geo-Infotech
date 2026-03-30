export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  
  await knex.schema.createTable("password_history", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.uuid("user_id");
    table.uuid("reset_by");
    table.string("password_hash", 255).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index("user_id");
  });
  
  if (!isSqlite) {
    await knex.raw('ALTER TABLE password_history ADD CONSTRAINT fk_password_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    await knex.raw('ALTER TABLE password_history ADD CONSTRAINT fk_password_history_reset_by FOREIGN KEY (reset_by) REFERENCES users(id) ON DELETE SET NULL');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("password_history");
}
