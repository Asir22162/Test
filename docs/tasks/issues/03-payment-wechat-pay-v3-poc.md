Title: Feature: WeChat Pay v3 PoC (simulated)

Priority: P1
Labels: feature, payments, priority/P1

Description:
Implement a simulated WeChat Pay v3 PoC in `packages/payment` (or `libs/payment`). The PoC should implement:
- Create prepay order flow (simulate request/response)
- Simulated payment notification callback (webhook) with idempotency handling
- Minimal reconciliation hook or example

Acceptance criteria:
- Unit and integration tests cover the flow
- README describes how to run locally and test the webhook
- Payment logic is designed to be replaceable with real WeChat Pay v3 SDK later (interface/adapter pattern)

Notes:
Keep external dependency minimal; tests should not rely on external WeChat endpoints.