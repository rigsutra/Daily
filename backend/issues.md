# Backend Issues and Potential Problems

This document lists bugs, design flaws, missing features, and potential improvements identified during code review of the backend.

## 1. Database Configuration
- **Fixed database path**: The Prisma adapter uses a hard‑coded relative path `backend/prisma/dev.db`. In production (PM2) the working directory may differ, causing the database file to be created elsewhere or become inaccessible.
  - *Recommendation*: Use `process.env.DATABASE_URL` and configure Prisma to read from it, or compute an absolute path based on `__dirname`.
- **Missing database health check**: The `/api/health` endpoint does not verify that the database is reachable.

## 2. Authentication & Security
- **JWT secret non‑null assertion**: `process.env.JWT_SECRET!` will throw if the environment variable is missing. The server should validate the secret at startup and exit with a clear error.
- **No token expiration handling in middleware**: Although `jwt.verify` will reject expired tokens, the error message is generic (`'Invalid token'`). Consider distinguishing between expired and malformed tokens for better client feedback.
- **Error messages expose internals**: Many endpoints return the raw error message (e.g., `e.message`) to the client, which may leak stack traces or implementation details. Use a generic error message in production and log details server‑side.
- **Missing rate limiting**: The authentication endpoints (`/api/auth/register`, `/api/auth/login`) are vulnerable to brute‑force attacks. Implement rate limiting (e.g., express‑rate‑limit).
- **Password strength policy**: No validation on password length/complexity beyond the 6‑character minimum in the Swagger spec. Enforce stronger passwords.
- **CORS configuration**: The allowed origins list is hard‑coded. Consider making it configurable via environment variable.

## 3. Timer Functionality
- **No resume endpoint**: The timer can be paused, but there is no endpoint to resume a paused timer. Once paused, the only options are to stop it (which recomputes duration from the original start time, ignoring the pause) or start a new timer (which is prevented because a timer is already active). This renders the pause feature unusable.
- **Incorrect duration calculation on stop**: `timerService.stop` computes duration as `Date.now() - startTime`, ignoring any time spent in paused state. If a timer was paused earlier, the duration will be inflated.
- **Duration unit**: Duration is stored as minutes (`duration` field) but computed by flooring `(Date.now() - startTime) / 60000`. Sub‑minute precision is lost; consider storing seconds and formatting when needed.
- **Active timer detection**: `findActiveByUser` looks for `endTime: null`. A paused timer still satisfies this condition, which may cause confusion (the UI might think the timer is still running). Consider adding a `status` field (e.g., `running`, `paused`, `stopped`) or treat `paused: true` as not active.

## 4. Task Deletion
- **Friction‑protected deletion**: The requirement of a 1000‑character reason is enforced, but the UI must ensure the user can input that many characters. The backend validation (`reason.length < 1000`) rejects shorter reasons, but does not trim whitespace. Consider using `reason.trim().length`.

## 5. Data Validation & Sanitization
- **Missing request validation**: No schema validation for incoming request bodies (e.g., ensuring `target` is a positive number, `unit` is allowed, `type` is one of `['work','study','break']`). This can lead to inconsistent data.
  - *Recommendation*: Use a validation library (e.g., Zod, Joi) in each controller or employ middleware.
- **Potential SQL injection via Prisma**: Prisma protects against SQL injection, but raw queries (if any) should be avoided.
- **Missing ownership validation**: Several endpoints do not verify that the resource belongs to the authenticated user.
  - Task deletion: `deleteTask` does not check that the task's `userId` matches the requester's ID.
  - Task completion logging: `logCompletion` does not verify task ownership.
  - Goal progress update: `updateProgress` does not validate that the goal belongs to the user.
  - *Recommendation*: Include ownership checks in service methods (e.g., `taskRepository.findByIdAndUser`) or add middleware that ensures resource ownership.

## 6. Business Logic & Edge Cases
- **Goal period dates**: `getPeriodDates` uses the current date at the moment of goal creation. If a user creates a goal for a past period (e.g., a monthly goal after the month has started), the `startDate` and `endDate` may not align with calendar weeks/months. This is acceptable as long as the UI clarifies the behavior.
- **Dashboard daily calculation**: The deduction of 18.5 hours on weekdays is hard‑coded and assumes a fixed schedule (7.5h sleep, 10h office, 1h travel). This may not reflect individual users’ availability.
- **Productivity score**: Based solely on task completion ratio, which may not accurately reflect productivity.

## 7. API Documentation (Swagger)
- **Incomplete spec**: Some endpoints documented in Swagger (e.g., `/api/timer/start`) accept a `type` field with enum `['work','break']`, but the code also allows `'study'`. Update the enum accordingly.
- **Missing security schemes**: Although bearerAuth is defined, not all protected endpoints have `security` annotations.
- **Out‑of‑sync with implementation**: The Swagger spec includes `/api/mobile-usage/sync` and `/api/mobile-usage/today`, but the corresponding routes are commented out in `index.ts`. Either enable the routes or remove them from the spec.

## 8. Mobile Usage Feature
- **Commented‑out code**: The mobile usage controller, service, repository, and routes are entirely commented out. If this feature is not intended for production, remove the dead code to reduce confusion.
- **Missing device‑linking logic**: The `linkDevice` endpoint is commented out, but the database model `UserDevice` exists. If the feature is to be used, implement the endpoints and ensure proper authentication.

## 9. Cron Job
- **Timezone unaware**: The cron job runs at midnight server time (UTC? depends on host). Goal expiration should likely be evaluated in the user’s timezone, or at least document that the check is based on server time.
- **No transaction safety**: The cron loop updates each goal individually. If an error occurs mid‑loop, some goals may be updated while others not. Consider using a Prisma transaction.

## 10. Code Quality & Maintainability
- **Missing tests**: No unit or integration tests are present. Add Jest or similar testing framework.
- **Lack of logging**: Only cron logs; request‑level logging (e.g., morgan) would help with debugging and monitoring.
- **Hard‑coded strings**: Many error messages and labels are hard‑coded in English. Consider externalizing for i18n if needed.
- **Circular dependencies**: Verify that repository imports do not create circular references (e.g., `dashboard.repository` imports `prisma` only—looks fine).

## 11. Deployment & Environment
- **Missing `.env` example**: No `.env.example` file to guide deployment. Include one with required variables.
- **PM2 ecosystem file**: The `ecosystem.config.cjs` exists at root but not referenced in README. Document its usage.

## 12. Miscellaneous
- **Unused imports**: Some files have unused imports (e.g., `dashboard.repository` imports `mobileUsageRepository` but it’s commented out). Clean up.
- **Type safety**: `AuthRequest` uses `userId?: number`; middleware guarantees `userId` is set, but controllers use non‑null assertion (`req.userId!`). This is fine if the middleware runs before, but consider removing the optional flag.

---

**Priority**: High‑priority items are those affecting data integrity, security, and core functionality (e.g., timer resume, JWT secret validation, request validation). Medium‑priority items are improvements to documentation, error handling, and minor bugs. Low‑priority items are code cleanup and testing.

**Next Steps**:
1. Fix timer pause/resume logic and duration calculation.
2. Add validation middleware (Zod/Joi).
3. Secure JWT secret and add rate limiting.
4. Update Swagger spec and either enable or remove mobile‑usage endpoints.
5. Write a simple health check that verifies DB connectivity.
