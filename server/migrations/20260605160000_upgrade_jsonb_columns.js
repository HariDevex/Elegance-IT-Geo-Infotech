export async function up(knex) {
  const isPostgres = knex.client.config.client === 'pg';

  if (isPostgres) {
    // 1. Upgrade announcements table
    await knex.schema.raw(`
      ALTER TABLE announcements 
      ALTER COLUMN audience_roles TYPE JSONB USING audience_roles::JSONB,
      ALTER COLUMN audience_departments TYPE JSONB USING audience_departments::JSONB
    `);

    // 2. Upgrade checkin_checkout table
    await knex.schema.raw(`
      ALTER TABLE checkin_checkout 
      ALTER COLUMN location TYPE JSONB USING location::JSONB
    `);

    // 3. Upgrade login_sessions table if it has JSON
    const hasSessions = await knex.schema.hasTable("login_sessions");
    if (hasSessions) {
      await knex.schema.raw(`
        ALTER TABLE login_sessions 
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB
      `);
    }
  }
}

export async function down(knex) {
  const isPostgres = knex.client.config.client === 'pg';

  if (isPostgres) {
    await knex.schema.raw(`
      ALTER TABLE announcements 
      ALTER COLUMN audience_roles TYPE TEXT USING audience_roles::TEXT,
      ALTER COLUMN audience_departments TYPE TEXT USING audience_departments::TEXT
    `);
    
    await knex.schema.raw(`
      ALTER TABLE checkin_checkout 
      ALTER COLUMN location TYPE TEXT USING location::TEXT
    `);
  }
}
