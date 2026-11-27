# Releases

A push to `main` is a release. GitHub verifies it and records it; the deploy agent on `hs`
(infra's [retire-Dokploy plan](https://github.com/hashikome/infra/blob/main/docs/exec-plans/active/retire-dokploy-pull-based-deploys.md))
pulls the latest release, migrates, then applies it. Nothing in this repository can deploy, and
there is no Dokploy path.

## What a push does

`.github/workflows/release.yml` runs on every push to `main`, documentation included:

1. **verify**: the reusable gate in `.github/workflows/verify.yml` (compilation, real-service
   tests, four critical browser journeys). The full browser suite is the manually dispatched
   `browser.yml`.
2. **image-check**: builds and rehearses the API/worker and web images (below).
3. **image**: builds and publishes both images to GHCR, tagged with the full commit SHA, with
   provenance and SBOM.
4. **release**: `hashikome/actions/github-release` records the GitHub release `ntumie-<7-digit
   commit>` with the exact image digests. A re-run marks the existing release latest.
5. **prune-images**: GHCR keeps the newest three tagged images per package.

The agent then deploys the stack `ntumie-migrate` and waits for this release's migration task,
running `deploy/release.json`'s command, to exit 0. Only then does it deploy the stack `ntumie`
(`ntumie_ntumie-api`, `-web`, `-worker`) with `RELEASE_SHA`, `RELEASE_ATTEMPT=<tag>` and
`APP_REPLICAS=1`. Its verdict (released, rolled back, or no verdict) goes to Kuma's combined push
monitor. A failed update rolls back in Swarm
([ADR-0073](../engineering-decisions/0073-failed-updates-roll-back.md)).

## Inputs

- `deploy/release.json`: the images, the migration manifest, service and command, the
  application manifest, the settings the stack may take (`allowedInputs`) and fixed values
  (`inputs`: the network and versioned secret names). `tooling/release-config.test.ts` checks it
  against `docker-stack.yml` and `docker-stack.migrate.yml`.
- Settings: `ntumie/production.env` in the private `hashikome/secrets` repository, read by the
  agent; only names in `allowedInputs` reach the stack. `HTTPS_ENTRYPOINT` and `TLS_RESOLVER` come
  from the agent's product list.
- Secrets: Docker secrets the agent creates from the same repository (below).

## Rolling back

Mark an earlier release as latest: `gh release edit ntumie-<commit> --latest`. The agent applies
it as a release of its own, migration step included.

Before a release, review rollback compatibility for the exact image pair and migration set being
released. The migration chain starts at `0_init` with reviewed additive changes;
never assume an older binary can serve a newer schema. Roll back an image only
when compatible, preserve audit data, and never automatically reverse SQL.
Migration failures require inspection through the
[migration runbook](migrations.md). Column or contract changes need an explicit
compatibility and recovery review before promotion.


## Checks after a release

`https://ntumie.link/`, `/sign-in` and `/api/v1/status` (ready: PostgreSQL and Redis) return 200;
the API container's `RELEASE_SHA` is the released commit; the worker runs without error logs.
Off-host product restore, the Google callback, capacity under rolling updates and product
monitors remain launch checks.

## Image rehearsal

Routine development uses `bun run infra:up` and `bun run verify`, which compile
and test the application without building Docker images. When deployment work
starts, run the additional image checks from the repository root with Docker
available:

```bash
bun run infra:up
bun run verify
docker build -f apps/api/Dockerfile -t release-check .
docker build -f apps/web/Dockerfile -t web-release-check .
bun run verify:release-image -- release-check web-release-check
```

The image rehearsal creates uniquely named containers, a private bridge
network, a database volume, and synthetic secret files. It publishes no ports
and cleans up only those resources. It applies every migration to an empty
PostgreSQL 18 database using the same image that serves traffic; boots the
compiled API as the `bun` user on a read-only filesystem; checks `_FILE`
inputs, health/readiness, Redis and PostgreSQL outages, bounded shutdown and
production config refusal; then dumps/restores a synthetic publication and
its audit record. It also checks separate migration/runtime PostgreSQL roles,
cross-product database refusal, Redis ACL key/channel/admin refusal and the compiled
BullMQ worker. With the web image supplied it verifies the custom server, `/healthz`,
server rendering, private responses, the edge-cache policy on a signed-out public
page ([edge cache](edge-cache.md)) and its absence with a session cookie. It never resets the development database, initializes
Swarm, sends mail, or sends remote telemetry. Local Sentry-envelope capture
is covered by API unit tests. This restore is local, not off-host proof.

There is no local Swarm rehearsal (retired 13 November 2026): when a change to
the stack's dialect (secrets, `deploy.*` policies, rolling updates) needs proof
before a release, deploy `docker-stack.yml` to a throwaway server with synthetic
secrets and captured email, then remove it. The image rehearsal above does not
prove Swarm scheduling, ingress, secrets distribution, or rolling updates.

The Dockerfile pins Bun 1.4.4 by digest, installs the frozen lockfile and
compiles in the build stage. The runtime retains the pinned Prisma CLI so
the migration uses the identical artifact, at the cost of a larger image.
No install, generation, or compilation happens at application startup.
`tsconfig.runtime.json` resolves `src/*` imports into compiled `dist/src/*`.
Environment files, generated clients, keys and disposable reference context
are excluded from the build input.

## Portable application configuration

`.env.example` lists every key, the Stack inputs and the ordinary application
variables. The runtime accepts plain values or `_FILE` inputs; a supplied file
takes precedence, and an unreadable or empty file fails startup. The deploy agent
creates any Docker secret the server lacks from `ntumie/` in the private
`hashikome/secrets` repository, each value encrypted under the exact versioned name the
stack mounts; the stack's network and secret names are fixed under `inputs` in
`deploy/release.json`. A downloaded installation can use its own env
files and local services. Never use the production private-network URLs as
workstation development endpoints. Keep migrator credentials out of the
application's configuration.

Swarm services continue receiving only their selected secret files. Changing a
stored value does not update those immutable versions or rotate upstream credentials. The
[shared secret contract](https://github.com/hashikome/infra/blob/main/docs/secrets-contract.md)
defines ownership and coordinated rotation.
