# 🎯 Elegance EMS

<div align="center">

[![Elegance Logo](Frontend/src/assets/Logo/EG.png)](#)

### Enterprise Employee Management System

[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?style=flat&logo=nodedotjs)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-lightgrey?style=flat&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/Supabase-PostgreSQL-blueviolet?style=flat&logo=postgresql)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat&logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)](LICENSE)

**A modern, secure, and scalable employee management system.**

[Live Demo](#) • [Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started)

</div>

---

## 🚀 Live Production

| Service | URL |
|---------|-----|
| **Frontend** | [elegance-ems-haridevx.vercel.app](https://elegance-ems-haridevx.vercel.app) |
| **Backend API** | [haridevx-eg-server.onrender.com](https://haridevx-eg-server.onrender.com) |

### Default Login
- **Email**: `rootharidevx@elegance.com`
- **Password**: `Rootadmmin@$123`

---

<img width="1922" height="959" alt="it" src="https://github.com/user-attachments/assets/3555eb5c-d686-496e-8204-b28c2d30d165" />
---
<img width="3444" height="3516" alt="diagram" src="https://github.com/user-attachments/assets/25d4eae6-68e8-4229-94f8-aec8bd878a0a" />

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- Password complexity enforcement (8+ chars, uppercase, lowercase, numbers, special)
- Password expiry after 90 days
- Account lockout after 5 failed attempts (15-minute lockout)
- Session management across devices
- Remember Me with extended 30-day sessions

### 👥 Employee Management
- Complete CRUD operations
- Search & filter by department, role, status
- Export to Excel with one click
- Profile management with avatar upload

### 📊 Attendance Tracking
- Auto check-in/check-out
- Manual entry support
- Calendar view with status tracking
- Real-time attendance dashboard

### 📝 Leave Management
- Leave request & approval workflow
- Balance tracking by leave type
- Overlap prevention
- Leave predictions & forecasting

### 💬 Internal Communication
- Direct messaging
- Group chats
- Real-time updates with Socket.io
- Emoji support

### 📢 Additional Features
- Company announcements with priority levels
- Holiday management
- Activity logs & audit trail
- In-app notifications
- Dark-themed UI
- Excel export
- Responsive design

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Library |
| Vite 8 | Build Tool |
| Tailwind CSS 3.4 | Styling |
| React Router 7 | Routing |
| Recharts | Charts |
| Axios | HTTP Client |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 22 | Runtime |
| Express 5 | Framework |
| Knex.js 3 | Query Builder |
| PostgreSQL (Supabase) | Database |
| JWT | Authentication |
| Bcryptjs | Password Hashing |
| Socket.io | Real-time |

### Deployment
| Service | Purpose |
|---------|---------|
| Vercel | Frontend Hosting |
| Render | Backend API |
| Supabase | PostgreSQL Database |

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/HariDevex/Elegance-IT-Geo-Infotech.git
cd Elegance-IT-Geo-Infotech

# Backend Setup
cd server
npm install
cp .env.example .env  # Configure your settings
npm run db:migrate
npm run db:seed
npm run dev

# Frontend Setup (new terminal)
cd ../Frontend
npm install
npm run dev
```

### Access Locally
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api

---

## 📁 Project Structure

```
Elegance-IT-Geo-Infotech/
├── server/                 # Express.js backend
│   ├── config/            # Database configuration
│   ├── controller/        # Business logic
│   ├── middleware/        # Auth, validation, errors
│   ├── migrations/        # Database schema
│   ├── routes/           # API endpoints
│   ├── seeds/            # Initial data
│   ├── utils/            # Helpers
│   └── index.js          # Entry point
│
├── Frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI
│   │   ├── pages/        # Route pages
│   │   ├── context/      # React context
│   │   └── assets/       # Static assets
│   └── index.html
│
├── vercel.json           # Vercel config
└── README.md
```

---

## 🌐 API Endpoints

| Module | Endpoint | Methods |
|--------|----------|---------|
| Auth | `/api/auth/*` | login, logout, profile, change-password |
| Employees | `/api/employees` | CRUD operations |
| Attendance | `/api/attendance` | CRUD, check-in/out |
| Leaves | `/api/leaves` | CRUD, approve/reject |
| Chat | `/api/chat` | messages, groups |
| Notifications | `/api/notifications` | CRUD |
| Holidays | `/api/holidays` | CRUD |
| Activity Logs | `/api/activity-logs` | GET |
| AI Features | `/api/ai/*` | insights, search, chat |

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file.

---

<div align="center">

**© 2026 Elegance IT & Geo Synergy. All rights reserved.**

Built with ❤️ by [HariDevex](https://github.com/HariDevex)

</div>
