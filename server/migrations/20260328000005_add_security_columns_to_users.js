export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  
  await knex.schema.alterTable("users", (table) => {
    table.timestamp("last_login_at").nullable();
    table.integer("login_count").defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.boolean("must_change_password").defaultTo(false);
    table.timestamp("password_expires_at").nullable();
    table.string("preferred_language", 10).defaultTo("en");
    table.integer("failed_attempts").defaultTo(0);
    table.timestamp("locked_until").nullable();
    table.string("secret_question", 500).nullable();
    table.string("secret_answer_hash", 255).nullable();
    if (isSqlite) {
      table.text("login_security").nullable();
    } else {
      table.jsonb("login_security").nullable();
    }
  });
}

export async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("last_login_at");
    table.dropColumn("login_count");
    table.dropColumn("is_active");
    table.dropColumn("must_change_password");
    table.dropColumn("password_expires_at");
    table.dropColumn("preferred_language");
    table.dropColumn("failed_attempts");
    table.dropColumn("locked_until");
    table.dropColumn("secret_question");
    table.dropColumn("secret_answer_hash");
    table.dropColumn("login_security");
  });
}
