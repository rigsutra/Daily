# Daily — Personal Productivity Tracker

A full‑stack TypeScript web application for tracking daily habits, work/study time, tasks, goals, and mobile screen usage.

**Live demo:** https://daily.ashishserver.space

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Dashboard
- 24‑hour progress bar showing used vs. remaining time.
- Productivity score calculated from tracked habits.
- Stat cards for work hours, study hours, mobile usage, gym, water, sleep, and task completion.
- Time‑distribution pie chart.
- Top‑apps horizontal bar chart.

### Tasks (Task Board)
- Recurring daily tasks with numeric targets and optional mandatory flag.
- Daily completion logging; tasks auto‑complete when target reached.
- Progress bar for today’s tasks.
- Friction‑protected deletion (1000‑character justification stored as a `DeleteRequest`).

### Timer
- Session types: `work`, `study`, `break`.
- Pause / resume / stop controls with server‑side persistence.
- Live elapsed display synced with server state.
- Year‑countdown cards showing productive hours left for today, month, and year.

### Goals
- Weekly / Monthly / Yearly goals with target hours.
- Manual or API‑driven progress updates.
- Nightly cron job marks expired goals as **completed** or **failed**.

### Reports
- Weekly summary cards (work, study, timer, monthly average).
- Weekly bar chart of daily work & study hours.
- Monthly line chart of productive hours per day.

### Mobile Usage Sync
- Unauthenticated POST endpoint (`/api/mobile-usage/sync`) to ingest screen‑time data from a phone.
- `/api/mobile-usage/today` returns today’s per‑app usage and total minutes.
- Settings page displays payload format and user‑ID for mobile automation.

### Auth
- Register / login with JWT and bcrypt hashed passwords.
- Protected routes require `Bearer <token>` (except login, register, health, and mobile‑usage endpoints).
- Profile endpoint (`/api/auth/profile`).

### API & Docs
- Swagger UI at `/api-docs`.
- Health check endpoint (`GET /api/health` returns `{ "status": "ok" }`).

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Backend** | Express 5, Prisma 7 (SQLite via better-sqlite3), JWT auth, Swagger UI |
| **Frontend** | React 19, Vite 6, TypeScript, Tailwind CSS 4, Zustand, Recharts, React Router 7, Axios |
| **Deployment** | PM2 (`ecosystem.config.cjs`), production at `/root/apps/daily/` |

---

## Repository Structure
```
Daily/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Request handlers (one per domain)
│   │   ├── routes/        # Express routers (one per domain)
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Prisma DB queries
│   │   ├── middleware/    # auth.ts (JWT authenticate)
│   │   ├── db.ts          # Prisma client singleton
│   │   ├── swagger.ts     # Swagger spec config
│   │   └── index.ts       # App entry point, cron jobs
│   └── prisma/
│       └── schema.prisma  # Data models
├── frontend/
│   └── src/
│       ├── pages/         # Route-level components
│       ├── components/    # Shared UI (StatCard, Sidebar, Layout)
│       ├── store/         # Zustand stores (auth, timer)
│       ├── api/           # Axios API clients (one per domain)
│       ├── types/         # Shared TypeScript types
│       └── utils/         # yearCalc helper
└── ecosystem.config.cjs   # PM2 configuration
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10
- Git

### Development
Run all commands from the **repo root** (npm workspaces).

```bash
# From root
npm run dev:backend             # tsx watch (hot reload)
npm run dev:frontend            # Vite dev server (port 5173)
npm run build                   # build both packages
npm run build:backend           # tsc → backend/dist/
npm run build:frontend          # tsc + vite build → frontend/dist/
npm run start:backend           # node backend/dist/index.js

# Or run workspace scripts directly
npm run dev -w backend
npm run dev -w frontend
```

---

## Environment Variables
Create a `.env` file inside the `backend/` directory. The most common variables are:
```
# Server
PORT=3001               # Port for the Express server (default 3001 in production)
JWT_SECRET=your_secret  # Secret for signing JWTs (required)
TOKEN_EXPIRES_IN=7d      # JWT expiration, e.g., "7d"

# Prisma/SQLite
DATABASE_URL=file:./dev.db   # SQLite file path (relative to backend/)
```
You can add additional variables as needed (e.g., for email services).

---

## Available Scripts
From the repository root:
| Script | Description |
|---|---|
| `npm run dev:backend` | Starts the backend in watch mode (tsx). |
| `npm run dev:frontend` | Starts the Vite dev server. |
| `npm run build` | Builds both backend (tsc) and frontend (vite). |
| `npm run build:backend` | Compiles backend TypeScript to `backend/dist/`. |
| `npm run build:frontend` | Compiles frontend and outputs to `frontend/dist/`. |
| `npm run start:backend` | Runs the compiled backend (`node backend/dist/index.js`). |

---

## API Documentation
Once the backend is running, visit **`http://localhost:3001/api-docs`** to explore the OpenAPI (Swagger) interface. All protected endpoints expect the `Authorization: Bearer <JWT>` header.

Key route groups (see the Swagger UI for full details):
- **Auth** – `/api/auth/*` (register, login, profile).
- **Timer** – `/api/timer/*` (start, pause, resume, stop, get sessions).
- **Tasks** – `/api/tasks/*` (CRUD, completions).
- **Goals** – `/api/goals/*` (CRUD, progress).
- **Mobile Usage** – `/api/mobile-usage/sync` (unauthenticated POST), `/api/mobile-usage/today` (GET).
- **Health** – `/api/health`.

---

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/awesome-feature`).
3. Ensure the code compiles (`npm run build`).
4. Write or update tests where applicable.
5. Submit a pull request with a clear description of the change.

All code should adhere to the existing coding style (Prettier + ESLint configuration provided in each workspace).

---

## License
This project is licensed under the MIT License – see the `LICENSE` file for details.