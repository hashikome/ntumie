# Repository Guide

This repository is the source of truth for the ntumie. product and
engineering decisions. External documents are references only. Keep this file
short: it is a map for contributors and coding agents, not a complete manual.
Public repository, licensed FSL-1.1-ALv2 (`LICENSE.md`).

## Start Here

New to the repository entirely? Walk
`docs/guides/developer-onboarding-walkthrough.md` first (six hands-on
sessions; commit-pinned and freshness-enforced by `bun run verify`). Then:

1. Read `PRODUCT.md` — the product definition (PRD): users, journeys,
   requirements, acceptance criteria, current state and open decisions.
2. Read `ARCHITECTURE.md` — the system-architecture authority: the
   Google-Drive individual model (at most one hub per user, independent collections),
   codemap, domain model, dependency rules and architectural invariants.
3. For web work, read `DESIGN.md` (the visual system and tokens).
4. Read the focused design for the area being changed
   (`docs/design-docs/README.md`; the map of all docs is `docs/README.md`).
5. Check `docs/engineering-decisions/` for settled decisions in the area.
6. For substantial work, read `PLANS.md`, then create or update an ExecPlan in
   `docs/exec-plans/active/`.
7. Run the verification workflow: `bun run verify`
   (see `docs/runbooks/verification.md`; e2e needs `bun run infra:up`).
8. For completed work, update `CHANGELOG.md` before preparing commits.

For web design work (Track W3), use the Impeccable skill after the design
documents it produces exist; repository docs and acceptance criteria remain
authoritative.

## Working Rhythm

1. **Brief before implementing.** State what is about to change and why — a
   sentence or two, or the relevant ExecPlan section — before touching files,
   so the direction can be corrected before the diff exists.
2. **Implement the complete milestone**, not fragments.
3. **Verify**: `bun run verify` green (plus any plan-specific checks).
4. **Record settled decisions**: a durable choice gets an engineering
   decision record; a change that contradicts an accepted record supersedes it
   explicitly (new evidence, tradeoff, reason) — never silently.
5. **Present for review**: summarize the result and the diff.
6. **Commit once per completed, reviewed milestone.** No micro-commits.
   Substantial work goes on a local branch, then
   `git switch main && git merge --ff-only <branch>` and `main` is pushed
   with the owner's go; never push the branch or open a pull request. Every
   push to `main` releases, so no half-reviewed state reaches it.

## Focused References

- `PRODUCT.md`: canonical product definition and acceptance criteria.
- `docs/CORE_BELIEFS.md`: engineering principles.
- `docs/SECURITY.md`: tenant isolation, authorization, tokens, and auth
  boundary rules.
- `docs/RELIABILITY.md`: idempotency, concurrency, jobs, and data rules.
- `docs/engineering-decisions/README.md`: settled decisions (ADRs) — binding
  until explicitly superseded with recorded rationale.
- `DESIGN.md`: the visual design system and canonical theme tokens.
- `docs/design-docs/README.md`: focused designs — tenancy and access, identity
  and handles, collections and resources, discussion, email verification,
  exports, web experience and interface, operations, and more.
- `docs/design-docs/conventions.md`: API/persistence casing and envelope rules.
- `docs/design-docs/identity-sso.md`: shared Hashikome identity — a centralized
  IAM direction for company products (scope and final name pending); its first slice ships AuthN+SSO;
  domain authorization stays product-owned; constraints current work respects.
- `docs/design-docs/infra-deployment.md`: shared Hashikome deployment (company infrastructure,
  Dokploy Stack mode, GHCR images, topology-file conventions).
- `docs/runbooks/local-development.md`: setup and everyday commands.
- `docs/runbooks/verification.md`: the canonical verification gate.
- `docs/runbooks/migrations.md`: Prisma migration discipline.
- `docs/runbooks/reference-context.md`: disposable `ref/` usage and cleanup.
- `PLANS.md`: required format for substantial execution plans.
- `docs/exec-plans/tech-debt-tracker.md`: accepted compromises and follow-ups.
- `CHANGELOG.md`: durable summary of completed project changes.

## Toolchain

- Use Bun for package installation, script execution, and tests. Commit
  `bun.lock`; do not add npm, Yarn, or pnpm lockfiles.
- Use Biome for formatting and linting (`biome.json`); `bun run check`
  autofixes. `useImportType` is disabled for `apps/api` only — NestJS DI and
  `emitDecoratorMetadata` need runtime imports for decorated
  classes/parameters — and stays on elsewhere. Do not re-enable it there or
  re-add ESLint/Prettier.
