import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';

const CREDENTIALS = {
  root: { email: 'EJB2026001', password: 'mrnobody009' },
  admin: { email: 'EJB2026002', password: 'admin123' },
  manager: { email: 'EJB2026003', password: 'manager123' },
  hr: { email: 'EJB2026004', password: 'hr123456' },
  teamlead: { email: 'EJB2026005', password: 'teamlead123' },
  developer: { email: 'EJB2026006', password: 'dev123456' },
};

async function getToken(request, creds) {
  const res = await request.post(`${API_BASE}/auth/login`, { data: creds });
  return (await res.json()).token;
}

test.describe('RBAC - Role Hierarchy Enforcement', () => {
  let rootToken, adminToken, managerToken, hrToken, teamleadToken, devToken;

  test.beforeAll(async ({ request }) => {
    rootToken = await getToken(request, CREDENTIALS.root);
    adminToken = await getToken(request, CREDENTIALS.admin);
    managerToken = await getToken(request, CREDENTIALS.manager);
    hrToken = await getToken(request, CREDENTIALS.hr);
    teamleadToken = await getToken(request, CREDENTIALS.teamlead);
    devToken = await getToken(request, CREDENTIALS.developer);
  });

  test.describe('Activity Logs Access', () => {
    test('Root CAN access activity logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/activity-logs`, {
        headers: { Authorization: `Bearer ${rootToken}` }
      });
      expect(res.ok()).toBeTruthy();
    });

    test('Admin CAN access activity logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/activity-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(res.ok()).toBeTruthy();
    });

    test('Manager CAN access activity logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/activity-logs`, {
        headers: { Authorization: `Bearer ${managerToken}` }
      });
      expect(res.ok()).toBeTruthy();
    });

    test('HR CAN access activity logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/activity-logs`, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });
      expect(res.ok()).toBeTruthy();
    });

    test('Team Lead CANNOT access activity logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/activity-logs`, {
        headers: { Authorization: `Bearer ${teamleadToken}` }
      });
      expect([401, 403]).toContain(res.status());
    });

    test('Developer CANNOT access activity logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/activity-logs`, {
        headers: { Authorization: `Bearer ${devToken}` }
      });
      expect([401, 403]).toContain(res.status());
    });
  });

  test.describe('Employee Management Access', () => {
    test('Root CAN create employees', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/employees`, {
        headers: { 
          Authorization: `Bearer ${rootToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `Root Test ${timestamp}`,
          email: `rt${timestamp}@elegance.com`,
          password: 'Test123456',
          role: 'developer'
        }
      });
      expect([200, 201]).toContain(res.status());
    });

    test('Admin CAN create employees', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/employees`, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `Admin Test ${timestamp}`,
          email: `at${timestamp}@elegance.com`,
          password: 'Test123456',
          role: 'developer'
        }
      });
      expect([200, 201]).toContain(res.status());
    });

    test('Manager CAN create employees', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/employees`, {
        headers: { 
          Authorization: `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `Manager Test ${timestamp}`,
          email: `mt${timestamp}@elegance.com`,
          password: 'Test123456',
          role: 'developer'
        }
      });
      expect([200, 201]).toContain(res.status());
    });

    test('HR CAN create employees', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/employees`, {
        headers: { 
          Authorization: `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `HR Test ${timestamp}`,
          email: `hrt${timestamp}@elegance.com`,
          password: 'Test123456',
          role: 'developer'
        }
      });
      expect([200, 201]).toContain(res.status());
    });

    test('Team Lead CANNOT create employees', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/employees`, {
        headers: { 
          Authorization: `Bearer ${teamleadToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `TL Test ${timestamp}`,
          email: `tlt${timestamp}@elegance.com`,
          password: 'Test123456',
          role: 'developer'
        }
      });
      expect([401, 403]).toContain(res.status());
    });

    test('Developer CANNOT create employees', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/employees`, {
        headers: { 
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `Dev Test ${timestamp}`,
          email: `dt${timestamp}@elegance.com`,
          password: 'Test123456',
          role: 'developer'
        }
      });
      expect([401, 403]).toContain(res.status());
    });
  });

  test.describe('Holiday Management Access', () => {
    test('All roles CAN view holidays', async ({ request }) => {
      const tokens = [rootToken, adminToken, managerToken, hrToken, teamleadToken, devToken];
      for (const token of tokens) {
        const res = await request.get(`${API_BASE}/holidays`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        expect(res.ok()).toBeTruthy();
      }
    });

    test('Admin CAN create holidays', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/holidays`, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `Test Holiday ${timestamp}`,
          date: '2026-12-25',
          description: 'Christmas'
        }
      });
      expect([200, 201]).toContain(res.status());
    });

    test('Developer CANNOT create holidays', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/holidays`, {
        headers: { 
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: `Unauthorized Holiday ${timestamp}`,
          date: '2026-12-26'
        }
      });
      expect([401, 403]).toContain(res.status());
    });
  });

  test.describe('Announcement Access', () => {
    test('Admin CAN create announcements', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/announcements`, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Admin Announcement ${timestamp}`,
          message: 'Test message',
          priority: 'high'
        }
      });
      expect([200, 201]).toContain(res.status());
    });

    test('Developer CANNOT create announcements', async ({ request }) => {
      const timestamp = Date.now();
      const res = await request.post(`${API_BASE}/announcements`, {
        headers: { 
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Unauthorized ${timestamp}`,
          message: 'Test'
        }
      });
      expect([401, 403]).toContain(res.status());
    });
  });

  test.describe('Leave Balance Access', () => {
    test('All roles CAN view their leave balance', async ({ request }) => {
      const tokens = [rootToken, adminToken, managerToken, hrToken, teamleadToken, devToken];
      for (const token of tokens) {
        const res = await request.get(`${API_BASE}/leave-balance/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        expect(res.ok()).toBeTruthy();
      }
    });
  });

  test.describe('Login Logs Access', () => {
    test('Admin CAN view login logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/auth/login-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(res.ok()).toBeTruthy();
    });

    test('Developer CANNOT view login logs', async ({ request }) => {
      const res = await request.get(`${API_BASE}/auth/login-logs`, {
        headers: { Authorization: `Bearer ${devToken}` }
      });
      expect([401, 403]).toContain(res.status());
    });
  });
});

