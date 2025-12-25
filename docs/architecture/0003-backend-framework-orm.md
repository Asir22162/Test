# ADR 0003: Backend Framework and ORM decision

Date: 2025-12-25
Status: Proposed

## Context

The project is a production multi-end mall: Admin Web, Merchant WeApp, Consumer WeApp. We need a consistent backend stack that:

- Supports rapid feature development and team onboarding
- Provides standard patterns for auth, validation, DI, testing, and modules
- Has good TypeScript support and IDE DX
- Integrates well with chosen ORM and deployment via Docker

Several teams recommended **NestJS** and **TypeORM** in early proposals, but neither is yet enforced in the codebase. This ADR compares the practical options and recommends a path.

## Options considered

1. NestJS + TypeORM
2. NestJS + Prisma
3. Express (Koa/fastify) + TypeORM
4. Express + Prisma

### Overview of technologies
- NestJS: opinionated Node framework with DI, modules, decorators, built-in testing patterns and first-class TypeScript DX. Familiar to many backend teams.
- Express/Koa/Fastify: lower-level, minimal frameworks — more flexible but requires more conventions and scaffolding.
- TypeORM: Active-record / data-mapper ORM designed for TypeScript/Node, widely used with decorators, supports migrations and works with MySQL.
- Prisma: Modern query builder/ORM with strong TypeScript types, migrations, and excellent DX, but a different mental model (schema-first and generated client).

## Comparison (pros/cons)

### NestJS + TypeORM
- Pros:
  - Tight integration with NestJS ecosystem; many examples and community modules.
  - Familiar decorator-based entities and DI pipeline.
  - Good for teams used to classical ORMs and migrations.
  - Lower migration surface if team already expects TypeORM semantics.
- Cons:
  - TypeORM has had historic stability concerns in edge cases and requires careful handling for advanced queries.
  - Some prefer Prisma's generated client for type-safety on queries.

### NestJS + Prisma
- Pros:
  - Prisma offers excellent type-safe query client, strong DX, and performant generated clients.
  - Schema-first approach makes refactors easier and queries explicit.
- Cons:
  - Different mental model (not decorator-based entities), requires learning curve and schema sync steps.
  - Less direct plug-and-play with Nest's module patterns (though community integrations exist).

### Express + TypeORM or Prisma
- Pros:
  - More flexible; less framework lock-in.
  - Potentially smaller runtime overhead.
- Cons:
  - Lose Nest's built-in DI, module boundaries and consistent test patterns.
  - Requires internal conventions and scaffolding to maintain cross-team consistency.

## Recommendation

**Adopt: NestJS + TypeORM as the official backend stack (Short-term)**

Rationale:
- Aligns with the initial team preference and keeps required learning curve small for developers familiar with decorator/DI patterns.
- Minimizes migration friction from typical REST/NestJS scaffolds.
- TypeORM supports required MySQL features and migrations.

**Notes:** Evaluate Prisma as a strong candidate for the medium term (6–12 months) after implementing a few complex query patterns; consider a pilot migration for a non-critical service if Prisma's tradeoffs prove beneficial.

## Migration cost & plan (high-level)

1. ADR sign-off (this document).
2. Add scaffold: `apps/api` NestJS starter with example modules (auth, users, orders).
3. Create a canonical TypeORM config and migration examples under `packages/infra` or `packages/db`.
4. Convert one service (e.g., auth or users) as pilot to the NestJS + TypeORM pattern. Include tests and CI.
5. Provide a migration guide and training session.

Estimated effort: **2–4 engineering weeks** for scaffold + pilot (one experienced engineer + 1 reviewer). Full migration of monorepo services depends on concurrency: roughly **6–12 weeks** for core services if done incrementally.

## Acceptance criteria

- ADR committed to `docs/architecture/0003-backend-framework-orm.md` and approved by backend stakeholders.  
- A NestJS scaffold exists in `apps/api` or `packages/server-starter` with:
  - Standard module layout, auth middleware, config, logging, and test examples.  
  - Example TypeORM config + migrations directory and a sample entity.  
- CI includes a smoke job that can run the scaffold tests and migration check.  
- Team guide (`docs/migration/`) describing steps to adopt the pattern in existing services.

## Rollback / Revisit

- If during the pilot Prisma is shown to materially improve DX for complex queries, we will open a new ADR to revisit choosing Prisma.  
- Revisit the decision after 6 months or after the pilot completes.

---

*Drafted by automation. Please review and add comments or suggested edits.*
