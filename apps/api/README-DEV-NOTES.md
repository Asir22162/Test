Dev notes / next steps for this scaffold

- Install dependencies: `pnpm install --filter @weixin/api...` (or `pnpm -w install`).
- Run migrations (example):
  - `node -e "require('./dist/data-source').AppDataSource.initialize().then(ds=>ds.runMigrations()).catch(e=>console.error(e))"`
- Consider adding a small CI job that runs `pnpm --filter @weixin/api... run test` in a matrix for DB compatibility.
- Add auth module and integrate `libs/auth` for token issuance/validation.
- Add provider for secrets & config (Vault/KMS) and Dockerfile + docker-compose for local DB.
