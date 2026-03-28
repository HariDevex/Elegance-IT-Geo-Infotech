import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';
let adminToken = '';
let devToken = '';

test.describe('Attendance API', () => {
  test.beforeAll(async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'admin@elegance.com', password: 'admin123' }
    });
    adminToken = (await adminLogin.json()).token;
    
    const devLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'developer@elegance.com', password: 'dev123456' }
    });
    devToken = (await devLogin.json()).token;
  });

  test('GET /attendance - List All (Admin)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('GET /attendance/my - My Attendance (Dev)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/attendance/my`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('GET /attendance - Without Auth - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/attendance`);
    expect(res.status()).toBe(401);
  });

  test('POST /attendance - Create Record', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request.post(`${API_BASE}/attendance`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        date: today,
        status: 'present',
        notes: 'Working from home'
      }
    });
    expect([200, 201]).toContain(res.status());
  });

  test('POST /attendance - Missing Fields', async ({ request }) => {
    const res = await request.post(`${API_BASE}/attendance`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        date: '2026-03-28'
      }
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Checkin API', () => {
  test.beforeAll(async ({ request }) => {
    if (!devToken) {
      const devLogin = await request.post(`${API_BASE}/auth/login`, {
        data: { email: 'developer@elegance.com', password: 'dev123456' }
      });
      devToken = (await devLogin.json()).token;
    }
  });

  test('POST /checkin/checkin - Check In', async ({ request }) => {
    const res = await request.post(`${API_BASE}/checkin/checkin`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('POST /checkin/checkout - Check Out', async ({ request }) => {
    const res = await request.post(`${API_BASE}/checkin/checkout`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('GET /checkin/my-records - Get Records', async ({ request }) => {
    const res = await request.get(`${API_BASE}/checkin/my-records`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('POST /checkin/checkin - Without Auth - 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/checkin/checkin`);
    expect(res.status()).toBe(401);
  });
});
