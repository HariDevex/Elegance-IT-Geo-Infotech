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

### 🚀 Professional Excel Export
- **Professional Formatting**: Modern dark-blue theme with zebra-striped rows.
- **Auto-Filtering**: Built-in Excel filters on all columns for easier management.
- **Smart Sizing**: Automatic column width adjustment for names and emails.
- **Metadata**: Every report now includes generation timestamps and titles.

### 🟢 Real-time Employee Visibility
- **Who's Online**: Live pulsing badges in the Employee List for active users.
- **Session Sync**: Real-time tracking of active logins within the last 15 minutes.

### 🌍 Universal Timezone Standardization
- **Asia/Kolkata (IST)**: Unified date and time formatting across all 20+ UI components and backend exports.
- **Zero-Drift**: Eliminated UTC rollover bugs that previously caused "off-by-one" day errors in charts.

### 🛠️ Process Improvements
- **Automated Attendance**: "Check In" and "Check Out" buttons removed; attendance is now automatically triggered by login and logout events.
- **Manual Holidays**: Auto-population removed to provide HR with 100% manual control over the holiday calendar.
- **SPA Stability**: Fixed wildcard routing to ensure browser refreshes never cause 404 errors.

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
- **Live Online Status** indicator
- Profile avatar upload
- **Enhanced Professional Excel Export**

### Attendance
- **Fully Automated**: Check-in on login, Check-out on logout
- QR code check-in with time-limited tokens
- Geolocation check-in with configurable office radius
- Comprehensive attendance calendar

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
- **Manual Holiday Management** (Manual entry only for total control)

### Internal Communication
- Direct messaging + group chats via Socket.io
- **Online status** sync in chat contact list

### Notifications
- In-app notifications
- Announcements with priority levels and audience targeting

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
| Vitest | Tests |

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
| Speakeasy + QRCode | 2FA |
| Passport (Google, GitHub) | OAuth |
| Nodemailer | Email |
| Prometheus client | Metrics |
| Sentry | Error tracking |
| Supabase JS | File storage |
| Vitest | Tests |

### Infrastructure
| Service | Use |
|---------|-----|
| Docker Compose | Local dev environment |
| GitHub Actions | CI (lint, migrate, test, build) |
| Render | Backend API hosting (`elegance-it-geo-infotech.onrender.com`) |
| Vercel | Frontend SPA hosting (`elegance-it-geo-infotech.vercel.app`) |
| Supabase | File storage (`kzqheffjtzuwgdzraoqi`) |

---

## Development

### With Docker (recommended)

```bash
# Start PostgreSQL + Redis + API server
docker compose up --build

# Run migrations + seed
docker compose exec server sh -c "npx knex migrate:latest --knexfile knexfile.js && node seeds/seed.js"
```

The server auto-runs migrations on start. To disable, remove `npx knex migrate:latest --knexfile knexfile.js &&` from the `CMD` in `server/Dockerfile`.

### Without Docker (SQLite)

```bash
cd server
npm install
cp .env.example .env
# Edit .env: leave DATABASE_URL unset, ensure NODE_ENV=development
npm run dev
```

SQLite file is `server/data/elegance.db`. To switch to PostgreSQL, set `DATABASE_URL` in `.env`.

### Environment Variables

See `server/.env.example` for all options. Key variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | prod | — | PostgreSQL connection string |
| `JWT_SECRET` | yes | — | JWT signing key (min 32 chars) |
| `REDIS_URL` | no | — | Redis connection string (adds caching, queue, persisted rate limits) |
| `NODE_ENV` | no | `development` | `development`, `production`, or `test` |
| `FRONTEND_URL` | no | `http://localhost:5173` | CORS origin, email links |
| `SENTRY_DSN` | no | — | Sentry error tracking |
| `SUPABASE_URL` | no | — | Supabase project URL (file storage) |
| `SUPABASE_SERVICE_KEY` | no | — | Supabase service role key |
| `SMTP_HOST` | no | — | SMTP server (email notifications) |
| `LOG_LEVEL` | no | `info` | Winston log level |

### Seed Data

```bash
docker compose exec server node seeds/seed.js
```

Creates a root user with credentials from env vars (defaults: `admin@elegance.com` / `admin123`). Employee ID is randomly generated — check seed output.

---

## Project Structure

```
├── server/                        # Express API
│   ├── core/                      # Shared framework
│   ├── config/                    # DB, app config
│   ├── controller/                # Route handlers
│   ├── middleware/                # Auth, validation, errors
│   ├── migrations/                # Knex schema migrations
│   ├── modules/                   # Zod schemas per feature
│   ├── routes/                    # API route definitions
│   ├── seeds/                     # Initial data
│   ├── tests/                     # 60 unit tests
│   ├── utils/                     # Email, OAuth, Redis, logging, dateUtils
│   ├── Dockerfile
│   ├── knexfile.js
│   └── index.js                   # Entry point
│
├── Frontend/                      # React SPA
│   ├── src/
│   │   ├── components/            # UI components (Timezone Standardized)
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── config/
│   │   ├── utils/                 # Excel, Date formatting, API helpers
│   │   └── tests/                 # 13 component tests
│   ├── Dockerfile
│   └── vite.config.js
│
├── docker-compose.yml             # PostgreSQL + Redis + server
├── .github/workflows/ci.yml       # GitHub Actions
└── types/                         # TypeScript definitions
```

---

## Rate Limiting

| Scope | Limit (dev) | Limit (prod) | Window |
|-------|-------------|--------------|--------|
| Global API | 50,000 | 1,000 | 1 hour |
| Sensitive (employees, leaves, announcements) | 10,000 | 200 | 1 hour |
| Login / forgot-password | 20 | 20 | 15 min |

Rate limits persist across restarts when Redis is configured.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `relation "users" does not exist` | Run `npx knex migrate:latest` before seeding |
| Port conflict (3000) | Change `PORT` in `.env` |
| Redis connection refused | Remove `REDIS_URL` from `.env` (graceful fallback) |
| CANNOT GET /api/* | Ensure backend is running on port 3000 |
| 429 Too Many Requests | Reduce request frequency or increase limits in `server/index.js` |
| `"From date cannot be in the past"` | Use YYYY-MM-DD format for leave dates |

---

## License

MIT License — see [LICENSE](LICENSE).
