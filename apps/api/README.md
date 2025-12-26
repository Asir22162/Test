# apps/api — NestJS + TypeORM starter (scaffold)

Purpose: A minimal scaffold demonstrating recommended backend stack (NestJS + TypeORM + MySQL) for the monorepo foundation layer.

Quickstart (local dev):

1. Install deps: `pnpm install --filter @weixin/api...` (or `pnpm -w install` in the monorepo root)
2. Copy `.env.example` to `.env` and configure DB settings.
3. Run DB migration using TypeORM DataSource (see `src/data-source.ts` for sample commands).
4. Start dev server: `pnpm --filter @weixin/api... run start:dev`

Notes:
- This is a scaffold/pilot. It includes a sample `users` module, entity and a sample migration. Configure production DB and migration workflow before using in production.
- Acceptance tests: unit tests + an e2e smoke test that starts the app and verifies `/health`.
