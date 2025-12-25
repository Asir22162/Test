# ADR 0002: Version Baseline

Date: 2025-12-25

Status: Proposed

## Context
To maintain stability and reduce compatibility issues across services and developer machines, this ADR defines the repository's version baselines for language runtimes, frameworks, databases, and supporting tooling.

This baseline aims to be conservative (enterprise-grade), support future AI/analytics features, and make CI reproducible.

## Decision
Adopt the following baseline versions:

- Java / Backend
  - JDK: 17 (LTS)
  - Spring Boot: 3.5.9 (3.x stable maintenance line)
  - Build: Maven 3.9+

- Frontend
  - Node.js: 20.x (primary baseline). Allow Node 22 as optional compatibility channel.
  - Vue: 3.x
  - Vite: 6/7 (follow scaffolding default; Node 20 required)

- Data & Caching
  - MySQL: 8.4 LTS (use latest 8.4.x patch when available)
  - Redis: 8.2.2+ (security fix baseline)

- WeChat & SDKs
  - WeChat SDK (Java): WxJava 4.7.9
  - WeChat DevTools: use latest stable in local dev

- Container / Platform
  - Docker Desktop (WSL2 backend), minimum WSL >= 2.1.5 and Windows 11 23H2 / Windows 10 22H2 with virtualization enabled

## Rationale
- JDK 17 is the current stable LTS required by Spring Boot 3.x.
- Spring Boot 3.5.9 is a conservative choice to avoid early Boot 4 pitfalls while being up-to-date.
- Node 20 is required for Vite and is broadly adopted; Node 22 is used only as a compatibility channel.
- Locking major/minor ranges (e.g., node >=20 <23) reduces "dependency hell" while allowing patches.
- Testing database versions in CI via optional smoke jobs helps detect incompatibilities early without blocking merges immediately.

## Consequences
- Create CI checks to verify Java 17 and add optional MySQL/Redis smoke jobs (PR-triggered, non-blocking by default).
- Update `CONTRIBUTING.md` and README with the baseline and recommended developer tooling (Volta / nvm / .nvmrc).
- Use ADR to guide future upgrades: upgrades require ADR update and an upgrade plan with compatibility tests.

## Acceptance Criteria
- ADR present in `docs/architecture` and approved by maintainers.
- CI contains Java 17 check and optional MySQL/Redis smoke jobs. Docs updated.

---

(Prepared by dev automation)