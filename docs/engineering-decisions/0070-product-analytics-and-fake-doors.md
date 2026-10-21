# ADR-0070: Product analytics and fake doors

Status: Accepted
Date: 2026-10-15

## Context

The redesign ships its screens as designed, including controls for features
that are not built yet (search, subscriptions, communities, partner hubs). The
owner wants to know which of them people reach for, and general product
analytics to decide what to build next, set up "just enough" and polished later.

## Options considered

- **Leave unbuilt controls out.** No dead UI, but no demand signal, and the
  screens drift from the approved design.
- **Fake doors recorded by the backend, plus PostHog for product analytics
  (chosen).** The backend keeps the demand record we own; PostHog gives page
  views and click analytics without building our own.
- **Self-hosted analytics.** More control, more to run; not worth it yet.

## Decision

- **Fake doors.** A designed control whose feature is not built records
  interest through `POST /api/v1/interest` (`feature_interest`: feature key,
  optional person, time; no content) and says the feature is on the way. The
  keys are `interestFeatures` in `@ntumie/types`. Small gaps are built instead.
- **PostHog, US Cloud** (project 666423), only in the web client and only when
  `POSTHOG_PROJECT_TOKEN` (the public `phc_` token) is set on the web server;
  tests and local development leave it unset. Events go through the site's
  `/ingest` rewrite. Persistence is in memory only (no cookies or storage),
  session recording is off, and people profiles exist only once identified
  (nobody is identified yet). Fake-door buttons tag their autocaptured clicks
  with `data-ph-capture-attribute-feature`.

## Consequences

- `feature_interest` is the source of truth for demand; PostHog is for trends.
- Turning on identification, session replay or cookies is a new decision
  (privacy notice and consent first).
- The production stack passes `POSTHOG_PROJECT_TOKEN`; releases accept it as an
  input.