- Run Prisma through `bunx prisma` from `apps/api` (configuration in
  `apps/api/prisma.config.ts`; the datasource URL lives there, not in the
  schema).
- Schema changes use `prisma migrate dev --create-only` + review: the
  `app_uuid_v7()` function, `set_updated_at` triggers,
  CHECK constraints, and partial unique indexes exist only in migration SQL
  and must never be dropped by an auto-generated diff.
- `compose.yml` is local development only. Production topology is
  `docker-stack.<env>.yml` in the swarm dialect (see the infra direction doc).
- Use Conventional Commit style: `feat: ...`, `fix: ...`, `docs: ...`,
  `chore: ...`, `test: ...`, with `!` and a `BREAKING CHANGE:` footer for
  breaking changes. One commit per completed, reviewed milestone (see
  Working Rhythm).

## Pre-Deployment Compatibility

While ntumie. has no users, compatibility costs more than it earns. Until the
owner changes this policy, the repository is one unreleased release unit, and
what is built now is the authoritative code and the base for what follows.
Remove dead code as you go: when something is replaced, delete the old route,
module, model, screen, type, test and doc in the same change, with no shim,
alias, adapter, deprecated path or feature flag left for it. This does not
relax data safety: never rewrite an applied shared migration or discard user
data without the owner's explicit go at the time.

## Non-Negotiable Invariants

- Database identities are immutable UUIDv7 values. Human-facing values
  (person usernames, hub handles, display names, emails) never appear in authorization rules,
  foreign keys, or route contracts. Durable links use `hubId`, never the
  handle, so a handle rename never breaks a saved reference.
- The backend owns authoritative business rules, validation, authorization,
  and derived state. Clients are replaceable delivery surfaces; UI hiding is
  never a security rule.
- better-auth owns credentials, sessions, and verification primitives; the
  product owns identity, authorization, and workflows. Session resolution goes
  through `resolveSessionUser`; services consume `AuthUser`, never better-auth
  types.
- Sign-up onboarding stays in an app-owned service callable from any auth
  path (the SSO direction depends on this).
- Every hub-owned query carries `hubId`; route IDs never prove access;
  collection access flows through the single policy service — Google-Drive
  model: hub owner (full) → direct share (viewer/contributor) → active link →
  published. At most one hub per user; no memberships, no roles beyond owner/viewer/
  contributor in the implemented collection contract, no admin bypass. Optional hubs
  and person usernames are implemented (ADR-0018). See `PRODUCT.md` §11. Service-operator
  permissions are separate and never grant private-content access; see
  `docs/design-docs/service-operations.md`.
- NestJS route order: literal routes are declared before parameter routes in
  the same controller, and catch-all lookups never share a prefix with
  `:id/*` subresources.
- Clients (web, extension) never import Prisma Client, generated Prisma
  types, or `apps/api` internals.
- `main.ts`/`app.setup.ts` mount the better-auth handler before body parsers;
  new global middleware must respect that ordering. E2E tests boot through
  `configureApp` so they run the production HTTP stack.
- Production images are prebuilt (GHCR, SHA-pinned); nothing builds on the
  VPS. Secrets reach services as `_FILE` inputs and are never logged or baked
  into images. The application starts from env values and Docker secrets alone
  and never reads another product's configuration; no tracked file names a
  password manager or a path on someone's machine (`docs/SECURITY.md`,
  Credentials).
- Keep product branding out of schemas, table/column names, API fields, and
  env-var names.

## Documentation Rules

- Keep `ARCHITECTURE.md` stable and concise. Put evolving detail in `docs/`.
- Update repository-local docs when behavior, boundaries, or decisions change.
- Record user-facing and maintenance-relevant completed work in `CHANGELOG.md`.
- Use `ref/` only for disposable, git-ignored implementation context (see
  `ref/README.md`). Never store secrets, PII, or the only copy of a durable
  decision there.
- Design new screens and flows as plain HTML in `prototypes/`, testing each view
  in browser DevTools as you go, and implement only what the owner approved (see
  `prototypes/README.md`). Publish artifacts only when explicitly asked.
- From prototype to product: a journey and role review is the approval gate;
  the build ships in vertical slices on local branches (never pushed, no pull
  requests), each merged with `git merge --ff-only` and accepted live before
  the next; screens are audited as they are built, and finish-work runs at
  each slice's end (see `prototypes/README.md`, From the approved prototype to
  the product).
- Maintain active ExecPlans according to `PLANS.md` at each stopping point.
- Move completed execution plans from `docs/exec-plans/active/` to
  `docs/exec-plans/completed/`.
