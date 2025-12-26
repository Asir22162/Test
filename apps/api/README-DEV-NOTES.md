Dev notes / next steps for this scaffold

- Install dependencies: `pnpm install --filter @weixin/api...` (or `pnpm -w install`).
- Run migrations (example):
  - `node -e "require('./dist/data-source').AppDataSource.initialize().then(ds=>ds.runMigrations()).catch(e=>console.error(e))"`
- Migration check (dev): there is a lightweight migration check script that runs migrations against an in-memory SQLite DB to detect SQL/migration errors early. Run it after building the project:
  - `pnpm -C apps/api run build && pnpm -C apps/api run migrate:check`
- CI integration: a migration-check step has been added to the `smoke-api` job to run `pnpm -C apps/api run migrate:check` during CI to ensure migration SQL is valid. If the check fails, the `smoke-api` job will fail and block the main build, highlighting migration issues early.
- Consider adding a migration runner to CI that exercises migrations against a MySQL instance for full compatibility verification if needed.
- Add auth module and integrate `libs/auth` for token issuance/validation.
- Expose `POST /auth/revoke` to revoke refresh tokens; tests include unit and e2e flows (login → refresh → revoke → refresh should fail).
- Run e2e tests locally: `pnpm -C apps/api run build && pnpm -C apps/api test` (build required because e2e spins up `dist/main.js`).
- Add provider for secrets & config (Vault/KMS) and Dockerfile + docker-compose for local DB.
