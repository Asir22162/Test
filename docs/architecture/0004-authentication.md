# ADR 0004: Authentication & Authorization model

Date: 2025-12-25
Status: Proposed

## Context

We need a production-grade authentication and authorization design for the multi-end mall system (Admin Web, Merchant WeApp, Consumer WeApp). Requirements:
- Secure, auditable, and scalable token strategy
- Support for short-lived access tokens and refresh tokens
- Support for role-based access control and tenant scoping
- Interoperability with external identity providers (OIDC) in future
- Simple integration for WeApp SDKs and server-side modules

## Decision

Adopt a hybrid design:
- **Primary auth mechanism:** JWT (RFC 7519) with **short-lived access tokens** (e.g., 5–15 minutes) and **refresh tokens** (longer-lived, rotating).
- **Refresh token strategy:** store refresh token state server-side to support revocation and rotation (rotate on use), with optional secure persistent store (Redis or DB).
- **Token signing:** support both **HS256** (symmetric) for simple deployments and **RS256** (asymmetric) for production multi-service setups. Prefer RS256 when running multiple services/rotation.
- **RBAC + tenant claims:** tokens include minimal claims: sub, roles, tenantId, iat, exp, jti. Authorization checks are RBAC-first; ABAC can be layered later.
- **Session revocation & rotation:** maintain refresh token fingerprints and a revocation list (Redis) for short window checks. Access tokens remain stateless (not stored), and revocation is handled via short TTLs + refresh revocation.
- **Support OIDC / external IdP:** design interfaces that accept OIDC tokens and exchange for local JWTs when needed.

## Rationale

- JWT is widely adopted and integrates well with mobile/web/mini-app SDKs.
- Short-lived access + rotating refresh tokens balance security and operational complexity.
- Server-side refresh token state allows immediate revocation (important for compromised tokens).
- RS256 enables key rotation without sharing secrets across services.

## Implementation plan

1. ADR sign-off.
2. Implement `packages/auth` with:
   - Token service: sign/verify, rotate refresh tokens, revoke tokens (uses Redis or DB)
   - Middleware for NestJS (auth guard) and helper for WeApp SDK usage (attach Authorization header)
   - Utilities: JTI generation, token introspection endpoint (optional), JWKS endpoint for RS256 public keys
   - Tests: unit tests for token lifecycle, integration tests for refresh/rotation and revocation
3. Example integration in `apps/api` (auth module using `packages/auth`).
4. Add CI tests & a small e2e flow: register user → sign-in → use refresh → revoke → ensure tokens behave as expected.

## Acceptance criteria

- `packages/auth` includes token service, tests, and README examples
- `apps/api` demonstrates auth guard protecting an endpoint and a refresh flow
- CI runs unit and integration tests validating token rotation and revocation
- Key rotation procedure documented in `docs/` and runbook created

## Security considerations

- Ensure strong randomness and proper secret storage (Vault/KMS recommended)
- Use HTTPS for all token exchanges
- Rate-limit refresh attempts to mitigate brute-force
- Monitor suspicious refresh patterns and alert

---

*Drafted for review.*
