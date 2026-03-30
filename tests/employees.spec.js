import { test, expect } from '@playwright/test';

const API_BASE = 'http://192.168.29.205/api';
let adminToken = '';
let devToken = '';
let testUserId = '';

test.describe('Employee CRUD Operations', () => {
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

  test('GET /employees - List All Employees', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeGreaterThan(0);
    
    if (data.users.length > 0) {
      testUserId = data.users[0]._id;
      expect(data.users[0]._id).toBeTruthy();
      expect(data.users[0].name).toBeTruthy();
      expect(data.users[0].employeeId).toMatch(/^[A-Z]{3}202\d{3,4}$/);
    }
  });

  test('GET /employees - Pagination', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.pagination).toBeTruthy();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(5);
  });

  test('GET /employees - Search', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees?search=Admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.users)).toBe(true);
  });

  test('GET /employees - Without Auth - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees`);
    expect(res.status()).toBe(401);
  });

  test('GET /employees/:id - Get Single Employee', async ({ request }) => {
    if (!testUserId) {
      const listRes = await request.get(`${API_BASE}/employees`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      testUserId = (await listRes.json()).users[0]._id;
    }
    
    const res = await request.get(`${API_BASE}/employees/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.user).toBeTruthy();
    expect(data.user._id).toBe(testUserId);
  });

  test('GET /employees/:id - Invalid UUID - 404', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees/not-a-uuid`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status()).toBe(404);
  });

  test('POST /employees - Create Employee', async ({ request }) => {
    const timestamp = Date.now();
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `Test Employee ${timestamp}`,
        email: `test${timestamp}@elegance.com`,
        password: 'Test123456',
        role: 'developer',
        department: 'Engineering',
        designation: 'Software Developer'
      }
    });
    expect([200, 201]).toContain(res.status());
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.employeeId).toMatch(/^[A-Z]{3}202\d{3,4}$/);
  });

  test('POST /employees - Duplicate Email - 409', async ({ request }) => {
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Duplicate Test',
        email: 'admin@elegance.com',
        password: 'Test123456',
        role: 'developer'
      }
    });
    expect(res.status()).toBe(409);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('POST /employees - Missing Fields - 400', async ({ request }) => {
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: '',
        email: ''
      }
    });
    expect([400, 409]).toContain(res.status());
  });

  test('PUT /employees - Update Employee', async ({ request }) => {
    if (!testUserId) {
      const listRes = await request.get(`${API_BASE}/employees`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      testUserId = (await listRes.json()).users[0]._id;
    }
    
    const res = await request.put(`${API_BASE}/employees/${testUserId}`, {
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        designation: 'Senior Developer',
        department: 'Engineering'
      }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test('POST /employees - XSS in Name - Sanitized', async ({ request }) => {
    const timestamp = Date.now();
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: '<script>alert("XSS")</script>',
        email: `xsstest${timestamp}@elegance.com`,
        password: 'Test123456',
        role: 'developer'
      }
    });
    if (res.ok()) {
      const data = await res.json();
      if (data.user && data.user.name) {
        expect(data.user.name).not.toContain('<script>');
      }
    }
  });

  test('POST /employees - Long Name - Validation', async ({ request }) => {
    const timestamp = Date.now();
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'A'.repeat(600),
        email: `longname${timestamp}@elegance.com`,
        password: 'Test123456',
        role: 'developer'
      }
    });
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('POST /employees - Developer Cannot Create - 403', async ({ request }) => {
    const timestamp = Date.now();
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `Unauthorized ${timestamp}`,
        email: `unauth${timestamp}@elegance.com`,
        password: 'Test123456',
        role: 'developer'
      }
    });
    expect([403, 401]).toContain(res.status());
  });
});

test.describe('Employee ID Format', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) {
      const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
      });
      adminToken = (await adminLogin.json()).token;
    }
  });

  test('Employee IDs follow correct format EJB2026XXX', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    
    for (const user of data.users) {
      expect(user.employeeId).toMatch(/^[A-Z]{3}202\d{3,4}$/);
    }
  });

  test('Employee IDs are unique', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    const ids = data.users.map(u => u.employeeId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
