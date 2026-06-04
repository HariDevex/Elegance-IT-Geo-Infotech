# Architecture

## Overview

Elegance EMS is a full-stack employee management system with React 19 frontend, Express 5 backend, and PostgreSQL database.

```
Frontend (Vite :8081)  --proxy-->  Backend (Express :3000)  -->  PostgreSQL
       |                                  |
   React 19                           Express 5
   React Router v7                    Knex.js (query builder)
   TanStack Query                     JWT auth
   Tailwind CSS                       Socket.io
```

---

## Frontend

### Entry & Providers (`src/main.jsx`)

```
StrictMode
  -> QueryClientProvider (TanStack, staleTime: 60s)
    -> AuthProvider (auth context)
      -> ErrorBoundary
        -> App + Toaster
```

### Routing (`src/App.jsx`)

| Path | Component | Role |
|---|---|---|
| `/login` | Login | Public |
| `/root-dashboard/*` | RootDashboard | root |
| `/admin-dashboard/*` | AdminDashboard | admin, manager, hr, teamlead |
| `/employee-dashboard/*` | EmployeeDashboard | developer |

Lazy-loaded via `React.lazy`. Auth guard via `ProtectedRoute`.

### State Management

- **Auth context**: user state, login/logout/update methods
- **TanStack React Query**: server state (employees, leaves, attendance)
- **Custom hooks**: `useEmployees`, `useLeaves`, `useAttendance`, `useChat`
- **Local state**: per-component state for forms, modals, UI toggles

### Key Patterns

- **DashboardLayout**: sidebar + header + content area, role-filtered nav tree, renders ChatWindow or child views
- **State-driven views**: dashboards switch content via `currentView` string (not nested routes)
- **Service layer**: `src/services/*` wraps axios calls per domain
- **Custom hooks**: encapsulate data fetching + state for chat, employees, leaves, attendance
- **UI primitives**: Radix-based with Tailwind styling via `cn()` utility

### File Structure

```
src/
  components/         Feature components (31 files)
    ui/               Radix-based primitives
    charts/           Recharts wrappers
    skeletons/        Loading skeleton variants
  hooks/              Custom hooks (useChat, useEmployees, useLeaves, useAttendance)
  services/           Axios API wrappers (7 files)
  context/            Auth provider
  pages/              Top-level route pages
  lib/utils.js        cn() helper (clsx + tailwind-merge)
  utils/              Excel export, image helpers
  config/             API base URL, axios instance
  assets/             Static assets (logos, images)
```

---

## Backend

### Middleware Stack

1. Sentry
2. Helmet (security headers)
3. CORS
4. Rate limiters (global + per-endpoint)
5. Body parsers (JSON, URL-encoded, 50mb)
6. Input validation (`validateInputLength`)
7. Response caching (holidays, announcements, leave-balance)
8. Compression
9. Static files (`/uploads`)
10. Request logger

### Route Mounting

| Path | Module |
|---|---|
| `/api/auth` | Auth (login, logout, profile, 2FA, OAuth, sessions) |
| `/api/employees` | Employee CRUD |
| `/api/attendance` | Attendance records |
| `/api/leaves` | Leave requests |
| `/api/chat` | Messaging + groups |
| `/api/holidays` | Holiday management |
| `/api/notifications` | Notifications |
| `/api/announcements` | Announcements |
| `/api/checkin` | Check-in/out |
| `/api/documents` | Document upload |
| `/api/leave-balance` | Leave balances |
| `/api/activity-logs` | Audit trail |

### Database

- **Knex.js** migrations + query builder
- **16 tables**: users, attendance, leaves, announcements, chat_messages, chat_groups, checkin_checkout, login_logs, leave_balances, notifications, holidays, documents, activity_logs, password_history, login_sessions, user_preferences, login_attempts, token_blacklist
- **Soft delete** on users (`is_deleted`, `deleted_at`)
- **UUID primary keys** throughout

### Auth System

- JWT access + refresh tokens
- Session management (multi-device, terminate individual sessions)
- 2FA (TOTP via speakeasy)
- OAuth (Google, GitHub)
- Password history (last 5), expiry, complexity validation
- Account lockout after failed attempts
- Role hierarchy: root → admin → manager → hr → teamlead → developer

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Dark theme default | CSS variables + HSL pattern (Shadcn/ui) |
| State-driven views | Simplified router, but no URL-driven navigation for sub-views |
| 5s polling for chat | No WebSocket consumer in frontend |
| Soft delete | Maintains referential integrity, audit trail |
| UUID primary keys | Distributed-friendly, avoids sequential ID leaks |
| Vite proxy in dev | `/api` → `:3000`, `/uploads` → `:3000` |
| Docker PostgreSQL | Required for UUID schema (SQLite incompatible) |
