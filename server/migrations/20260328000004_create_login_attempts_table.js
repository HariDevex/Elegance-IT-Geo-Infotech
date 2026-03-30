export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  
  await knex.schema.createTable("login_attempts", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.string("email", 255);
    table.string("ip_address", 50).notNullable();
    table.string("user_agent", 500);
    table.string("attempt_type", 20).defaultTo("password");
    table.boolean("success").defaultTo(false);
    table.string("failure_reason", 100);
    table.string("location", 255);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index("email");
    table.index("ip_address");
    table.index("created_at");
  });
  
  if (!isSqlite) {
    await knex.raw('CREATE INDEX login_attempts_email_created ON login_attempts(email, created_at)');
    await knex.raw('CREATE INDEX login_attempts_ip_created ON login_attempts(ip_address, created_at)');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("login_attempts");
}
