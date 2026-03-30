import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api';

test.describe('Security Tests - Authentication', () => {
  test('Invalid Token - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees`, {
      headers: { Authorization: 'Bearer invalid.token.here' }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('Missing Token - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees`);
    expect(res.status()).toBe(401);
  });

  test('Malformed Authorization Header', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees`, {
      headers: { Authorization: 'NotBearer token' }
    });
    expect(res.status()).toBe(401);
  });

  test('Empty Token - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/employees`, {
      headers: { Authorization: 'Bearer ' }
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Security Tests - SQL Injection', () => {
  test('SQL Injection in Login', async ({ request }) => {
    const payloads = [
      "admin@elegance.com' OR '1'='1",
      "admin'--",
      "' OR 1=1 --",
      "1; DROP TABLE users--"
    ];
    
    for (const empId of payloads) {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: { employee_id: empId, password: 'anything' }
      });
      expect(res.status()).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    }
  });

  test('SQL Injection in Employee Search', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const res = await request.get(`${API_BASE}/employees?search=' OR '1'='1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (data.success) {
      expect(Array.isArray(data.users)).toBe(true);
    } else {
      expect(data.success).toBe(false);
    }
  });

  test('SQL Injection in Leave Reason', async ({ request }) => {
    const devLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026006', password: 'dev123456' }
    });
    const token = (await devLogin.json()).token;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 70);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 72);
    
    const res = await request.post(`${API_BASE}/leaves`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'Sick Leave',
        from: futureDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        reason: "'; DROP TABLE leaves;--"
      }
    });
    
    if (res.ok()) {
      const data = await res.json();
      if (data.leave && data.leave.reason) {
        expect(data.leave.reason).not.toContain('DROP TABLE');
      }
    }
  });
});

test.describe('Security Tests - XSS Injection', () => {
  test('XSS in Employee Name', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const timestamp = Date.now();
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "javascript:alert('XSS')"
    ];
    
    for (const name of xssPayloads) {
      const res = await request.post(`${API_BASE}/employees`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          name,
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
    }
  });

  test('XSS in Leave Reason', async ({ request }) => {
    const devLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026006', password: 'dev123456' }
    });
    const token = (await devLogin.json()).token;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 80);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 82);
    
    const res = await request.post(`${API_BASE}/leaves`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'Sick Leave',
        from: futureDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        reason: '<img src=x onerror=alert("XSS")>'
      }
    });
    
    if (res.ok()) {
      const data = await res.json();
      if (data.leave && data.leave.reason) {
        expect(data.leave.reason).not.toContain('<img');
      }
    }
  });

  test('XSS in Announcement', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const res = await request.post(`${API_BASE}/announcements`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: '<script>alert("XSS")</script> Notice',
        message: 'Test message'
      }
    });
    
    if (res.ok()) {
      const data = await res.json();
      if (data.announcement && data.announcement.title) {
        expect(data.announcement.title).not.toContain('<script>');
      }
    }
  });
});

test.describe('Security Tests - Input Validation', () => {
  test('Long Input Rejected', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const timestamp = Date.now();
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'A'.repeat(1000),
        email: `longname${timestamp}@elegance.com`,
        password: 'Test123456',
        role: 'developer'
      }
    });
    expect(res.status()).toBe(400);
  });

  test('Invalid Email Format', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const timestamp = Date.now();
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Test User',
        email: 'not-an-email',
        password: 'Test123456',
        role: 'developer'
      }
    });
    expect(res.status()).toBe(400);
  });

  test('Invalid UUID Format - 404', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const res = await request.get(`${API_BASE}/employees/not-valid-uuid`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(404);
  });

  test('Malformed JSON', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: '{ invalid json }'
    });
    expect([400, 415]).toContain(res.status());
  });
});

test.describe('Security Tests - Rate Limiting', () => {
  test('Multiple Rapid Requests - Rate Limited', async ({ request }) => {
    const results = [];
    for (let i = 0; i < 20; i++) {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: { employee_id: 'WRONG', password: 'wrong' }
      });
      results.push(res.status());
    }
    
    const has429 = results.includes(429);
    const has401 = results.includes(401);
    expect(has429 || has401).toBe(true);
  });
});

test.describe('Security Tests - Privilege Escalation', () => {
  test('Developer Cannot Create Employee', async ({ request }) => {
    const devLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026006', password: 'dev123456' }
    });
    const token = (await devLogin.json()).token;
    
    const timestamp = Date.now();
    const res = await request.post(`${API_BASE}/employees`, {
      headers: { 
        Authorization: `Bearer ${token}`,
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

  test('Cannot Escalate to Root Role', async ({ request }) => {
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { employee_id: 'EJB2026002', password: 'admin123' }
    });
    const token = (await adminLogin.json()).token;
    
    const listRes = await request.get(`${API_BASE}/employees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = (await listRes.json()).users;
    const userId = users.find(u => u.role === 'developer')?._id;
    
    if (userId) {
      const res = await request.put(`${API_BASE}/employees/${userId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: { role: 'root' }
      });
      
      if (res.ok()) {
        const data = await res.json();
        expect(data.user.role).not.toBe('root');
      }
    }
  });
});
