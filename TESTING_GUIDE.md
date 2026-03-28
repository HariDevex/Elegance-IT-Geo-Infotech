# 🧪 Complete Testing Suite - Elegance EMS

## 📁 Project Structure

```
Elegance1/
├── postman/
│   └── Elegance_EMS_API.postman_collection.json
├── tests/
│   ├── auth.spec.js
│   ├── employees.spec.js
│   ├── leaves.spec.js
│   ├── attendance.spec.js
│   ├── security.spec.js
│   ├── rbac.spec.js
│   └── performance.spec.js
├── playwright.config.js
└── package.json
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright Browsers
```bash
npx playwright install chromium
```

### 3. Run All Tests
```bash
npm test
```

---

## 📋 Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:headed` | Run with visible browser |
| `npm run test:auth` | Authentication tests only |
| `npm run test:employees` | Employee CRUD tests |
| `npm run test:leaves` | Leave management tests |
| `npm run test:attendance` | Attendance tests |
| `npm run test:security` | Security attack tests |
| `npm run test:rbac` | Role-based access tests |
| `npm run test:performance` | Performance tests |
| `npm run test:report` | View HTML report |

---

## 📊 Test Coverage

### Authentication (auth.spec.js)
- ✅ Login with Employee ID
- ✅ Login with Email
- ✅ Invalid credentials
- ✅ Missing fields
- ✅ SQL injection protection
- ✅ Profile retrieval
- ✅ Logout
- ✅ Token validation

### Employees (employees.spec.js)
- ✅ List all employees
- ✅ Get single employee
- ✅ Create employee
- ✅ Update employee
- ✅ Search employees
- ✅ Pagination
- ✅ Duplicate email detection
- ✅ Employee ID format validation
- ✅ XSS sanitization
- ✅ Long input validation

### Leaves (leaves.spec.js)
- ✅ List all leaves
- ✅ Apply leave (future dates)
- ✅ Past dates rejection
- ✅ Invalid leave type
- ✅ Missing fields
- ✅ XSS sanitization
- ✅ Valid leave types

### Attendance (attendance.spec.js)
- ✅ List all attendance
- ✅ My attendance
- ✅ Create attendance
- ✅ Check-in/Check-out
- ✅ Missing fields handling

### Security (security.spec.js)
- ✅ SQL injection (login, search, reason)
- ✅ XSS injection (name, reason, announcement)
- ✅ Input validation (long input, invalid email)
- ✅ Invalid UUID format
- ✅ Malformed JSON
- ✅ Rate limiting
- ✅ Privilege escalation prevention
- ✅ Missing/Invalid token

### RBAC (rbac.spec.js)
- ✅ Activity logs access (all roles)
- ✅ Employee management access
- ✅ Holiday management access
- ✅ Announcement access
- ✅ Leave balance access
- ✅ Login logs access
- ✅ Cross-role access matrix

### Performance (performance.spec.js)
- ✅ Response time < 500ms
- ✅ Health endpoint
- ✅ Multiple sequential requests
- ✅ Data integrity
- ✅ Edge cases

---

## 🔐 Test Credentials

| Role | Employee ID | Password |
|------|------------|----------|
| root | EJB2026001 | mrnobody009 |
| admin | EJB2026002 | admin123 |
| manager | EJB2026003 | manager123 |
| hr | EJB2026004 | hr123456 |
| teamlead | EJB2026005 | teamlead123 |
| developer | EJB2026006 | dev123456 |

---

## 🐛 Postman Collection

Import `postman/Elegance_EMS_API.postman_collection.json` into Postman.

### Environment Variables
| Variable | Value |
|----------|-------|
| `baseUrl` | http://localhost:5000/api |
| `token` | (auto-set by login) |
| `refreshToken` | (auto-set by login) |
| `adminToken` | (auto-set by login) |
| `devToken` | (auto-set by login) |

### Collection Structure
1. Auth (12 requests)
2. Employees (8 requests)
3. Attendance (3 requests)
4. Checkin (3 requests)
5. Leaves (5 requests)
6. Leave Balance (2 requests)
7. Announcements (3 requests)
8. Chat (2 requests)
9. Notifications (2 requests)
10. Holidays (3 requests)
11. Activity Logs (2 requests)
12. Sessions (1 request)
13. Security Tests (12 requests)
14. Health Check (1 request)

---

## 🎯 Security Tests Included

### SQL Injection
- Login with `' OR '1'='1`
- Employee search injection
- Leave reason injection

### XSS Injection
- `<script>alert("XSS")</script>`
- `<img src=x onerror=alert("XSS")>`
- Event handlers

### Input Validation
- Long inputs (1000+ chars)
- Invalid email formats
- Invalid UUID format
- Malformed JSON

### Authorization
- Invalid token rejection
- Missing token rejection
- Privilege escalation prevention
- Role-based access enforcement

---

## 📈 Running Specific Tests

```bash
# Run security tests only
npm run test:security

# Run RBAC tests only
npm run test:rbac

# Run with headed browser
npm run test:headed

# Run and debug
npm run test:debug
```

---

## 📝 Notes

- Tests run sequentially to avoid rate limiting
- Some tests may fail due to rate limiting - wait 60s and retry
- Server must be running on http://localhost:5000
- Database state persists between tests
