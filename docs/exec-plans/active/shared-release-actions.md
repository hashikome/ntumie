# Share Hashikome's release workflow through hashikome/actions

This ExecPlan is a living document. Maintain it according to `PLANS.md`.
Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and
`Outcomes & Retrospective` current as work proceeds.

## Purpose / Big Picture

Today each product carries its own copy of the same careful release: migrate,
verify grants, promote images, roll back. After this plan a product's release
workflow builds its images and calls one pinned action from
`hashikome/actions`; a fix to the sequence reaches every product through a
reviewed version bump.

## Progress

- [x] (2026-10-31) Direction decided by the owner.
- [x] (2026-10-31) ntumie's deploy credential has one path: the `production`
  environment secret `DOKPLOY_API_KEY`.
- [ ] Create `hashikome/actions` (public) with the Dokploy release action.
- [ ] Move ntumie onto it and prove one real release.
- [ ] Move HashiFi, then Soko; Pigfarm when it gains a release workflow.
- [ ] Delete each product's copy of the coordinator, and promote this plan's
  decisions into an ADR and `docs/runbooks/release.md`.

## Surprises & Discoveries

- Observation: `hashikome/infra` is private with Actions sharing off, and ntumie
  is public; as understood, a public repo cannot call a private repo's action
  (not tested).
  Evidence: `gh api repos/hashikome/infra` visibility private;
  `.../actions/permissions/access` access_level none.
- Observation: three copies of one job exist: ntumie `tooling/release.ts`
  (395 lines), HashiFi `tooling/release.ts` (361), Soko
  `tools/access-release.py` (378); `infra/scripts/dokploy_api.py` is a fourth
  Dokploy client (57).

## Decision Log

- Decision: shared workflow definitions live in the public `hashikome/actions`
  repo; settings specific to a repo stay in that repo.
  Rationale: works for private and public repos alike. ntumie is public on
  purpose, so changing its visibility is not an option.
  Date/Author: 2026-10-31 / owner
- Decision: `hashikome/actions` is GitHub's `actions` organisation for Hashikome:
  a home for many small actions, one folder each, called as
  `hashikome/actions/<name>@<sha>`. `dokploy-release` is the first.
  Rationale: anything products share can sit beside it later.
  Date/Author: 2026-10-31 / owner
- Decision: `hashikome/actions` holds logic only: no credentials, no stack IDs,
  no product configuration.
  Rationale: it is public, and the secrets standard has each product stand
  alone.
  Date/Author: 2026-10-31 / proposed
- Decision: a composite action, pinned by full commit SHA in callers (not
  `@main`), written in Python with the standard library only.
  Rationale: a composite action runs inside the caller's job, so the product
  keeps its own `production` environment and credential. A pin means one push
  cannot change every product's next deploy unreviewed. Runners already have
  Python, so no product's toolchain is required.
  Date/Author: 2026-10-31 / proposed

## Outcomes & Retrospective

Not started.

## Context And Orientation

A release builds immutable GHCR images, runs a one-shot migration Stack,
verifies grants, then promotes the application Stack through the Dokploy API,
with rollback to the previous images. ntumie's version is `tooling/release.ts`,
called from the `deploy` job of `.github/workflows/release.yml`, reading
`deploy/production.json`. Any push to `main` deploys.

## Plan Of Work

Stays in each product: building and testing images, `deploy/production.json`
(targets, service keys, health expectations), environment secrets and variables,
the stack files. Moves to the action: the Dokploy client, the migration wait,
promotion, health checks and rollback, taking images, targets and the credential
as inputs. Build the action from ntumie's coordinator, which has tests
(`tooling/release.test.ts`), and carry the tests with it. Compare against
HashiFi's and Soko's versions first, so differences become inputs rather than
lost behaviour.

## Concrete Steps

To be filled in when `hashikome/actions` exists.

## Validation And Acceptance

- ntumie, then each product, completes one real release through the action,
  including its migration step, and a forced failure leaves the previous version
  serving.
- No credential or product configuration appears in `hashikome/actions`.
- Each caller pins a full commit SHA.

## Idempotence And Recovery

Each product moves separately. Until its old coordinator is deleted, reverting
its workflow to `tooling/release.ts` restores the previous path.

## Artifacts And Notes

Zanlis's equivalent is a reusable workflow at
`zanlis-hq/infra/.github/workflows/deploy.yaml@main` (SSH `docker stack deploy`).

## Interfaces And Dependencies

- New public repository: `hashikome/actions`.
- Callers need only the action's inputs and their own `DOKPLOY_API_KEY`.
