# ADR-0071: Bound how long a failure goes unnoticed, not how long recovery tries

Status: Accepted
Date: 2026-10-29

## Context

The owner set one retry policy across the company's products (first recorded
in Pigfarm's ADR-0017): a failure must never go unnoticed for long, but the
system must keep trying to recover by itself. ntumie's worker previously
reconnected to Redis forever without saying so; a first fix capped Swarm
restarts at five, which left the worker stopped after a short Redis restart
even once Redis was healthy again.

## Decision

By layer:

- **Jobs.** A bounded number of attempts with backoff; permanent errors fail
  at once (`UnrecoverableError`, terminal delivery errors). Work that runs out
  of attempts is kept as failed so it can be replayed, never dropped. In
  ntumie the BullMQ jobs are pointers to durable rows: email deliveries stop
  after 5 attempts and stay `failed` for 30 days; link lookups retry at 1 min,
  10 min, 1 h and 6 h, stay `failed`, and are tried again a day later.
- **Durable work (the email outbox, link metadata).** Never silently give up;
  report rows stuck well past their due time (`email.outbox_stuck` after
  2 minutes, `link_metadata.stuck` after 15, each once a minute with
  `rows.count`). Sign-in emails expire with their codes (5 minutes): a late
  code is useless, so expiry is the product rule, not a give-up.
- **Connections.** Detect a lost Redis connection within
  `REDIS_OUTAGE_LIMIT_MS` (default 5 minutes) through connection events and a
  bounded probe (one read every min(5 s, limit/3), capped at 2 s), so a hung
  connection counts too. Then log fatal (`*.redis_unavailable`), exit non-zero
  and alert. The worker connection itself keeps commands waiting (no failing
  loop that could starve SIGTERM).
- **Deployment.** The production worker restarts after 30 s with no attempt
  cap, whatever its exit code (`condition: any`), so it resumes by itself once
  Redis is back. `on-failure` is not enough: the worker exits 0 on SIGTERM, so
  the host reboot of 18 October 2026 left it stopped for 13 days, unnoticed.

## Consequences

- An outage is visible within minutes (fatal log, alert, restarting task) and
  needs no operator to recover.
- A Redis outage longer than the limit costs one restart every ~5.5 minutes
  until it ends; that is the intended signal.
- Every new job type states its attempts, its permanent-error cases and where
  its failed record lives; every new durable queue reports stuck rows.
