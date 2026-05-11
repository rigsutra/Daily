# Daily Project – Full Feature Documentation

---

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Core Features](#core-features)
   - [Authentication & Authorization](#authentication--authorization)
   - [Dashboard](#dashboard)
   - [Tasks (Task Board)](#tasks-task-board)
   - [Timer](#timer)
   - [Goals](#goals)
   - [Reports](#reports)
   - [Calendar](#calendar)
   - [Mobile Usage (Device‑Based Sync)](#mobile-usage-device‑based-sync)
   - [Health & Miscellaneous Endpoints](#health--miscellaneous-endpoints)
4. [Data Model (Prisma Schema)](#data-model-prisma-schema)
5. [Backend Architecture](#backend-architecture)
   - [Controllers → Services → Repositories]
   - [Routing Structure]
   - [Middleware](#middleware)
   - [Cron Jobs]
6. [Frontend Architecture](#frontend-architecture)
   - [Pages & Components](#pages--components)
   - [State Management (Zustand)]
   - [API Layer (Axios Clients)]
7. [Feature Inter‑dependencies & Sync Flow](#feature-inter‑dependencies--sync-flow)
8. [Testing Strategy](#testing-strategy)
9. [Deployment & Operations](#deployment--operations)
10. [Contributing Guidelines (LLM Friendly)](#contributing-guidelines-llm-friendly)
11. [Change Log & Versioning](#change-log--versioning)
12. [License](#license)
---

## Overview
The **Daily** project is a full‑stack TypeScript application that helps users track personal productivity across multiple domains:
- **Time** (work / study / break sessions via a timer)
- **Tasks** (daily recurring tasks with optional mandatory flag)
- **Goals** (weekly/monthly/yearly hour‑based targets)
- **Mobile Screen Usage** (device‑based sync for screen‑time insights)
- **Health metrics** (sleep, water, gym, etc.)
All data is stored locally using **SQLite** via **Prisma**, exposed through a **REST API** built with **Express 5**, and consumed by a **React 19** front‑end built with **Vite 6** and styled with **Tailwind CSS**.

---

## Tech Stack
| Layer | Technology |
|---|---|
| **Backend** | Express 5, Prisma 7 (SQLite via better‑sqlite3), JWT, Swagger UI |
| **Frontend** | React 19, Vite 6, TypeScript, Tailwind CSS 4, Zustand, Recharts, React Router 7, Axios |
| **Deployment** | PM2 (`ecosystem.config.cjs`), production at `/root/apps/daily/` |
| **Language** | TypeScript (ESM) |
| **Testing** | Jest (unit/integration), Playwright (e2e) |
| **CI** | GitHub Actions (not shown in repo but typical) |

---

## Core Features
### Authentication & Authorization
- **Endpoints**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`.
- **Mechanism**: Passwords hashed with bcrypt; JWT signed with `JWT_SECRET`.
- **Protected routes** use the `authenticate` middleware which validates the `Authorization: Bearer <token>` header and injects `req.userId`.

### Dashboard
- **Purpose**: Provides a single‑page snapshot of today’s productivity.
- **Data Sources**:
  - Timer sessions (`timerMinutes`)
  - Daily entry record (`workHours`, `studyHours`, `sleepHours`, etc.)
  - Mobile usage minutes (summed from linked devices)
  - Task completion statistics
- **Visuals**:
  - 24‑hour (or free‑time) progress bar.
  - Productivity score (completed tasks / total tasks).
  - Pie chart for time distribution.
  - Horizontal bar for top distracting apps.
- **Logic**: The dashboard service computes `hoursUsed`, `hoursRemaining`, and `productivityScore`. Weekday free‑time is capped at **5.5 h** after deducting sleep (7.5 h), office (10 h), and travel (1 h).

### Tasks (Task Board)
- **CRUD**: `POST /api/tasks`, `GET /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`.
- **Features**:
  - Recurring daily tasks with numeric `target` and optional `mandatory` flag.
  - Automatic completion when `completed >= target`.
  - Deleting a mandatory task requires a `justification` (saved as a `DeleteRequest`).
  - Tasks are linked to a **date**; the UI shows today’s list and progress bar.
- **Inter‑dependency**: Dashboard pulls task counts and completion percentages.

### Timer
- **Session Types**: `work`, `study`, `break`.
- **Endpoints**: `POST /api/timer/start`, `PATCH /api/timer/pause`, `PATCH /api/timer/resume`, `PATCH /api/timer/stop`, `GET /api/timer/sessions`.
- **Persistence**: Sessions are stored in `TimerSession` table; a nightly cron can clean old data if needed.
- **Frontend**: Controls live elapsed time, pause/resume, and feeds data into the dashboard’s hourly calculations.

### Goals
- **CRUD**: `POST /api/goals`, `GET /api/goals`, `PATCH /api/goals/:id`, `DELETE /api/goals/:id`.
- **Types**: Weekly, Monthly, Yearly – each has a `targetHours`.
- **Progress Updates**: API can be called manually or via cron that aggregates timer usage.
- **Cron Job** (midnight):
  - Checks all *active* `Goal` records where `endDate < now()`.
  - If `hoursCompleted >= targetHours` → `status = 'completed'`; otherwise `status = 'failed'`.
- **Sync**: Dashboard shows goal progress bars and remaining hours.

### Reports
- **Purpose**: Historical view of productivity.
- **Components**:
  - Weekly summary cards (work, study, timer, avg per month).
  - Weekly bar chart of daily work & study hours.
  - Monthly line chart of productive hours per day.
- **Data**: Aggregated from `TimerSession`, `DailyEntry`, and `TaskCompletion` tables.

### Calendar
- **Monthly view** with clickable dates.
- **On‑click** opens a Kanban board for that day, split into:
  - Completed tasks
  - Not completed tasks
  - Mandatory tasks (with completion status)
- **Integration**: Uses same task APIs but filtered by `date`.

### Mobile Usage (Device‑Based Sync)
- **New Flow** (replacing the old unauthenticated `/api/mobile-usage/sync`):
  1. **Link Device** – Authenticated `POST /api/usage/link-device` with `{ deviceId }` ties a device to the logged‑in user (`UserDevice` table).
  2. **Sync From Device** – Open `POST /api/usage/today` (no auth) with payload:
     ```json
     {
       "deviceId": "string",
       "capturedAt": "ISO‑date",
       "apps": [
         {
           "packageName": "com.example.app",
           "appName": "Example",
           "usageMinutes": 12,
           "lastUsed": 1683679200000   // epoch ms
         }
       ]
     }
     ```
  3. Backend upserts each app entry keyed by `(deviceId, packageName, date)`.
  4. **Dashboard** pulls today’s usage via `GET /api/mobile-usage/today` (auth required) which aggregates across **all devices linked to the user**.
- **Data Model Changes**:
  - `MobileUsage` now stores `deviceId`, `packageName`, optional `lastUsed`.
  - New `UserDevice` maps `deviceId → userId`.
- **Impact**: Enables multiple phones/tablets per user, and decouples screen‑time data from the user ID.

### Health & Miscellaneous Endpoints
- `GET /api/health` – Simple health check returning `{ "status": "ok" }`.
- Swagger UI (`/api-docs`) – Auto‑generated from `backend/src/swagger.ts`.

---

## Data Model (Prisma Schema)
```prisma
model User {
  id               Int                @id @default(autoincrement())
  email            String             @unique
  passwordHash     String
  tasks            Task[]
  timerSessions    TimerSession[]
  goals            Goal[]
  dailyEntries     DailyEntry[]
  deleteRequests   DeleteRequest[]
  yearCalculations YearCalculation[]
  userDevices      UserDevice[]
}

model DailyEntry {
  id          Int      @id @default(autoincrement())
  userId      Int
  date        DateTime @unique
  workHours   Float?
  studyHours  Float?
  gymHours    Float?
  waterIntake Int?
  sleepHours  Float?
  user        User     @relation(fields: [userId], references: [id])
}

model Task {
  id          Int      @id @default(autoincrement())
  userId      Int
  title       String
  target      Int
  unit        String
  mandatory   Boolean @default(false)
  date        DateTime
  completed   Int     @default(0)
  completedAt DateTime?
  user        User     @relation(fields: [userId], references: [id])
}

model MobileUsage {
  id          Int      @id @default(autoincrement())
  deviceId    String
  appName     String
  packageName String
  minutesUsed Int
  lastUsed    DateTime?
  category    String   @default("")
  date        DateTime
  @@unique([deviceId, packageName, date])
}

model UserDevice {
  id        Int      @id @default(autoincrement())
  userId    Int
  deviceId  String   @unique
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model Goal {
  id           Int      @id @default(autoincrement())
  userId       Int
  type         String   // weekly | monthly | yearly
  targetHours  Float
  startDate    DateTime
  endDate      DateTime
  status       String   @default("active") // active|completed|failed
  user         User     @relation(fields: [userId], references: [id])
}

model TimerSession {
  id        Int      @id @default(autoincrement())
  userId    Int
  type      String   // work | study | break
  startAt   DateTime
  endAt     DateTime?
  user      User     @relation(fields: [userId], references: [id])
}

model DeleteRequest {
  id            Int      @id @default(autoincrement())
  userId        Int
  taskId        Int
  justification String
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id])
}

model YearCalculation {
  id        Int      @id @default(autoincrement())
  userId    Int
  year      Int
  totalHours Float
  user      User     @relation(fields: [userId], references: [id])
}
```
All relations are **one‑to‑many** from `User` to each domain entity.

---

## Backend Architecture
### Controllers → Services → Repositories
- **Controllers** handle HTTP request/response, translate payloads, and forward to **services**.
- **Services** contain business logic (e.g., calculating dashboard metrics, syncing mobile usage, linking devices).
- **Repositories** are thin wrappers around Prisma queries, keeping DB access isolated.

### Routing Structure (`backend/src/routes`)
- `auth.routes.ts` – Auth endpoints.
- `timer.routes.ts` – Timer session management.
- `task.routes.ts` – Task CRUD and completions.
- `goal.routes.ts` – Goal CRUD.
- `dashboard.routes.ts` – Dashboard aggregates.
- `usage.routes.ts` – New device‑based mobile usage sync & device linking.
- `mobileUsage.routes.ts` – Kept for backward compatibility (now only provides `/today`).

### Middleware
- `auth.ts` – Validates JWT, sets `req.userId`.
- Global error handling (not shown but part of Express config).

### Cron Jobs
- Defined in `backend/src/index.ts`.
- **Midnight job** iterates over active `Goal` records, updates `status` based on `hoursCompleted`.
- Runs via `node-cron` (or any scheduler configured in PM2).

---

## Frontend Architecture
### Pages & Components (`frontend/src/pages` & `components`)
- **Pages**: `Dashboard`, `Tasks`, `Timer`, `Goals`, `Reports`, `Settings`, `Calendar`, `Login`, `Register`.
- **Shared UI**: `StatCard`, `Sidebar`, `Layout`, `ProtectedRoute`.
- Each page fetches data from the corresponding **API client**.

### State Management (Zustand)
- Separate stores for **auth** (`auth.store.ts`) and **timer** (`timer.store.ts`).
- Stores expose actions (`login`, `logout`, `startTimer`, `pauseTimer`, etc.) and selectors for components.

### API Layer (`frontend/src/api`)
- One Axios instance (`client.ts`) with base URL and auth interceptor.
- Domain‑specific clients (`tasks.ts`, `timer.ts`, `goals.ts`, `dashboard.ts`, `mobileUsage.ts`).
- Keeps request/response typing aligned with backend TypeScript interfaces.

---

## Feature Inter‑dependencies & Sync Flow
1. **User Authentication** → required for all protected APIs (tasks, goals, timer, dashboard, usage). The JWT is stored in `localStorage` and injected by the Axios interceptor.
2. **Timer → Dashboard**: Timer sessions contribute minutes to `hoursUsed` and to the productivity score.
3. **Tasks → Dashboard**: Task completion counts determine the productivity score and are displayed in the dashboard’s task progress bar.
4. **Goals → Dashboard**: Goal progress (percentage of target hours achieved) is shown as separate cards; the midnight cron updates goal status, which the dashboard reads next day.
5. **Mobile Usage → Dashboard**: After a device syncs via `/api/usage/today`, the backend aggregates usage for every device linked to the user. The dashboard fetches `/api/mobile-usage/today` to show total mobile minutes and the top 5 distracting apps.
6. **Calendar → Tasks**: Calendar filters tasks by selected date, re‑using the same task service; any changes made via the calendar view instantly reflect on the dashboard because they share the same backend source.
7. **Reports → Timer & DailyEntry**: Report pages query aggregated timer sessions and daily entry records to plot historical charts.

---

## Testing Strategy
- **Unit Tests** (`backend/test/*.test.ts`) cover services and repositories using an in‑memory SQLite DB.
- **Integration Tests** hit the Express routes via Supertest, verifying authentication, validation, and business rules.
- **End‑to‑End (Playwright)** tests in `e2e/` simulate user flows: login → add task → start timer → view dashboard → sync mobile usage.
- All test suites run via `npm test` (Jest) and `npm run test:e2e` (Playwright).

---

## Deployment & Operations
- **PM2 ecosystem** (`ecosystem.config.cjs`) defines two apps: `backend` (port 3001) and `frontend` (served static files after `vite build`).
- **Environment variables** are loaded from `.env` at runtime (backend only). Production uses the compiled `dist/` directories.
- **Database** lives in `backend/prisma/dev.db` (development) or `backend/prisma/prod.db` in production; migrations are managed via `prisma migrate`.
- **Swagger UI** provides live API docs for developers and integration testing.

---

## Contributing Guidelines (LLM Friendly)
- Follow the **LLM_INSTRUCTIONS.md** file for safety, commit hygiene, and workflow.
- When adding a feature, update:
  1. Prisma schema + migration (`npx prisma migrate dev`).
  2. Backend controller → service → repository.
  3. Swagger spec (if new endpoint).
  4. Front‑end API client, page/component, and Zustand store if stateful.
  5. Tests for both backend and frontend.
  6. README (high‑level) and this **PROJECT_DOCUMENTATION.md** (detailed).  
- Keep changes atomic; each commit should have a clear purpose.
- Do **not** commit generated files (`node_modules`, `dist`, `.env`).

---

## Change Log & Versioning
All notable changes are recorded in `CHANGELOG.md`. Semantic versioning is used: `MAJOR.MINOR.PATCH`.

---

## License
The project is licensed under the MIT License – see the `LICENSE` file for details.

---

*Document generated on $(date) and kept in sync with the source code.*