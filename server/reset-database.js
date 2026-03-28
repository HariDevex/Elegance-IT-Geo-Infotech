import db from './config/database.js';

const BCRYPT_HASHES = {
  root: '$2a$12$8JiE36Px34K7nznPkpSBguClSXoggNlPMsQyBmKTqYjPli5mFzNrW',
  admin: '$2a$12$tPv1wwb6YB8t7AvwMZzDC.Fk4luORxQHn9c0hm23GyC7dsHoY5iNW',
  manager: '$2a$12$Jin7mLVoOpxJ7aXqlfCXyuV14kMCrB89QEFyMMZ9amF.xnPVAqRLu',
  hr: '$2a$12$Z6JeZXzSzi7KwlDPukVhX.ryMtuNOeRTfM/pU6gNxvhffk06c34Lu',
  teamlead: '$2a$12$aDTRFQY4E3sWfLfiHhIUnOVyev6yEB4fgDsALT.vQm5HTF9NGeL5e',
  developer: '$2a$12$zQEmzSvac7B4IS51ApPQeOgFGA1R5FW9xMRihvPHMEEO32r7GePTK',
};

const USERS = [
  { email: 'mrnobody@elegance.com', name: 'Mr.Nobody', role: 'root', password: 'mrnobody009', employee_id: 'EJB2026001', department: 'IT', designation: 'Administrator' },
  { email: 'admin@elegance.com', name: 'Admin User', role: 'admin', password: 'admin123', employee_id: 'EJB2026002', department: 'Administration', designation: 'System Admin' },
  { email: 'manager@elegance.com', name: 'Manager User', role: 'manager', password: 'manager123', employee_id: 'EJB2026003', department: 'Management', designation: 'Department Manager' },
  { email: 'hr@elegance.com', name: 'HR User', role: 'hr', password: 'hr123456', employee_id: 'EJB2026004', department: 'Human Resources', designation: 'HR Specialist' },
  { email: 'teamlead@elegance.com', name: 'Team Lead', role: 'teamlead', password: 'teamlead123', employee_id: 'EJB2026005', department: 'Development', designation: 'Team Lead' },
  { email: 'developer@elegance.com', name: 'Developer User', role: 'developer', password: 'dev123456', employee_id: 'EJB2026006', department: 'Development', designation: 'Software Developer' },
];

async function resetDatabase() {
  console.log('🔄 Starting database reset...\n');
  
  try {
    console.log('📊 Truncating all tables except users...');
    
    const tables = [
      'chat_messages',
      'chat_groups',
      'notifications',
      'activity_logs',
      'leave_balances',
      'leaves',
      'attendance',
      'checkin_checkout',
      'holidays',
      'announcements',
      'documents',
      'login_logs',
      'login_attempts',
      'password_history',
      'user_preferences',
    ];
    
    for (const table of tables) {
      try {
        await db(table).del();
        console.log(`  ✅ Cleared: ${table}`);
      } catch (err) {
        if (err.message.includes('does not exist') || err.message.includes('no such table')) {
          console.log(`  ⚠️  Skipped: ${table} (does not exist)`);
        } else {
          console.log(`  ⚠️  Skipped: ${table} (${err.message.substring(0, 50)}...)`);
        }
      }
    }
    
    console.log('\n👥 Managing users...');
    
    await db('users').del();
    console.log('  ✅ Cleared all users');
    
    for (const user of USERS) {
      try {
        await db('users').insert({
          id: crypto.randomUUID(),
          name: user.name,
          email: user.email,
          password: BCRYPT_HASHES[user.role],
          role: user.role,
          employee_id: user.employee_id,
          department: user.department,
          designation: user.designation,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  ✅ Created ${user.role} user: ${user.email} (${user.employee_id})`);
      } catch (err) {
        console.log(`  ❌ Failed to create ${user.role}: ${err.message}`);
      }
    }
    
    console.log('\n📋 Final database state:');
    const users = await db('users').select('id', 'email', 'name', 'role', 'employee_id');
    console.table(users);
    
    console.log('\n📊 Table record counts:');
    for (const table of tables) {
      try {
        const result = await db(table).count('* as count').first();
        console.log(`   ${table}: ${result.count}`);
      } catch {
        console.log(`   ${table}: 0`);
      }
    }
    
    console.log('\n✅ Database reset complete!');
    console.log('\n🔑 Login credentials:');
    console.log('   ┌─────────────────────────┬────────────┬───────────────┬────────────────┐');
    console.log('   │ Role                    │ Email      │ Password      │ Employee ID    │');
    console.log('   ├─────────────────────────┼────────────┼───────────────┼────────────────┤');
    for (const user of USERS) {
      console.log(`   │ ${user.role.padEnd(22)} │ ${user.email.padEnd(10)} │ ${user.password.padEnd(12)} │ ${user.employee_id.padEnd(14)} │`);
    }
    console.log('   └─────────────────────────┴────────────┴───────────────┴────────────────┘');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error resetting database:', error.message);
    process.exit(1);
  }
}

resetDatabase();
