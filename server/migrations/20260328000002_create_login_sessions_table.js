export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  
  await knex.schema.createTable("login_sessions", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.uuid("user_id");
    table.string("token_hash", 500).notNullable();
    table.string("ip_address", 50);
    table.string("user_agent", 500);
    table.string("device_type", 50);
    table.string("location", 255);
    table.timestamp("login_at").defaultTo(knex.fn.now());
    table.timestamp("last_active_at").defaultTo(knex.fn.now());
    table.timestamp("expires_at").notNullable();
    table.boolean("is_active").defaultTo(true);
    table.boolean("remember_me").defaultTo(false);
    table.index("user_id");
  });
  
  if (!isSqlite) {
    await knex.raw('ALTER TABLE login_sessions ADD CONSTRAINT fk_login_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    await knex.raw('CREATE INDEX login_sessions_user_active ON login_sessions(user_id, is_active)');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("login_sessions");
}
