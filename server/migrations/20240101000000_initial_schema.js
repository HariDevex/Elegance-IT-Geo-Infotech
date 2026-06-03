export async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name").notNullable();
    table.string("email").unique().notNullable();
    table.string("password").notNullable();
    table.string("role").notNullable().defaultTo("developer");
    table.string("employee_id").unique();
    table.date("dob");
    table.string("gender");
    table.string("marital_status");
    table.string("designation");
    table.string("department");
    table.decimal("salary", 12, 2);
    table.string("profile_image");
    table.string("avatar");
    table.string("attendance_status").defaultTo("Pending");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("attendance", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.date("date").notNullable();
    table.string("status").notNullable();
    table.timestamp("check_in_at");
    table.timestamp("check_out_at");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.unique(["user_id", "date"]);
  });

  await knex.schema.createTable("leaves", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("type").notNullable();
    table.date("from_date").notNullable();
    table.date("to_date").notNullable();
    table.text("description");
    table.string("status").defaultTo("Pending");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("announcements", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("title").notNullable();
    table.text("message").notNullable();
    table.text("audience_roles").defaultTo("all");
    table.text("audience_departments").defaultTo("{}");
    table.uuid("created_by").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("chat_messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("from_user").references("id").inTable("users").onDelete("CASCADE");
    table.uuid("to_user").references("id").inTable("users").onDelete("SET NULL");
    table.string("to_group");
    table.text("text").notNullable();
    table.timestamp("ts").defaultTo(knex.fn.now());
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("checkin_checkout", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.uuid("parent_id");
    table.string("type").notNullable();
    table.string("ip_address");
    table.text("location");
    table.text("note");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("login_logs", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.string("ip_address");
    table.text("user_agent");
    table.string("status");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("login_logs");
  await knex.schema.dropTableIfExists("checkin_checkout");
  await knex.schema.dropTableIfExists("chat_messages");
  await knex.schema.dropTableIfExists("announcements");
  await knex.schema.dropTableIfExists("leaves");
  await knex.schema.dropTableIfExists("attendance");
  await knex.schema.dropTableIfExists("users");
}
