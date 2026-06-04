# API Reference

Base URL: `/api` (proxied in dev, configurable via `VITE_API_BASE_URL`)

Auth header: `Authorization: Bearer <token>`

---

## Authentication (`/api/auth`)

### POST `/login`
Login with employee credentials.
```
Body: { employee_id, password }
Response: { token, refreshToken, user, mustChangePassword }
```

### POST `/logout`
Logout current session, auto-checkout attendance.

### POST `/refresh`
Refresh access token.
```
Body: { refreshToken }
Response: { token, refreshToken }
```

### GET `/profile`
Get authenticated user's profile.

### PUT `/change-password`
Change own password. Validates against last 5 passwords.
```
Body: { currentPassword, newPassword }
```

### POST `/forgot-password`
Request password reset email.
```
Body: { email }
```

### POST `/reset-password`
Reset password with token.
```
Body: { token, password }
```

### POST `/avatar`
Upload avatar image (multipart/form-data).

### GET `/login-logs`
List login logs (root/admin). Paginated, filterable.

### GET `/sessions`
List own active sessions.

### DELETE `/sessions/:sessionId`
Terminate a specific session.

### DELETE `/sessions`
Terminate all other sessions.

### POST `/reset-user-password`
Root-only: reset another user's password.
```
Body: { userId, newPassword }
```

### GET `/password-history`
Root-only: view password history for a user.

### GET `/all-password-history`
Root-only: view all password history.

---

## 2FA (`/api/auth/2fa`)

### GET `/status`
Check if 2FA is enabled.

### POST `/setup`
Generate 2FA secret + QR code.

### POST `/verify`
Verify TOTP token and enable 2FA.
```
Body: { token }
```

### POST `/disable`
Disable 2FA (requires password + TOTP).

### POST `/verify-login`
Verify 2FA token during login with temp token.

---

## OAuth (`/api/auth/oauth`)

### GET `/google`
Initiate Google OAuth login.

### GET `/github`
Initiate GitHub OAuth login.

### GET `/:provider/callback`
OAuth provider callback handler.

---

## Employees (`/api/employees`)

### POST `/`
Create employee (root/admin/manager/hr).
```
Body: { name, email, password, role, department, designation, ... }
```

### GET `/`
List employees. Filterable, paginated.
```
Query: { search, role, department, is_active, is_deleted, page, limit }
```

### GET `/:id`
Get employee by UUID or employee_id.

### PUT `/:id`
Update employee fields.

### PUT `/:id/attendance`
Update employee attendance status (root/admin/manager).
```
Body: { attendance_status }
```

### DELETE `/:id`
Soft-delete employee (root/admin).

---

## Attendance (`/api/attendance`)

### POST `/`
Create or update attendance record.
```
Body: { action: "checkin" | "checkout" }
```

### GET `/my`
Get own attendance records grouped by date.

### GET `/`
List all attendance (admin/manager).

---

## Leaves (`/api/leaves`)

### POST `/`
Submit leave request.
```
Body: { type, from_date, to_date, description }
```

### GET `/`
List leaves. Status/user filters.

### PUT `/:id/status`
Approve/reject leave (root/admin/manager).
```
Body: { status: "Approved" | "Rejected" }
```

### DELETE `/:id`
Delete own pending leave.

---

## Leave Balance (`/api/leave-balance`)

### GET `/types`
Get available leave types and defaults.

### GET `/balance`
Get own leave balances.

### GET `/balance/:userId`
Get specific user's leave balances.

### PUT `/balance`
Set leave balance total (admin/manager).
```
Body: { userId, leaveType, totalDays }
```

---

## Holidays (`/api/holidays`)

### GET `/`
List holidays. Filterable by year/type.

### GET `/upcoming`
Get next 10 upcoming holidays.

### POST `/`
Create a holiday (root/admin).

### POST `/auto-populate`
Auto-populate holidays for given years.

### DELETE `/:id`
Delete a holiday.

---

## Chat (`/api/chat`)

### GET `/`
Get messages (direct or group).
```
Query: { contactId, type: "direct" | "group" }
```

### POST `/`
Send a message with optional file (multipart/form-data).
```
Fields: { contactId, type, text, file? }
```

### GET `/groups`
List chat groups.

### POST `/groups`
Create a chat group.
```
Body: { name, description }
```

### DELETE `/groups/:id`
Delete a group (creator or root).

---

## Notifications (`/api/notifications`)

### GET `/`
Get own notifications (filterable).

### PUT `/:id/read`
Mark notification as read.

### PUT `/read-all`
Mark all notifications as read.

### DELETE `/:id`
Delete a notification.

---

## Announcements (`/api/announcements`)

### POST `/`
Create announcement (root/admin).
```
Body: { title, message, audience_roles?, audience_departments? }
```

### GET `/`
List announcements (audience-filtered).

### DELETE `/:id`
Delete announcement (creator or root).

---

## Check-in/out (`/api/checkin`)

### POST `/checkin`
Check in (max 3/day).

### POST `/checkout`
Check out from last check-in.

### GET `/my-records`
Get own checkin/checkout history.

### GET `/export`
Export checkin data to JSON.

---

## Documents (`/api/documents`)

### GET `/`
Get own documents.

### GET `/:userId`
Get specified user's documents.

### POST `/`
Upload a document (multipart/form-data).
```
Fields: { name, type: "contract"|"id_proof"|"certificate"|"other", file, description? }
```

### DELETE `/:id`
Delete own document.

---

## Activity Logs (`/api/activity-logs`)

### GET `/`
Get activity logs (root/admin/manager/hr). Paginated.

---

## Health

### GET `/api/health`
Full health check with version and feature status.

### GET `/health`
Simple health check.
