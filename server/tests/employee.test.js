import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';

describe('Employee API', () => {
  let adminToken, developerToken;
  const adminUser = {
    name: 'Admin User',
    email: 'admin_emp@test.com',
    password: 'Password123!',
    role: 'admin',
    employee_id: 'ADM001'
  };
  const devUser = {
    name: 'Dev User',
    email: 'dev_emp@test.com',
    password: 'Password123!',
    role: 'developer',
    employee_id: 'DEV001'
  };

  beforeAll(async () => {
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

  describe('GET /api/employees', () => {
    it('should allow admin to list employees', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users).toHaveLength(2);
    });

    it('should allow developer to list employees', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/employees', () => {
    const newEmployee = {
      name: 'New Hire',
      email: 'newhire@test.com',
      password: 'Password123!',
      role: 'developer',
      employee_id: 'DEV002',
      department: 'Engineering',
      designation: 'Junior Dev'
    };

    it('should allow admin to create employee', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEmployee);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(newEmployee.email);
    });

    it('should reject creation by developer', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ ...newEmployee, email: 'rejected@test.com', employee_id: 'REJ001' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should allow admin to update employee', async () => {
      const dev = await db('users').where('employee_id', 'DEV001').first();
      const res = await request(app)
        .put(`/api/employees/${dev.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Dev Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const updatedDev = await db('users').where('employee_id', 'DEV001').first();
      expect(updatedDev.name).toBe('Updated Dev Name');
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should allow admin to soft delete employee', async () => {
      // Ensure user exists for this test
      const tempUser = {
        name: 'To Be Deleted',
        email: 'delete@test.com',
        password: 'Password123!',
        role: 'developer'
      };
      const postRes = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tempUser);
      
      expect(postRes.status).toBe(201);
      const generatedId = postRes.body.user.employeeId;

      const dev = await db('users').where('employee_id', generatedId).first();
      expect(dev).toBeDefined();

      const res = await request(app)
        .delete(`/api/employees/${dev.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedDev = await db('users').where('employee_id', generatedId).first();
      expect(deletedDev.is_deleted).toBeTruthy();
    });
  });
});
