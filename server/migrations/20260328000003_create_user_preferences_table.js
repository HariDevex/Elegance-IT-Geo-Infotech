export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  
  await knex.schema.createTable("user_preferences", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.uuid("user_id").unique();
    table.string("theme", 20).defaultTo("dark");
    table.string("language", 10).defaultTo("en");
    table.string("timezone", 50).defaultTo("Asia/Kolkata");
    table.string("date_format", 20).defaultTo("DD/MM/YYYY");
    table.string("time_format", 10).defaultTo("12h");
    table.boolean("email_notifications").defaultTo(true);
    table.boolean("push_notifications").defaultTo(true);
    table.boolean("desktop_notifications").defaultTo(false);
    if (isSqlite) {
      table.text("dashboard_layout").defaultTo('{"showStats":true,"showCharts":true,"showCalendar":true}');
      table.text("quick_actions").defaultTo('[]');
    } else {
      table.jsonb("dashboard_layout").defaultTo('{"showStats":true,"showCharts":true,"showCalendar":true}');
      table.jsonb("quick_actions").defaultTo('[]');
    }
    table.string("sidebar_collapsed", 5).defaultTo("false");
    table.string("items_per_page", 10).defaultTo("25");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.index("user_id");
  });
  
  if (!isSqlite) {
    await knex.raw('ALTER TABLE user_preferences ADD CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("user_preferences");
}
