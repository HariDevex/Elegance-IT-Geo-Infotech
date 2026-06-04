export async function up(knex) {
  await knex.schema.createTable("chat_reactions", (table) => {
    table.uuid("id").primary();
    table
      .uuid("message_id")
      .references("id")
      .inTable("chat_messages")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("reaction").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.unique(["message_id", "user_id", "reaction"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("chat_reactions");
}
