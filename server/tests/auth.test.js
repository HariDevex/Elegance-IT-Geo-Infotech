import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';

describe('Auth API', () => {
  const testUser = {
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'Password123!',
    role: 'admin',
    employee_id: 'EMP001'
  };

  beforeAll(async () => {
    // Cleanup users before tests
    await db('users').del();
    
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db('users').insert({
      ...testUser,
      password: hashedPassword
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: testUser.employee_id,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: testUser.employee_id,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should fail with non-existent employee_id', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: 'NONEXISTENT',
          password: testUser.password
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return mustChangePassword true if flag is set in database', async () => {
      await db('users').where('employee_id', testUser.employee_id).update({
        must_change_password: true
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: testUser.employee_id,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.mustChangePassword).toBe(true);

      await db('users').where('employee_id', testUser.employee_id).update({
        must_change_password: false
      });
    });
  });

  describe('POST /api/auth/reset-user-password', () => {
    let rootToken;
    const devUser = {
      name: 'Dev User',
      email: 'dev@test.com',
      password: 'OldPassword123!',
      role: 'developer',
      employee_id: 'DEV001'
    };

    beforeAll(async () => {
      const rootPassword = await bcrypt.hash('RootPass123!', 10);
      await db('users').insert({
        name: 'Root Admin',
        email: 'root@test.com',
        password: rootPassword,
        role: 'root',
        employee_id: 'ROOT001'
      });

      const devPassword = await bcrypt.hash(devUser.password, 10);
      await db('users').insert({
        ...devUser,
        password: devPassword
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: 'ROOT001',
          password: 'RootPass123!'
        });
      rootToken = loginRes.body.token;
    });

    it('should set must_change_password to true when root resets password', async () => {
      const newPassword = 'NewPassword123!';
      const res = await request(app)
        .post('/api/auth/reset-user-password')
        .set('Authorization', `Bearer ${rootToken}`)
        .send({
          userId: devUser.employee_id,
          newPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await db('users').where('employee_id', devUser.employee_id).first();
      expect(!!user.must_change_password).toBe(true);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: devUser.employee_id,
          password: newPassword
        });
      
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.mustChangePassword).toBe(true);
    });
  });

  describe('GET /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: testUser.employee_id,
          password: testUser.password
        });
      token = loginRes.body.token;
    });

    it('should get profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.employeeId).toBe(testUser.employee_id);
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
  });
});
