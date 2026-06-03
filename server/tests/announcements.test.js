import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

describe('Announcements API', () => {
  let adminToken, developerToken;
  const adminUser = {
    id: crypto.randomUUID(),
    name: 'Admin User',
    email: 'admin_ann@test.com',
    password: 'Password123!',
    role: 'admin',
    employee_id: 'A-ADM001'
  };
  const devUser = {
    id: crypto.randomUUID(),
    name: 'Dev User',
    email: 'dev_ann@test.com',
    password: 'Password123!',
    role: 'developer',
    employee_id: 'A-DEV001'
  };

  beforeAll(async () => {
    await db('announcements').del();
    await db('users').del();
    
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    const devHash = await bcrypt.hash(devUser.password, 10);

    await db('users').insert([
      { ...adminUser, password: adminHash },
      { ...devUser, password: devHash }
    ]);

    const adminLogin = await request(app).post('/api/auth/login').send({
      employee_id: adminUser.employee_id,
      password: adminUser.password
    });
    adminToken = adminLogin.body.token;

    const devLogin = await request(app).post('/api/auth/login').send({
      employee_id: devUser.employee_id,
      password: devUser.password
    });
    developerToken = devLogin.body.token;
  });

  describe('POST /api/announcements', () => {
    it('should allow admin to create announcement', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Global Update',
          message: 'This is a global announcement',
          audience_roles: 'all'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.announcement.title).toBe('Global Update');
    });

    it('should reject creation by developer', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          title: 'Unauthorized',
          message: 'Fail'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/announcements', () => {
    it('should allow developer to see relevant announcements', async () => {
      const res = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.announcements.length).toBeGreaterThan(0);
    });
  });
});
