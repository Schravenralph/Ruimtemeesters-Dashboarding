# Agent Instructions

## Tests Are a Contract

All tests must pass. A failing test is a critical contract breach — it means either the test is wrong or the source code is wrong. Both are first-class issues that must be resolved immediately.

**Never:**
- Skip, ignore, or work around failing tests
- Treat test failures as "pre-existing" or "unrelated" to justify continuing
- Commit code that introduces new test failures

**Always:**
- Run the full test suite before claiming work is complete
- Fix every failure — either the test or the code, whichever is incorrect
- If you cannot determine which is wrong, escalate to the user

A green test suite is a precondition for merging, not a nice-to-have.

## Push Regularly

Push to the remote after every logical chunk of work (e.g. after each completed task, after merging a branch). Do not let commits pile up locally — if the machine dies, unpushed work is lost.

## Worktrees

Worktrees go in `.worktrees/` (project-local, gitignored). Copy `.env` into new worktrees — it is gitignored and won't be present automatically.

## Project Structure

This project follows the Ruimtemeesters-Geoportaal folder structure:
- `src/client/` — React 19 + TypeScript frontend (Vite + Tailwind CSS 4)
- `src/server/` — Express 5 + TypeScript backend (PostgreSQL)
- `src/shared/` — Shared types and contracts (Zod validation)

## Key Conventions

- All API contracts are defined with Zod schemas in `src/shared/api/contracts.ts`
- Server follows controller → routes → middleware pattern
- Client uses contexts for global state (AuthContext, FilterContext, ThemeContext)
- Charts use Recharts library
- Dutch (NL) is the primary locale; i18n foundation exists at `src/client/utils/i18n.ts`
- ABAC policies are evaluated by `src/server/middleware/abac.ts`
