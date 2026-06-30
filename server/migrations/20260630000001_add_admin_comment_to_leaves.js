export async function up(knex) {
  await knex.schema.alterTable("leaves", (table) => {
    table.text("admin_comment");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("leaves", (table) => {
    table.dropColumn("admin_comment");
  });
}
