# Daily — Personal Productivity Tracker

A full-stack web app to track daily habits, work/study time, tasks, goals, and mobile screen usage.

**Live:** https://daily.ashishserver.space

---

## Features

### Dashboard
- **24-hour progress bar** — shows how much of the day has been used vs. remaining.
- **Productivity score** — calculated daily score based on tracked habits.
- **Stat cards** — quick-glance view of work hours, study hours, mobile usage, gym status, water intake, sleep, and task completion count.
- **Time distribution pie chart** — breakdown of the day across work, study, mobile, sleep, and free time.
- **Top apps bar chart** — horizontal bar chart of the most-used mobile apps today.

### Tasks (Task Board)
- **Recurring daily tasks** — create tasks with a title, numeric target, unit (e.g. "1 hour", "4 liters"), and optional mandatory flag.
- **Daily completion logging** — enter achieved value per task; task auto-marks as complete when target is met.
- **Today's progress bar** — shows X/Y tasks done as a percentage.
- **Friction-protected deletion** — deleting a task requires typing a 1000-character justification reason, stored in the DB as a `DeleteRequest`.

### Timer
- **Session types** — start a `work`, `study`, or `break` timer session.
- **Pause / Resume / Stop** — full session lifecycle control; paused state is persisted server-side.
- **Live elapsed display** — `HH:MM:SS` counter that syncs with server state on load.
- **Year countdown cards** — shows productive hours available today, days/free-hours left in the current month, and days/free-hours left in the year.

### Goals
- **Weekly / Monthly / Yearly goals** — create goals with a title, period, and target hours.
- **Progress tracking** — progress bar and percentage per goal, updated manually or via the API.
- **Automatic status resolution** — a nightly cron job marks expired goals as `completed` or `failed` based on achieved vs. target hours.

### Reports
- **Weekly summary cards** — total work hours, study hours, timer hours, and monthly average productive hours per day.
- **Weekly bar chart** — per-day breakdown of work and study hours across the current week.
- **Monthly line chart** — productive hours per day over the current month.

### Mobile Usage Sync
- **App usage ingestion** — POST endpoint (`/api/mobile-usage/sync`) accepts screen time data (app name, minutes used, category) sent from a phone automation (no auth required).
- **Today's usage view** — `/api/mobile-usage/today` returns today's per-app usage and total minutes.
- **Settings page** — shows the exact payload format and user ID for setting up the sync on a mobile device.

### Auth
- **Register / Login** — JWT-based authentication with bcrypt password hashing.
- **Protected routes** — all pages except Login and Register require a valid token.
- **Profile** — view current user profile via `/api/auth/profile`.

### API & Docs
- **Swagger UI** — interactive API documentation at `/api-docs`.
- **Health endpoint** — `GET /api/health` returns `{ status: "ok" }`.

---

## Tech Stack

| | |
|---|---|
| Backend | Node.js, Express 5, TypeScript, Prisma 7, SQLite (better-sqlite3), JWT, Swagger |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS 4, Zustand, Recharts, React Router 7 |
| Deployment | PM2, served at `ashishserver.space` |

---

## Getting Started

```bash
# Backend
cd backend
npm install
npm run dev        # starts on port 3001

# Frontend
cd frontend
npm install
npm run dev        # starts on port 5173
```

Set `PORT` in a `.env` file in `backend/` if needed (defaults to `3000` in dev, `3001` in PM2).
