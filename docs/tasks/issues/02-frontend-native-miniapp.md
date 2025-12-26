Title: Policy: Lock frontend to native WeChat Mini Program

Priority: P1
Labels: docs, policy, priority/P1

Description:
Update `CONTRIBUTING.md` and relevant app READMEs to state explicitly that only native WeChat Mini Program (WXML + WXSS + JS/TS) is allowed; frameworks that compile cross-platform (e.g., uni-app) are disallowed without explicit approval.

Acceptance criteria:
- `CONTRIBUTING.md` includes a clear policy line.
- `apps/consumer-weapp/README.md` and `apps/merchant-weapp/README.md` include the policy and a short rationale.
- Optional: CI check or linter rule added to detect disallowed frameworks in PRs.