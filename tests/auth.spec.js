import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';
const CREDENTIALS = {
  root: { email: 'EJB2026001', password: 'mrnobody009' },
  admin: { email: 'EJB2026002', password: 'admin123' },
  dev: { email: 'EJB2026006', password: 'dev123456' },
};

let rootToken = '';
let adminToken = '';
let devToken = '';

test.describe('Authentication API', () => {
  test('Login with Employee ID - Success', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: CREDENTIALS.root
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    expect(data.user._id).toBeTruthy();
    rootToken = data.token;
  });

  test('Login with Email - Success', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'admin@elegance.com', password: 'admin123' }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    adminToken = data.token;
  });

  test('Login as Developer - Success', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: CREDENTIALS.dev
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    devToken = data.token;
  });

  test('Invalid Credentials - Wrong Password', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'admin@elegance.com', password: 'wrongpassword' }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('Invalid Credentials - Non-existent User', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'nonexistent@elegance.com', password: 'password' }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('Missing Password', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'admin@elegance.com' }
    });
    expect([400, 401]).toContain(res.status());
  });

  test('Missing Email', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { password: 'admin123' }
    });
    expect([400, 401]).toContain(res.status());
  });

  test('Empty Body', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: {}
    });
    expect(res.status()).toBe(400);
  });

  test('SQL Injection in Login', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: "admin@elegance.com' OR '1'='1", password: "' OR '1'='1" }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});

test.describe('Get Profile', () => {
  test('Get Profile with Valid Token', async ({ request }) => {
    if (!adminToken) {
      const loginRes = await request.post(`${API_BASE}/auth/login`, {
        data: CREDENTIALS.admin
      });
      adminToken = (await loginRes.json()).token;
    }
    
    const res = await request.get(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.user).toBeTruthy();
    expect(data.user._id).toBeTruthy();
    expect(data.user.email).toBeTruthy();
  });

  test('Get Profile without Token - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/profile`);
    expect(res.status()).toBe(401);
  });

  test('Get Profile with Invalid Token - 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/profile`, {
      headers: { Authorization: 'Bearer invalid.token.here' }
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Logout', () => {
  test('Logout Success', async ({ request }) => {
    if (!adminToken) {
      const loginRes = await request.post(`${API_BASE}/auth/login`, {
        data: CREDENTIALS.admin
      });
      adminToken = (await loginRes.json()).token;
    }
    
    const res = await request.post(`${API_BASE}/auth/logout`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Change Password', () => {
  test('Change Password - Missing Fields', async ({ request }) => {
    if (!adminToken) {
      const loginRes = await request.post(`${API_BASE}/auth/login`, {
        data: CREDENTIALS.admin
      });
      adminToken = (await loginRes.json()).token;
    }
    
    const res = await request.put(`${API_BASE}/auth/change-password`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { currentPassword: 'admin123' }
    });
    expect(res.status()).toBe(400);
  });
});
