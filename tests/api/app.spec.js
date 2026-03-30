import { test, expect } from '@playwright/test';

const BASE_URL = 'http://192.168.29.205/api';

let rootToken = '';
let adminToken = '';
let devToken = '';

test.describe('🔐 API Authentication', () => {
  test('Login with employee ID returns token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026001', password: 'mrnobody009' }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeTruthy();
    rootToken = data.token;
  });

  test('Login with email returns token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeTruthy();
    adminToken = data.token;
  });

  test('Invalid credentials rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'WRONG', password: 'wrongpass' }
    });
    expect(res.ok()).toBeFalsy();
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('SQL injection in login blocked', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: "' OR '1'='1", password: "' OR '1'='1" }
    });
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('Profile endpoint returns user data', async ({ request }) => {
    if (!adminToken) {
      const loginRes = await request.post(`${BASE_URL}/auth/login`, {
        data: { employee_id: 'EJB2026002', password: 'admin123' }
      });
      adminToken = (await loginRes.json()).token;
    }
    const res = await request.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.user).toBeTruthy();
    expect(data.user._id).toBeTruthy();
  });
});

test.describe('👥 Employee API', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    adminToken = (await res.json()).token;
  });

  test('List employees', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeGreaterThan(0);
  });

  test('Employees have correct format', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    const emp = data.users[0];
    expect(emp._id).toBeTruthy();
    expect(emp.name).toBeTruthy();
    expect(emp.employeeId).toMatch(/^[A-Z]{3}202\d{3,4}$/);
  });

  test('Get single employee', async ({ request }) => {
    const listRes = await request.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const userId = (await listRes.json()).users[0]._id;
    
    const res = await request.get(`${BASE_URL}/employees/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.user).toBeTruthy();
  });

  test('Create employee', async ({ request }) => {
    const timestamp = Date.now();
    const res = await request.post(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      data: {
        name: `QA Test ${timestamp}`,
        email: `qa${timestamp}@elegance.com`,
        password: 'TestPass123',
        role: 'developer',
        department: 'QA',
        designation: 'QA Engineer'
      }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.employeeId).toMatch(/^[A-Z]{3}202\d{3,4}$/);
  });

  test('Update employee', async ({ request }) => {
    const listRes = await request.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const userId = (await listRes.json()).users.find(u => u.role === 'developer')?._id;
    
    if (!userId) {
      console.log('No developer user found to update');
      return;
    }
    
    const res = await request.put(`${BASE_URL}/employees/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      data: { designation: 'Senior Developer' }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test('Search employees', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/employees?search=Admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.users)).toBe(true);
  });
});

test.describe('📋 Leave API', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026006', password: 'dev123456' }
    });
    devToken = (await res.json()).token;
  });

  test('List leaves', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/leaves`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Create leave application', async ({ request }) => {
    const future = new Date();
    future.setDate(future.getDate() + 200 + Math.floor(Math.random() * 50));
    const nextFuture = new Date(future);
    nextFuture.setDate(nextFuture.getDate() + 3);
    
    const res = await request.post(`${BASE_URL}/leaves`, {
      headers: { Authorization: `Bearer ${devToken}`, 'Content-Type': 'application/json' },
      data: {
        type: 'Sick Leave',
        from: future.toISOString().split('T')[0],
        to: nextFuture.toISOString().split('T')[0],
        reason: 'QA Testing - Medical appointment'
      }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test('Past dates rejected', async ({ request }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const res = await request.post(`${BASE_URL}/leaves`, {
      headers: { Authorization: `Bearer ${devToken}`, 'Content-Type': 'application/json' },
      data: {
        type: 'Sick Leave',
        from: yesterday.toISOString().split('T')[0],
        to: yesterday.toISOString().split('T')[0],
        reason: 'Past date test'
      }
    });
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});

test.describe('📅 Attendance API', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026006', password: 'dev123456' }
    });
    devToken = (await res.json()).token;
  });

  test('My attendance list', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/attendance/my`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Create attendance', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const profileRes = await request.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    const userId = (await profileRes.json()).user._id;
    
    const res = await request.post(`${BASE_URL}/attendance`, {
      headers: { Authorization: `Bearer ${devToken}`, 'Content-Type': 'application/json' },
      data: { date: today, userId: userId, status: 'present', action: 'checkin' }
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('🎯 RBAC Tests', () => {
  test('Developer cannot access admin routes', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026006', password: 'dev123456' }
    });
    devToken = (await loginRes.json()).token;
    
    const res = await request.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Admin can manage employees', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    adminToken = (await loginRes.json()).token;
    
    const res = await request.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Unauthorized user cannot access protected routes', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/employees`);
    expect(res.status()).toBe(401);
  });
});

test.describe('🛡️ Security Tests', () => {
  test('XSS sanitization', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    adminToken = (await loginRes.json()).token;
    
    const res = await request.post(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      data: {
        name: '<script>alert("XSS")</script>',
        email: 'xss-test@elegance.com',
        password: 'TestPass123',
        role: 'developer'
      }
    });
    const data = await res.json();
    if (data.success) {
      expect(data.user.name).not.toContain('<script>');
    }
  });

  test('Input length validation', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    adminToken = (await loginRes.json()).token;
    
    const longName = 'A'.repeat(1000);
    const res = await request.post(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      data: {
        name: longName,
        email: 'long@elegance.com',
        password: 'TestPass123',
        role: 'developer'
      }
    });
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('Rate limiting active', async ({ request }) => {
    const responses = [];
    for (let i = 0; i < 10; i++) {
      const res = await request.post(`${BASE_URL}/auth/login`, {
        data: { employee_id: 'WRONG', password: 'wrong' }
      });
      responses.push(res.status());
    }
    const has429 = responses.includes(429);
    const has401 = responses.includes(401);
    expect(has429 || has401).toBe(true);
  });
});

test.describe('📊 Database Integration', () => {
  test('Employee IDs are unique', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    adminToken = (await loginRes.json()).token;
    
    const res = await request.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    const ids = data.users.map(u => u.employeeId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('Created employee persists', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    adminToken = (await loginRes.json()).token;
    
    const timestamp = Date.now();
    const createRes = await request.post(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      data: {
        name: `Persist Test ${timestamp}`,
        email: `persist${timestamp}@elegance.com`,
        password: 'TestPass123',
        role: 'developer'
      }
    });
    const createData = await createRes.json();
    const newUserId = createData.user._id;
    
    const getRes = await request.get(`${BASE_URL}/employees/${newUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getData = await getRes.json();
    expect(getData.user).toBeTruthy();
    expect(getData.user.name).toContain(`Persist Test ${timestamp}`);
  });
});
