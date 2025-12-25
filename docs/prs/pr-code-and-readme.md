# PR A — Code + README + ADR

Title: chore(foundation): scaffold apps/packages, add README & ADR

Summary:
- Add scaffold directories for apps and packages
- Add README.md for each scaffold directory
- Add ADR docs/architecture/0001-foundation-structure.md
- Update pnpm workspace to include apps/*
- Adjust ops scripts and tests to be stable locally

Checklist:
- [ ] Repo structure is clear and directories have README
- [ ] pnpm workspace recognizes apps and packages
- [ ] Local tests (`pnpm -w -r test`) pass
- [ ] ops tests pass locally (already verified)

Notes:
- CI workflow for ops tests is intentionally _not_ included in this PR (moved to PR B) to simplify review.
- After merging, proceed to set up monorepo tooling (tsconfig, eslint, prettier, vitest baselines).