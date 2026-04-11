# Daily — CLAUDE.md

## Project Overview

Full-stack personal productivity tracking system. Backend is a REST API; frontend is a React SPA. Both are TypeScript.

## Stack

| Layer | Tech |
|---|---|
| Backend | Express 5, Prisma 7 (SQLite via better-sqlite3), JWT auth, Swagger UI |
| Frontend | React 19, Vite 6, Tailwind CSS 4, Zustand, Recharts, React Router 7, Axios |
| Deployment | PM2 (`ecosystem.config.cjs`), production at `/root/apps/daily/` |

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
└── ecosystem.config.cjs   # PM2 config
```

## API Base URL

- Dev: `http://localhost:3001`
- Prod: `https://backenddaily.ashishserver.space`
- Swagger docs: `/api-docs`

## Key Conventions

- All backend routes (except `/api/mobile-usage/today`, `/api/mobile-usage/sync`, `/api/health`) require a `Bearer` JWT in the `Authorization` header.
- `/api/mobile-usage/sync` and `/api/mobile-usage/today` are intentionally unauthenticated (used by mobile devices).
- Backend uses ES modules (`"type": "module"`). Imports must use `.js` extensions even for `.ts` source files.
- Prisma uses the `driverAdapters` preview feature with `better-sqlite3`.
- Frontend state is managed with Zustand; no Redux or Context API.

## Dev Commands

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

## Data Models

`User`, `DailyEntry`, `Task`, `TaskCompletion`, `TimerSession`, `Goal`, `MobileUsage`, `DeleteRequest`, `YearCalculation`

## Cron Jobs

- **Daily at midnight**: checks all active `Goal` records past their `endDate` and marks them `completed` or `failed`.
