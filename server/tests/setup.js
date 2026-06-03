import { beforeAll, afterAll } from 'vitest';
import db from '../config/database.js';

beforeAll(async () => {
  // Ensure we are in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must be run with NODE_ENV=test');
  }

  // Run migrations
  await db.migrate.latest();

  // Clear all tables for isolation
  const tables = [
    'chat_messages', 
    'announcements', 
    'leaves', 
    'leave_balances', 
    'attendance', 
    'users',
    'checkin_checkout',
    'login_logs',
    'notifications',
    'holidays',
    'documents',
    'activity_logs'
  ];
  for (const table of tables) {
    try {
      await db(table).del();
    } catch (e) {
      // Ignore if table doesn't exist yet
    }
  }
});

afterAll(async () => {
  await db.destroy();
});
