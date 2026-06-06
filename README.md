# Elegance EMS

Enterprise Employee Management System — React 19 frontend, Express 5 API, PostgreSQL database.

[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?style=flat&logo=nodedotjs)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-lightgrey?style=flat&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blueviolet?style=flat&logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)](LICENSE)

---

## Quick Start

```bash
# Full environment (PostgreSQL + Redis + server)
docker compose up --build

# Apply migrations + seed data
docker compose exec server npx knex migrate:latest --knexfile knexfile.js
docker compose exec server node seeds/seed.js

# Frontend (separate terminal)
cd Frontend && npm install && npm run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000/api
- **Metrics**: http://localhost:3000/metrics
- **Health**: http://localhost:3000/health

---

## Recent Upgrades (June 2026)

### 🛑 Manual Management & Control
- **Intentional Attendance**: Removed auto-checkin on login. Employees must now manually "Check In" to be marked as present, preventing "passive presence" errors.
- **Manual Holidays**: Deleted the auto-holiday generator. HR now has 100% manual control over the company calendar for absolute accuracy.

### 🎙️ Enhanced Chat Media
- **Voice Notes**: New **Click-to-Record** feature. Record, preview, and send high-quality voice messages directly in the chat.
- **Large Attachments**: Increased file sharing limit to **50MB**. Support for Images, Videos, PDFs, and Office docs with in-chat previews.

### ⚡ Database Performance (Phase 1 & 2)
- **Compound Indexing**: Added high-performance indexes to Attendance and Activity Logs. Dashboards now load up to 5x faster.
- **ID Resolution**: System-wide fix for "ID Mismatch" issues. Alphanumeric Employee IDs (EJB...) are now automatically resolved to internal UUIDs for all API calls.
- **JSONB Ready**: Backend is fully optimized for PostgreSQL JSONB operators to speed up targeted announcements and geolocation.

### 🌍 Universal Timezone Standardization
- **Asia/Kolkata (IST)**: Unified date and time formatting across all 20+ UI components and backend exports. No more UTC-drift bugs.

---

## Features

### Authentication & Security
- JWT with refresh tokens, 7-30 day sessions
- Password complexity enforcement (8+ chars, upper/lower/digit/special)
- 90-day password expiry for admin roles
- Account lockout after 5 failed attempts (15 min)
- Role hierarchy enforcement (root > admin > manager > teamlead > developer)

### Employee Management
- CRUD with search, filter, pagination
- **Live Online Status** indicator with pulsing badges
- Profile avatar upload
- **Professional Excel Export** (Multi-session support per row)

### Attendance
- **Manual Management**: Intentional Check-in and Check-out
- **Daily Summary**: Records up to 3 distinct work sessions per day
- QR code check-in with time-limited tokens
- Geolocation check-in with configurable office radius
- Comprehensive attendance history with duration tracking

### Leave Management
- Request/approval workflow
- Balance tracking by leave type (Annual, Sick, Casual)
- Overlap prevention
- Email notifications (via Bull queue when Redis available)

### Payroll & Salary
- Payroll processing with allowances/deductions
- Monthly salary slip generation
- Download tracking with timestamps

### HR Workflows
- Resignation submission/approval
- Onboarding task manager with checklist
- **Manual Holiday Management**

### Internal Communication
- Direct messaging + group chats via Socket.io
- **Voice Messages** and 50MB file sharing
- **Online status** sync in chat contact list

---

## Tech Stack

### Frontend
| Library | Use |
|---------|-----|
| React 19 | UI |
| Vite 8 | Build |
| Tailwind CSS 3.4 | Styling |
| React Router 7 | Routing |
| Recharts | Charts |
| ExcelJS | Professional Excel Generation |
| Axios | HTTP client |

### Backend
| Library | Use |
|---------|-----|
| Node.js 22 | Runtime |
| Express 5 | HTTP framework |
| Knex.js 3 | SQL query builder |
| PostgreSQL 16 | Database |
| Redis 7 | Cache, rate limiter store, async queue |
| Bull | Background job queue |
| Socket.io | WebSocket |
| JWT + bcryptjs | Auth |
| Winston | Logging |
| Zod | Request validation |
| Supabase JS | File storage |

---

## Development

### With Docker (recommended)

```bash
# Start PostgreSQL + Redis + API server
docker compose up --build

# Run migrations + seed
docker compose exec server sh -c "npx knex migrate:latest --knexfile knexfile.js && node seeds/seed.js"
```

### Without Docker (SQLite)

```bash
cd server
npm install
cp .env.example .env
# Edit .env: leave DATABASE_URL unset, ensure NODE_ENV=development
npm run dev
```

---

## Project Structure

```
├── server/                        # Express API (IST Standardized)
│   ├── controller/                # Route handlers (ID-resolved)
│   ├── migrations/                # Schema migrations (Indexed)
│   ├── utils/                     # dbUtils, dateUtils, socket, format
│   └── index.js                   # Entry point (Express 5 Regex Routing)
│
├── Frontend/                      # React SPA
│   ├── src/
│   │   ├── components/            # Standardized UI Components
│   │   ├── utils/                 # format.js, excel.jsx, dateUtils.js
│   └── vite.config.js
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `PathError: Missing parameter` | Ensure wildcard routes in `index.js` use `app.get(/.*/, ...)` regex |
| `no data to export` | Verify Employee ID vs UUID resolution in `checkinController` |
| Port conflict (3000) | Change `PORT` in `.env` |
| Redis connection refused | Remove `REDIS_URL` from `.env` (graceful fallback) |

---

## License

MIT License — see [LICENSE](LICENSE).
