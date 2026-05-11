# LLM Development Guidelines for the Daily Project

## Purpose
These instructions are intended for any large language model (LLM) – such as Claude, ChatGPT, or custom agents – that assists in developing, maintaining, or extending the **Daily** personal productivity tracker.

## Core Principles
1. **Safety First**
   - Never expose secrets (e.g., `JWT_SECRET`, database credentials) in code, logs, or commit history.
   - Validate all user‑provided data on the server side. Never trust front‑end validation alone.
2. **Consistency with the Existing Codebase**
   - Follow the existing project conventions (TypeScript, ES modules, `.js` imports in compiled code, Prettier formatting).
   - Use the existing folder structure (`backend/src/...`, `frontend/src/...`).
3. **Minimal, Targeted Changes**
   - When editing a file, use the smallest unique `oldText` possible and group related edits in a single `edit` call.
   - Prefer adding new files over heavily modifying existing ones unless fixing a bug.
4. **Testing & Documentation**
   - Add or update unit / integration tests for new features.
   - Keep Swagger/OpenAPI documentation in sync (`backend/src/swagger.ts`).
   - Update the README and the `FEATURES` folder with any new user‑facing behavior.
5. **Commit Hygiene**
   - Each logical change should have a clear, concise commit message.
   - Do not commit generated files (`node_modules`, `dist`, `.env`). They belong in `.gitignore`.

## Interaction with Pi‑Claude (the coding agent)
- Use the provided tooling (`read`, `bash`, `edit`, `write`) to inspect, modify, and create files.
- When a request mentions “remove unnecessary files”, only delete **untracked** files via `git clean`; never modify tracked source files unless explicitly asked.
- After any structural change, run `npm install` (or `npm run dev` for live testing) to ensure the workspace stays functional.

## Suggested Workflow for Feature Development
1. **Clarify Requirements** – Ask the user for any missing details before writing code.
2. **Create Feature Files** – Add `.feature` files in the `FEATURES/` directory describing BDD scenarios.
3. **Implement Backend Changes** – Add or modify controllers, services, repositories, and Prisma models as needed.
4. **Update Frontend** – Adjust pages, components, or API clients to consume new endpoints.
5. **Write Tests** – Place new test files alongside existing ones (`backend/test/...`).
6. **Document** – Add Swagger specs, update the README, and note the change in `CHANGELOG.md`.
7. **Commit** – Ensure each commit is atomic and descriptive.

## How to Handle Ambiguities
- If a requirement is vague (e.g., “add a feature X”), ask a clarifying question instead of guessing.
- When a user requests a large refactor, break it into smaller, reviewable steps.

## Contact & Support
For further guidance on using these LLM instructions, refer to the **Pi‑Coding‑Agent** documentation or reach out to the project maintainers.

---
*These instructions are version‑controlled within the repository and should be kept up‑to‑date as the project evolves.*