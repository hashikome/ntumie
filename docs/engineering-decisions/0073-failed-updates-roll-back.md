# ADR-0073: A failed update rolls back

Status: Accepted
Date: 2026-11-13
Supersedes: ADR-0061's "Failed application updates pause for review: do not automatically select an
old binary after an unreviewed schema change."

## Context

ADR-0061 set `failure_action: pause` on the api and the web so that a failed update would wait for
review rather than run an old binary on a schema it had not seen. With `order: start-first`, that
does not happen: the old task keeps serving until the new one is healthy, so after a failed update
the previous release is already serving on the migrated schema, paused or not. Pause only leaves the
service half-updated until someone resumes or rolls it back by hand.

The shared release action (`hashikome/actions/dokploy-release`) now ends every deploy with Swarm's
verdict, and the platform's rule, set by the owner and already followed by Soko, is a health check
and `failure_action: rollback` on every service.

## Decision

- The api, the web and the worker roll back a failed update: `failure_action: rollback`,
  `monitor: 30s`, one task at a time. The api and the web start the new task first (and roll back
  the same way); the worker stops first, as one consumer is enough.
- The api and the web are judged by their images' health checks. The worker has none (it serves no
  traffic); Swarm judges it by whether its task keeps running for the monitor window.
- Rollback is Swarm's. The release action's own `rollback` input, which would redeploy the previous
  Stack file in Dokploy, stays off, and so does its `accept` input.
- Migrations still run before the application, and a release's migration must leave the previous
  release working on the new schema (`docs/runbooks/migrations.md`): the condition rollback relies
  on, and the one the old tasks already relied on during a start-first update.

## Consequences

A failed release ends with the previous release serving and the run failed with "rolled back", with
no manual step to clear a paused service. A migration that the previous release cannot run against
is a release design error, caught in review, not something pause would have protected against.
