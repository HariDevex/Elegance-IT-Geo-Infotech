import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

describe('Leave API', () => {
  let adminToken, developerToken, devId;
  const adminId = crypto.randomUUID();
  devId = crypto.randomUUID();

  const adminUser = {
    id: adminId,
    name: 'Admin User',
    email: 'admin_leave@test.com',
    password: 'Password123!',
    role: 'admin',
    employee_id: 'L-ADM001'
  };
  const devUser = {
    id: devId,
    name: 'Dev User',
    email: 'dev_leave@test.com',
    password: 'Password123!',
    role: 'developer',
    employee_id: 'L-DEV001'
  };

  beforeAll(async () => {
    await db('leaves').del();
    await db('leave_balances').del();
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

  describe('POST /api/leaves', () => {
    it('should allow developer to submit leave request', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekEnd = new Date(nextWeek);
      nextWeekEnd.setDate(nextWeek.getDate() + 2);

      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          type: 'Annual Leave',
          from: nextWeek.toISOString().split('T')[0],
          to: nextWeekEnd.toISOString().split('T')[0],
          description: 'Vacation'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.leave.status).toBe('Pending');
    });

    it('should prevent overlapping leave requests', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekEnd = new Date(nextWeek);
      nextWeekEnd.setDate(nextWeek.getDate() + 2);

      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          type: 'Sick Leave',
          from: nextWeek.toISOString().split('T')[0],
          to: nextWeekEnd.toISOString().split('T')[0],
          description: 'Overlapping'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already have a leave application/i);
    });
  });

  describe('PUT /api/leaves/:id/status', () => {
    it('should allow admin to approve leave and update balance', async () => {
      const leave = await db('leaves').where('user_id', devId).first();
      expect(leave).toBeDefined();
      
      // Check initial balance
      const initialBalanceRes = await request(app)
        .get('/api/leave-balance/balance')
        .set('Authorization', `Bearer ${developerToken}`);
      
      const annualBalance = initialBalanceRes.body.balances.find(b => b.leaveType === 'annual');
      const initialUsed = annualBalance.usedDays;

      const res = await request(app)
        .put(`/api/leaves/${leave.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Approved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Check updated balance
      const finalBalanceRes = await request(app)
        .get('/api/leave-balance/balance')
        .set('Authorization', `Bearer ${developerToken}`);
      
      const finalAnnualBalance = finalBalanceRes.body.balances.find(b => b.leaveType === 'annual');
      
      expect(finalAnnualBalance.usedDays).toBeGreaterThan(initialUsed);
    });
  });
});