test.describe('RBAC - Cross-Role Access Matrix', () => {
  const roles = ['root', 'admin', 'manager', 'hr', 'teamlead', 'developer'];
  const endpoints = [
    { method: 'GET', path: '/employees', allowedRoles: ['root', 'admin', 'manager', 'hr'] },
    { method: 'POST', path: '/employees', allowedRoles: ['root', 'admin', 'manager', 'hr'] },
    { method: 'GET', path: '/activity-logs', allowedRoles: ['root', 'admin', 'manager', 'hr'] },
    { method: 'GET', path: '/auth/login-logs', allowedRoles: ['root', 'admin'] },
    { method: 'POST', path: '/holidays', allowedRoles: ['root', 'admin'] },
    { method: 'GET', path: '/holidays', allowedRoles: ['root', 'admin', 'manager', 'hr', 'teamlead', 'developer'] },
    { method: 'POST', path: '/announcements', allowedRoles: ['root', 'admin'] },
    { method: 'GET', path: '/announcements', allowedRoles: ['root', 'admin', 'manager', 'hr', 'teamlead', 'developer'] },
  ];

  for (const endpoint of endpoints) {
    test(`${endpoint.method} ${endpoint.path}`, async ({ request }) => {
      for (const role of roles) {
        const token = await getToken(request, CREDENTIALS[role]);
        const options = {
          headers: { Authorization: `Bearer ${token}` }
        };
        
        let res;
        if (endpoint.method === 'GET') {
          res = await request.get(`${API_BASE}${endpoint.path}`, options);
        } else {
          res = await request.post(`${API_BASE}${endpoint.path}`, {
            ...options,
            headers: {
              ...options.headers,
              'Content-Type': 'application/json'
            },
            data: { name: 'Test' }
          });
        }
        
        const shouldAllow = endpoint.allowedRoles.includes(role);
        if (shouldAllow) {
          expect(res.ok()).toBeTruthy();
        } else {
          expect([401, 403]).toContain(res.status());
        }
      }
    });
  }
});
