import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';

describe('RBAC & Privacy Audit', () => {
  const users = {
    admin: { name: 'Admin User', email: 'admin_audit@test.com', role: 'admin', employee_id: 'AUDIT_ADMIN' },
    dev1: { name: 'Dev One', email: 'dev1_audit@test.com', role: 'developer', employee_id: 'AUDIT_DEV1' },
    dev2: { name: 'Dev Two', email: 'dev2_audit@test.com', role: 'developer', employee_id: 'AUDIT_DEV2' },
  };

  const tokens = {};
  const dbIds = {};

  beforeAll(async () => {
    // Cleanup audit users
    await db('users').whereIn('employee_id', Object.values(users).map(u => u.employee_id)).del();
    
    for (const [key, userData] of Object.entries(users)) {
      const password = 'Password123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [inserted] = await db('users').insert({
        ...userData,
        password: hashedPassword,
        dob: '1990-01-01',
        gender: 'Other',
        marital_status: 'Single',
        salary: 50000
      }).returning('id');

      const id = typeof inserted === 'object' ? (inserted.id || inserted[0]) : inserted;
      dbIds[key] = id;

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: userData.employee_id,
          password: password
        });
      
      tokens[key] = loginRes.body.token;
    }

    // Create a leave for dev1
    await db('leaves').insert({
      id: 'audit-leave-1',
      user_id: dbIds.dev1,
      type: 'Annual Leave',
      from_date: '2026-12-01',
      to_date: '2026-12-05',
      status: 'Pending'
    });
  });

  afterAll(async () => {
    await db('leaves').where('id', 'audit-leave-1').del();
    await db('users').whereIn('employee_id', Object.values(users).map(u => u.employee_id)).del();
  });

  describe('Leave Privacy', () => {
    it('Developer should NOT see other users leaves', async () => {
      const res = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${tokens.dev2}`);
      
      expect(res.status).toBe(200);
      const otherLeaves = res.body.leaves.filter(l => l.user.employeeId === users.dev1.employee_id);
      expect(otherLeaves.length).toBe(0);
    });

    it('Admin SHOULD see all leaves', async () => {
      const res = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${tokens.admin}`);
      
      expect(res.status).toBe(200);
      const dev1Leaves = res.body.leaves.filter(l => l.user.employeeId === users.dev1.employee_id);
      expect(dev1Leaves.length).toBeGreaterThan(0);
    });
  });

  describe('Employee List Privacy', () => {
    it('Developer should NOT see sensitive fields of others in list', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${tokens.dev1}`);
      
      expect(res.status).toBe(200);
      const dev2Record = res.body.users.find(u => u.employeeId === users.dev2.employee_id);
      expect(dev2Record).toBeDefined();
      expect(dev2Record.dob).toBeUndefined();
      expect(dev2Record.gender).toBeUndefined();
      expect(dev2Record.maritalStatus).toBeUndefined();
      expect(dev2Record.salary).toBeUndefined();
    });

    it('Admin SHOULD see sensitive fields in employee list', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${tokens.admin}`);
      
      expect(res.status).toBe(200);
      const dev2Record = res.body.users.find(u => u.employeeId === users.dev2.employee_id);
      expect(dev2Record).toBeDefined();
      expect(dev2Record.dob).toBeDefined();
      expect(dev2Record.salary).toBeDefined();
    });
  });

  describe('Salary Slip Security', () => {
    it('Developer should NOT be able to mark others slips as downloaded', async () => {
      // Create a dummy slip for dev1
      const slipId = 'audit-slip-1';
      await db('salary_slips').insert({
        id: slipId,
        user_id: dbIds.dev1,
        month: 'Jan',
        year: 2026,
        net_pay: 4000
      });

      const res = await request(app)
        .put(`/api/salary-slips/${slipId}/download`)
        .set('Authorization', `Bearer ${tokens.dev2}`);
      
      expect(res.status).toBe(403);

      await db('salary_slips').where('id', slipId).del();
    });
  });
});
