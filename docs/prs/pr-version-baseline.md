Title: chore(ci/docs): add version baseline ADR and CI smoke checks for MySQL/Redis

Summary:
- Add ADR 0002 documenting version baselines: JDK17, Spring Boot 3.5.9, Maven 3.9+, Node 20.x (<=22), MySQL 8.4 LTS, Redis 8.2.2+, WxJava 4.7.9, Docker/WSL requirements.
- Add Java 17 check in CI build job.
- Add optional MySQL and Redis smoke jobs to CI (PR/manual only) that run quick health/connectivity checks and upload artifacts. Jobs are non-blocking by default.
- Add local smoke helper scripts under `ops/smoke/` for MySQL and Redis.
- Update `CONTRIBUTING.md` with a version baseline summary and local instructions.

Files changed:
- docs/architecture/0002-version-baseline.md (new)
- .github/workflows/ci.yml (Java 17 check, mysql-smoke, redis-smoke)
- CONTRIBUTING.md (added baseline summary)
- ops/smoke/mysql-smoke.sh (new)
- ops/smoke/redis-smoke.sh (new)
- .nvmrc + package.json engines (previous change for Node baseline)

Testing:
- Ran `pnpm -C packages/logging test` locally — all tests passed (17/17).
- Smoke scripts can be run locally with `bash ops/smoke/mysql-smoke.sh` and `bash ops/smoke/redis-smoke.sh` (requires Docker).

Notes:
- MySQL job uses `mysql:8.0` in CI (conservative, widely available). If a future decision moves to 8.4, we will pin an explicit `8.4.x` tag when it is available/verified.
- CI smoke jobs are designed to be non-blocking (steps are `continue-on-error: true` and artifacts are uploaded) so they notify about regressions without preventing merges.

Next steps:
- If approved, I can push the branch and open a PR for team review (currently all changes committed locally on branch `ci/node20-plus-node22-compat`).