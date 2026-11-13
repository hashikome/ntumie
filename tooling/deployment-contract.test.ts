import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
interface Service {
  image: string;
  build?: unknown;
  ports?: unknown;
  networks: string[];
  environment?: Record<string, string>;
  deploy: {
    replicas: number | string;
    restart_policy?: { condition: string };
    update_config?: { failure_action: string; monitor?: string };
    labels?: Record<string, string>;
  };
}
const stack = Bun.YAML.parse(source("docker-stack.prod.yml")) as {
  services: Record<string, Service>;
  networks: Record<string, { internal?: boolean; external?: boolean }>;
};

test("first deployment serves nothing until migrations have been accepted", () => {
  expect(Object.keys(stack.services).sort()).toEqual(["ntumie-api", "ntumie-web", "ntumie-worker"]);
  for (const service of Object.values(stack.services)) {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Literal Swarm interpolation contract.
    expect(service.deploy.replicas).toBe("${APP_REPLICAS:-0}");
    expect(service.build).toBeUndefined();
    expect(service.ports).toBeUndefined();
    expect(service.image).toMatch(/^\$\{(?:API|WEB)_IMAGE:\?/);
  }
});

test("host-only sessions use one public origin and API routing wins", () => {
  const { "ntumie-api": api, "ntumie-web": web } = stack.services;
  expect(api.environment?.WEB_ORIGIN).toBe(web.environment?.WEB_ORIGIN);
  expect(web.environment?.WEB_ORIGIN).toBe(web.environment?.BETTER_AUTH_URL);
  expect(api.deploy.labels?.["traefik.http.routers.ntumie-api.rule"]).toContain(
    "PathPrefix(`/api/`)",
  );
  expect(Number(api.deploy.labels?.["traefik.http.routers.ntumie-api.priority"])).toBeGreaterThan(
    Number(web.deploy.labels?.["traefik.http.routers.ntumie-web.priority"]),
  );
});

test("web has only attribution credentials and no direct data-service network", () => {
  const { "ntumie-api": api, "ntumie-web": web } = stack.services;
  expect(web.networks).not.toContain("backend");
  expect(stack.networks.frontend.internal).toBe(true);
  expect(web.environment?.WEB_SOURCE_SECRET_FILE).toBe(api.environment?.WEB_SOURCE_SECRET_FILE);
  expect(web.environment?.DATABASE_URL_FILE).toBeUndefined();
  expect(web.environment?.BETTER_AUTH_SECRET_FILE).toBeUndefined();
  expect(web.environment?.API_INTERNAL_ORIGIN).toBe("http://ntumie-api:4000");
});

test("a failed update rolls back to the previous tasks (ADR-0073)", () => {
  for (const name of ["ntumie-api", "ntumie-web", "ntumie-worker"]) {
    expect(stack.services[name].deploy.update_config?.failure_action).toBe("rollback");
    expect(stack.services[name].deploy.update_config?.monitor).toBe("30s");
  }
});

test("migration is a one-shot isolated service with its own database credential", () => {
  const migration = Bun.YAML.parse(source("docker-stack.migrate.yml")) as {
    services: Record<string, Service>;
    secrets: { database_url: { name: string } };
  };
  expect(Object.keys(migration.services)).toEqual(["ntumie-migration"]);
  const job = migration.services["ntumie-migration"];
  expect(job.networks).toEqual(["backend"]);
  expect(job.deploy.restart_policy?.condition).toBe("none");
  expect(job.deploy.labels?.["traefik.enable"]).toBe("false");
  expect(job.ports).toBeUndefined();
  expect(job.environment?.RELEASE_ATTEMPT).toContain("${RELEASE_ATTEMPT:?");
  expect(source("docker-stack.migrate.yml")).toContain("dist/src/operations/migrate-release.js");
  expect(migration.secrets.database_url.name).toContain("MIGRATION_DATABASE_URL_SECRET");
});
