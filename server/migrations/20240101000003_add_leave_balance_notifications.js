/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';

  await knex.schema.createTable("leave_balances", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("leave_type").notNullable();
    table.integer("total_days").notNullable().defaultTo(0);
    table.integer("used_days").notNullable().defaultTo(0);
    table.integer("pending_days").notNullable().defaultTo(0);
    table.integer("year").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.unique(["user_id", "leave_type", "year"]);
  });

  await knex.schema.createTable("notifications", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("title").notNullable();
    table.text("message").notNullable();
    table.string("type").defaultTo("info");
    table.boolean("is_read").defaultTo(false);
    table.string("link");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("holidays", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.string("name").notNullable();
    table.date("date").notNullable();
    table.string("type").defaultTo("public");
    table.text("description");
    table.integer("year").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("documents", (table) => {
    if (isSqlite) {
      table.string("id", 36).primary();
    } else {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    }
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("name").notNullable();
    table.string("type").notNullable();
    table.string("file_url").notNullable();
    table.text("description");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("documents");
  await knex.schema.dropTableIfExists("holidays");
  await knex.schema.dropTableIfExists("notifications");
  await knex.schema.dropTableIfExists("leave_balances");
}
