import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';

describe('Check-in/Out Integration — All Roles', () => {
  const roles = ['developer', 'teamlead', 'manager', 'hr', 'admin', 'root'];
  const userTokens = {};
  const userIds = {};

  beforeAll(async () => {
    // Cleanup users before tests
    await db('users').del();
    await db('checkin_checkout').del();
    
    for (const role of roles) {
      const employeeId = `TEST_${role.toUpperCase()}`;
      const password = 'Password123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [id] = await db('users').insert({
        name: `Test ${role}`,
        email: `${role}@test.com`,
        password: hashedPassword,
        role: role,
        employee_id: employeeId
      }).returning('id');

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          employee_id: employeeId,
          password: password
        });
      
      userTokens[role] = loginRes.body.token;
      userIds[role] = loginRes.body.user._id; // employee_id
    }
  });

  describe('Check-in/Out functionality per role', () => {
    roles.forEach(role => {
      it(`should allow ${role} to check in and check out`, async () => {
        const token = userTokens[role];
        
        // 1. Check in
        const checkinRes = await request(app)
          .post('/api/checkin/checkin')
          .set('Authorization', `Bearer ${token}`)
          .send({ note: `Checkin as ${role}` });

        expect(checkinRes.status).toBe(201);
        expect(checkinRes.body.success).toBe(true);
        expect(checkinRes.body.record.type).toBe('checkin');

        const checkinId = checkinRes.body.record._id;

        // 2. Check out
        const checkoutRes = await request(app)
          .post('/api/checkin/checkout')
          .set('Authorization', `Bearer ${token}`)
          .send({ note: `Checkout as ${role}` });

        expect(checkoutRes.status).toBe(201);
        expect(checkoutRes.body.success).toBe(true);
        expect(checkoutRes.body.record.type).toBe('checkout');

        // 3. Verify records
        const recordsRes = await request(app)
          .get('/api/checkin/my-records')
          .set('Authorization', `Bearer ${token}`);

        expect(recordsRes.status).toBe(200);
        expect(recordsRes.body.success).toBe(true);
        
        // Find the session we just created
        const session = recordsRes.body.records.find(r => r.checkin._id === checkinId);
        expect(session).toBeDefined();
        expect(session.checkout).toBeDefined();
      });
    });
  });

  describe('Cross-user visibility (Admin view)', () => {
    it('should allow manager/admin/root to see all records', async () => {
      const adminToken = userTokens['admin'];
      const res = await request(app)
        .get('/api/checkin/all-records')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.records.length).toBeGreaterThanOrEqual(roles.length);
    });

    it('should NOT allow developer to see all records', async () => {
      const devToken = userTokens['developer'];
      const res = await request(app)
        .get('/api/checkin/all-records')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(403);
    });
  });
});
