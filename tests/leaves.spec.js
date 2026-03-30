import { test, expect } from '@playwright/test';

const API_BASE = 'http://192.168.29.205/api';
let adminToken = '';
let devToken = '';

test.describe('Leaves API', () => {
  test.beforeAll(async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    adminToken = (await adminLogin.json()).token;
    
    const devLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026006', password: 'dev123456' }
    });
    devToken = (await devLogin.json()).token;
  });

  test('GET /leaves - List All Leaves (Admin)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/leaves`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('GET /leaves - Without Auth - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/leaves`);
    expect(res.status()).toBe(401);
  });

  test('POST /leaves - Apply Leave (Future Dates)', async ({ request }) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 32);
    
    const res = await request.post(`${API_BASE}/leaves`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'Sick Leave',
        from: futureDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        reason: 'Medical appointment'
      }
    });
    expect([200, 201]).toContain(res.status());
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test('POST /leaves - Past Dates Rejected', async ({ request }) => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 5);
    
    const res = await request.post(`${API_BASE}/leaves`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'Sick Leave',
        from: pastDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        reason: 'Past leave'
      }
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('POST /leaves - Invalid Leave Type', async ({ request }) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 40);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 42);
    
    const res = await request.post(`${API_BASE}/leaves`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'Invalid Leave Type',
        from: futureDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        reason: 'Test'
      }
    });
    expect(res.status()).toBe(400);
  });

  test('POST /leaves - Missing Fields', async ({ request }) => {
    const res = await request.post(`${API_BASE}/leaves`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'Sick Leave'
      }
    });
    expect(res.status()).toBe(400);
  });

  test('POST /leaves - XSS in Reason', async ({ request }) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 50);
    const endDate = new Date(futureDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const res = await request.post(`${API_BASE}/leaves`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'Sick Leave',
        from: futureDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        reason: '<script>alert("XSS")</script>'
      }
    });
    if (res.ok()) {
      const data = await res.json();
      if (data.leave && data.leave.reason) {
        expect(data.leave.reason).not.toContain('<script>');
      }
    }
  });

  test('POST /leaves - Valid Leave Types', async ({ request }) => {
    const leaveTypes = ['Annual Leave', 'Sick Leave', 'Casual Leave', 'unpaid'];
    let dayOffset = 60;
    
    for (const leaveType of leaveTypes) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + dayOffset);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 5);
      dayOffset += 10;
      
      const res = await request.post(`${API_BASE}/leaves`, {
        headers: { 
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: leaveType,
          from: futureDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
          reason: `Test ${leaveType}`
        }
      });
      expect([200, 201]).toContain(res.status());
    }
  });
});
