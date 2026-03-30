# Elegance EMS

<div align="center">

![Elegance Logo](Frontend/src/assets/Logo/EG.png)

### Enterprise-Grade Employee Management System

[![React](https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/HarizenCodeDev/Elegance-it-geo-infotech/pulls)

**A modern, secure, and feature-rich employee management system built for scalability.**

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 🎯 Overview

Elegance EMS is a comprehensive employee management platform designed for modern organizations. It combines a sleek dark-themed UI with enterprise-grade security features, providing complete control over employee data, attendance tracking, leave management, and internal communications.

### Key Highlights

- 🔐 **Enterprise Security** — JWT authentication, password policies, session management, account lockout
- 👥 **Role-Based Access** — 6 roles with granular permissions (Root, Admin, Manager, HR, Team Lead, Developer)
- 📊 **Real-Time Analytics** — Interactive dashboards with live statistics and visualizations
- 💬 **Internal Communication** — WhatsApp-style messaging with real-time updates
- 📱 **Responsive Design** — Optimized for desktop, tablet, and mobile devices
- ⚡ **Modern Stack** — React 18, Vite, Express, PostgreSQL

---

## ✨ Features

### Authentication & Security

| Feature | Description |
|---------|-------------|
| JWT Authentication | Secure token-based authentication with refresh tokens |
| Password Complexity | Enforced complexity rules for admin roles (8+ chars, uppercase, lowercase, numbers, special chars) |
| Password Expiry | Auto-expiry after 90 days for admin accounts |
| Password History | Prevents reuse of last 5 passwords |
| Account Lockout | 5 failed attempts triggers 15-minute lockout |
| Session Management | Track, view, and terminate active sessions across devices |
| Remember Me | Extended 30-day sessions with secure token storage |

### Core Modules

| Module | Features |
|--------|----------|
| **Dashboard** | Real-time statistics, charts, celebrations, notifications |
| **Employees** | Complete CRUD, search, filter, export to Excel, profile management |
| **Attendance** | Auto check-in/out, manual entry, calendar view, status tracking |
| **Leave Management** | Request, approve, reject, balance tracking, overlap prevention |
| **Announcements** | Create, prioritize, broadcast company-wide updates |
| **Internal Chat** | Direct messages, group chats, emoji support, real-time updates |
| **Holidays** | Manage company holidays, calendar integration |
| **Activity Logs** | Complete audit trail of all system actions |
| **Notifications** | Real-time in-app notifications with read/unread tracking |

### User Experience

| Feature | Description |
|---------|-------------|
| Cinematic Loader | Premium animated loading screen with progress indicator |
| Skeleton Loading | Smooth skeleton screens while data fetches |
| Dark Theme | Modern sleek dark-themed UI |
| Responsive Design | Fully responsive across all devices |
| Toast Notifications | Non-intrusive feedback system |
| Excel Export | Export data to Excel with one click |

### AI-Powered Features

| Feature | Description |
|---------|-------------|
| **AI Security Engine | Real-time threat detection, brute force protection, login anomaly detection |
| **Smart Search | Unified search across employees, leaves, and announcements |
| **HR Chatbot | AI assistant for leave, attendance, and policy queries |
| **Attendance Insights | Pattern analysis, anomaly detection, trend predictions |
| **Leave Prediction | Pattern analysis and team forecasting |
| **Token Blacklist | Session termination and force logout capability |

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI library |
| Vite | 8.x | Build tool |
| Tailwind CSS | 3.4 | Styling |
| React Router | 6.x | Routing |
| Recharts | 2.x | Data visualization |
| Lucide React | Latest | Icon library |
| Axios | Latest | HTTP client |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | Runtime |
| Express | 4.x | Web framework |
| Knex.js | 3.x | Query builder |
| PostgreSQL | 16.x | Production database |
| SQLite | 3.x | Development database |
| JWT | 9.x | Authentication |
| Bcrypt | Latest | Password hashing |
| Socket.io | 4.x | Real-time communication |
| Zod | Latest | Schema validation |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+ (for production)
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/HarizenCodeDev/Elegance-it-geo-infotech.git
cd Elegance-it-geo-infotech

# Backend Setup
cd server
npm install
cp .env.example .env  # Edit with your configuration
npm run db:migrate
npm run db:seed
npm run dev

# Frontend Setup (new terminal)
cd ../Frontend
npm install
npm run dev
```

### Access

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)

### Default Credentials

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Root | mrnobody@elegance.com | mrnobody009 |

---

## 📁 Project Structure

```
Elegance/
├── 📂 server/                 # Express.js backend
│   ├── 📂 config/            # Database configuration
│   ├── 📂 controller/         # Business logic
│   ├── 📂 middleware/         # Auth, validation, error handling
│   ├── 📂 migrations/         # Database schema
│   ├── 📂 routes/            # API endpoints
│   ├── 📂 seeds/             # Initial data
│   ├── 📂 utils/            # Helpers (Socket.io, Redis, Sentry)
│   ├── 📂 uploads/          # File uploads
│   ├── 📂 logs/             # Server logs
│   └── index.js             # Entry point
│
└── 📂 Frontend/             # React frontend
    ├── 📂 src/
    │   ├── 📂 components/    # Reusable UI components
    │   ├── 📂 pages/        # Route pages
    │   ├── 📂 context/      # React context
    │   ├── 📂 assets/        # Static assets
    │   └── App.jsx          # Root component
    └── index.html
```

---

## 🔗 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/profile` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/:id` | Get employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |

### Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | List attendance records |
| POST | `/api/attendance` | Create attendance |
| GET | `/api/attendance/my` | My attendance |
| POST | `/api/checkin/check-in` | Check in |
| POST | `/api/checkin/check-out` | Check out |

### Leaves

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaves` | List leaves |
| POST | `/api/leaves` | Create leave request |
| PUT | `/api/leaves/:id/status` | Approve/reject |
| GET | `/api/leave-balance/balance` | Get balance |

### Additional Endpoints

| Resource | Methods |
|----------|---------|
| `/api/announcements` | GET, POST, DELETE |
| `/api/chat` | GET groups, messages, POST send |
| `/api/notifications` | GET, PUT read |
| `/api/holidays` | GET, POST, DELETE |
| `/api/activity-logs` | GET |
| `/api/auth/sessions` | GET, DELETE |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/attendance-insights` | AI-powered attendance analysis |
| GET | `/api/ai/search?q=query` | Smart unified search |
| GET | `/api/ai/leave-prediction` | Leave predictions & forecasts |
| POST | `/api/ai/chat` | HR Chatbot conversation |
| DELETE | `/api/ai/chat/:conversationId` | Clear chat history |

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   INPUT     │  │  AUTHENTI-  │  │  AUTHORI-   │          │
│  │  VALIDATION │  │   CATION    │  │   ZATION    │          │    
│  │  (Zod)      │  │   (JWT)     │  │  (RBAC)     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  PASSWORD   │  │  SESSION    │  │   RATE      │          │
│  │   (bcrypt) │  │ MANAGEMENT   │  │  LIMITING   │          │
│  │  12 rounds  │  │  (Redis)    │  │  (express)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   HTTPS     │  │   HELMET    │  │   ERROR     │          │
│  │  (SSL/TLS)  │  │  (Headers)  │  │  HANDLING   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role Permissions Matrix

| Feature | Root | Admin | Manager | HR | Team Lead | Developer |
|---------|:----:|:-----:|:-------:|:--:|:---------:|:---------:|
| Full Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Employees | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Leaves | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Activity Logs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Holidays | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Password Reset | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🌐 Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### PM2 (Production)

```bash
# Backend
cd server
pm2 start index.js --name elegance-backend

# Frontend (after build)
pm2 serve dist/ --name elegance-frontend --port 5173
```

### Environment Variables

```env
# Server (.env)
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
DB_URL=postgresql://user:pass@host:5432/elegance_ems
JWT_SECRET=your-super-secret-key-min-32-chars
PASSWORD_EXPIRY_DAYS=90
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Frontend (.env)
VITE_API_BASE_URL=https://api.your-domain.com
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# E2E tests with Playwright
npx playwright test

# Backend unit tests
cd server && npm test

# Frontend component tests
cd Frontend && npm run test
```

---

## 📈 Performance

| Optimization | Implementation |
|--------------|----------------|
| Code Splitting | React.lazy() for route-based loading |
| Bundle Optimization | Separate vendor chunks (React, Charts, Utils) |
| Lazy Loading | Charts, Excel export loaded on demand |
| Skeleton Screens | Smooth loading states with shimmer animation |
| Caching | Redis session storage |
| Compression | Gzip compression enabled |

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">

### Built with ❤️ by [HarizenCodeDev](https://github.com/HarizenCodeDev)

**© 2026 Elegance IT & Geo Synergy. All rights reserved.**

</div>
