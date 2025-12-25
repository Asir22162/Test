# PR B — CI: ops-tests workflow

Title: chore(ci): add ops tests workflow

Summary:
- Add `.github/workflows/ops-tests.yml` to run ops tests on Node LTS (18.x)
- Workflow installs pnpm and runs `pnpm -w -C ops test:ops`

Checklist:
- [ ] Workflow triggers on push and PR to main
- [ ] Workflow runs successfully in CI (Node 18)
- [ ] No secrets or tokens are leaked in logs

Notes:
- This PR is separated from code changes to allow focused review of CI behavior.
- If desired, we can expose `FAST_TEST_RETRIES` as an input to speed tests in special runs; default behavior should be kept conservative to mirror production retry timings.