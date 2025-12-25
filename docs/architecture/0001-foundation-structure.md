# ADR 0001: Foundation layer structure

Status: Proposed

## Context
We need a reusable, decoupled foundation layer to support Admin Web, Merchant WeApp and Consumer WeApp. It must be production-ready (security, testing, CI) and extensible.

## Decision
- Monorepo managed by pnpm workspaces
- TypeScript for shared type safety
- Packages: core, config, auth, http-client, logging, metrics, sdk-web, sdk-weapp
- Apps: admin-web, merchant-weapp, consumer-weapp
- CI: GitHub Actions with Node LTS

## Consequences
- Easier cross-package refactor and consistent tooling
- Requires discipline on API surface and versioning

Next: Implement minimal prototypes for each package and set CI gates for tests and linting.