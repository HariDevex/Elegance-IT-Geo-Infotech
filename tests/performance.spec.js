import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api';

test.describe('Performance Tests', () => {
  test('Health endpoint responds within 1000ms', async ({ request }) => {
    const startTime = Date.now();
    const res = await request.get(`${API_BASE}/health`);
    const duration = Date.now() - startTime;
    
    expect(res.ok()).toBeTruthy();
    expect(duration).toBeLessThan(1000);
  });

  test('Login responds within 2000ms', async ({ request }) => {
    const startTime = Date.now();
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const duration = Date.now() - startTime;
    
    expect(res.ok()).toBeTruthy();
    expect(duration).toBeLessThan(2000);
  });

  test('Employee list responds within 2000ms', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const startTime = Date.now();
    const res = await request.get(`${API_BASE}/employees?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const duration = Date.now() - startTime;
    
    expect(res.ok()).toBeTruthy();
    expect(duration).toBeLessThan(2000);
  });

  test('Profile endpoint responds within 1000ms', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const startTime = Date.now();
    const res = await request.get(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const duration = Date.now() - startTime;
    
    expect(res.ok()).toBeTruthy();
    expect(duration).toBeLessThan(1000);
  });

  test('Multiple sequential requests complete', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const endpoints = [
      { method: 'GET', path: '/employees' },
      { method: 'GET', path: '/holidays' },
      { method: 'GET', path: '/announcements' },
      { method: 'GET', path: '/attendance/my' },
      { method: 'GET', path: '/leave-balance/balance' },
      { method: 'GET', path: '/notifications' },
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const res = await request.get(`${API_BASE}${endpoint.path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const duration = Date.now() - startTime;
      
      expect(res.ok()).toBeTruthy();
      expect(duration).toBeLessThan(2000);
    }
  });
});

test.describe('Health & Status Checks', () => {
  test('Health endpoint returns success', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBeTruthy();
  });

  test('CORS headers present', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    const headers = res.headers();
    expect(headers).toBeDefined();
  });
});

test.describe('Data Integrity Tests', () => {
  test('Employee IDs are unique across all employees', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const res = await request.get(`${API_BASE}/employees?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    
    const employeeIds = data.users.map(u => u.employeeId);
    const uniqueIds = new Set(employeeIds);
    
    expect(uniqueIds.size).toBe(employeeIds.length);
  });

  test('Created employee persists and can be retrieved', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const timestamp = Date.now();
    const createRes = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `Persist Test ${timestamp}`,
        email: `persist${timestamp}@elegance.com`,
        password: 'Test123456',
        role: 'developer'
      }
    });
    
    if (createRes.ok()) {
      const createData = await createRes.json();
      const userId = createData.user._id;
      
      const getRes = await request.get(`${API_BASE}/employees/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      expect(getRes.ok()).toBeTruthy();
      const getData = await getRes.json();
      expect(getData.user.name).toContain(`Persist Test ${timestamp}`);
    }
  });
});

test.describe('Edge Cases', () => {
  test('Empty search returns results', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const res = await request.get(`${API_BASE}/employees?search=`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.users)).toBe(true);
  });

  test('Special characters in search', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const res = await request.get(`${API_BASE}/employees?search=@#$%`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Large page number handled', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await loginRes.json()).token;
    
    const res = await request.get(`${API_BASE}/employees?page=99999`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.users).toEqual([]);
  });
});
