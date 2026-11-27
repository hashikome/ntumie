# Infrastructure and deployment (Hashikome)

ntumie. runs on Hashikome's shared server, `hs`, under Docker Swarm. GitHub builds and records each
release; infra's deploy agent on `hs` pulls and applies it. The [release runbook](../runbooks/release.md)
owns the commands, inputs, migration ordering and checks; this document owns the boundaries.

## Who owns what

- **GitHub Actions** verifies each push to `main`, builds immutable images from the reviewed commit,
  tags them with the full commit SHA, pushes them to **GHCR**, and records a GitHub release
  (`ntumie-<commit>`) naming the exact digests. It cannot deploy.
- **infra's deploy agent** applies the latest release: it creates missing Docker secrets from the
  private `hashikome/secrets` repository, runs the migration stack and waits for it to exit 0, then
  deploys the application stack and reports the verdict to Kuma. No source builds on the server.
- **This repository** owns its runtime definition: Dockerfiles, `docker-stack.yml` and
  `docker-stack.migrate.yml`, `deploy/release.json`, health and readiness checks, the environment and
  secret-file contracts, the migration command and release ordering.
- **`hashikome/infra`** owns the shared layer: the server, Traefik (`infra-traefik` on the
  `hashikome-edge` network), the shared data stack, backups to R2, Kuma, DNS and TLS, and the deploy
  agent.

## Stack files

Topology files have one purpose each; a suffix names a different shape, never an environment
(workspace `stack-files.md`):

- `compose.yml`: local development infrastructure only. Full Compose dialect is fine here.
- `docker-stack.yml`: the production stack, in the Swarm dialect: no `build:`, no reliance on
  `depends_on` (migration ordering is the agent's step), `deploy.restart_policy` and
  `deploy.resources`, named volumes only, and Swarm secrets at `/run/secrets/<name>` for the `_FILE`
  convention. Every service has a health check and rolls back a failed update
  ([ADR-0073](../engineering-decisions/0073-failed-updates-roll-back.md)).
- `docker-stack.migrate.yml`: the one-shot migration with its own scoped credential.
- No local Swarm stack: stack-dialect behaviour is checked on a throwaway server when needed.

Service keys carry the product (`ntumie-api`, `ntumie-web`, `ntumie-worker`, `ntumie-migration`),
because a key is also its hostname on a shared network. Local development and production are the
only permanent environments; same-host previews remain a planned direction
([tech-debt tracker](../exec-plans/tech-debt-tracker.md#same-host-pull-request-previews)), and no
staging server is planned.

## Topology

```txt
GitHub Actions: verify, build, push SHA-tagged images to GHCR, record the release
hs (Docker Swarm)
  infra-traefik, on hashikome-edge   -> ntumie_ntumie-web, ntumie_ntumie-api
  ntumie_ntumie-worker               (email and link metadata)
  infra stack, on hashikome-network  -> infra-postgres (one database per product)
                                      -> infra-redis-queue (product ACLs, namespaces)
                                      -> infra-backup (encrypted, to R2)
  infra-agent                        (applies releases), Kuma
```

Queue Redis is never a cache. The server is one failure domain: explicit resource limits, disk and
memory monitoring, builds off-host and off-host backups with tested restores.

### Origins: direct backend routing

Production uses `https://ntumie.link` as one public origin: Traefik routes `/api/*` straight to the API,
all other paths to the web. Development follows Pigfarm's direct API pattern:
API 4004, web 3004, with no Next rewrite. Exact-origin credentialed CORS admits
only WEB_ORIGIN; cookie mutation checks remain independent (ADR-0036).

`BETTER_AUTH_URL` identifies the public API and Google callback destination.
`WEB_ORIGIN` identifies web redirects, public links and the passkey origin.
It defaults to an explicitly configured BETTER_AUTH_URL in single-origin
production. Both must share a hostname and scheme for host-only cookies.
The development launcher sets both from PORT and WEB_PORT. Public browser
requests use the validated API origin rendered into the document at runtime;
no environment-specific client build is needed.

`API_INTERNAL_ORIGIN` remains the private server-to-server address. API and web
share WEB_SOURCE_SECRET for attributable SSR reads/native forms. Neither value
is browser configuration. X-Request-Id and Retry-After are exposed by CORS;
credentials and authorization remain backend-owned. See
[local development](../runbooks/local-development.md) and
[security](../SECURITY.md#origins-cors-and-csrf).

## Conventions for every product

- Production images are immutable and pinned by SHA tag and digest.
- Secrets reach services as `_FILE` inputs; their values are never logged or baked into images.
- Health and readiness endpoints are part of each product's API contract.
- Migrations run as an explicit release step owned by the product repository, before the new
  version serves traffic.
- Stack names are operational and never a durable contract.

## Health, readiness and secrets

`readSecret` in `apps/api/src/config/secret.ts` resolves `<NAME>_FILE` before
`<NAME>`, trims file content and fails on unreadable paths. Database, auth,
Redis and email credentials use that contract. Development defaults match
`compose.yml`; supplied configuration is validated, and production requires
explicit secrets rather than public development defaults.

`GET /api/v1/health` is dependency-free liveness. `/api/v1/status` probes
PostgreSQL and queue Redis: ready, degraded for Redis-only failure, unavailable
with HTTP 503 when PostgreSQL fails. Public probe exposure must be reviewed
before deployment.

## Shared-platform allocation

Infra owns the [shared data setup](https://github.com/hashikome/infra/blob/main/deploy/data-services/README.md):
PostgreSQL 18 with product database/roles and connection budgets, and persistent
queue Redis with tested ACL/key/channel boundaries. Product Stack releases never
create or replace these services. Web has no data-network attachment or database
credential; API/worker have only ntumie's runtime credentials. Migration uses the
separate scoped owner role. Admission of Pigfarm or another product needs its own
isolation, capacity and restore acceptance.
