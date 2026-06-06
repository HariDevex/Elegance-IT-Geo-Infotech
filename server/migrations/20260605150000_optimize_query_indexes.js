export async function up(knex) {
  // Use knex.raw for CREATE INDEX IF NOT EXISTS to ensure compatibility and prevent failures if they partially exist
  
  // 1. Attendance: Double check basic indexing
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_opt_attendance_user_date ON attendance(user_id, date)");

  // 2. Check-in/Out: Compound index for session pairing logic
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_opt_checkin_user_date_type ON checkin_checkout(user_id, created_at, type)");

  // 3. Activity Logs: Highly granular index for admin searches
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_opt_activity_granular ON activity_logs(user_id, module, created_at)");

  // 4. Login Sessions: Index for session validation and logout speed
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_opt_sessions_token ON login_sessions(token_hash)");
  
  // 5. Users: Ensure employee_id is indexed for the new resolver utility
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_opt_users_emp_id ON users(employee_id)");
}

export async function down(knex) {
  await knex.raw("DROP INDEX IF EXISTS idx_opt_attendance_user_date");
  await knex.raw("DROP INDEX IF EXISTS idx_opt_checkin_user_date_type");
  await knex.raw("DROP INDEX IF EXISTS idx_opt_activity_granular");
  await knex.raw("DROP INDEX IF EXISTS idx_opt_sessions_token");
  await knex.raw("DROP INDEX IF EXISTS idx_opt_users_emp_id");
}
