/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_department ON users (department);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance (user_id, date);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON leaves (user_id, status);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_leaves_from_date ON leaves (from_date);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip_address, created_at);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id, created_at);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_checkin_checkout_user ON checkin_checkout (user_id, created_at);
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_users_email_lower`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_users_role`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_users_department`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_attendance_user_date`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_attendance_date`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_leaves_user_status`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_leaves_from_date`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_login_attempts_ip`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_activity_logs_user`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_checkin_checkout_user`);
}
