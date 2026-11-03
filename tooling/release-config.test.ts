import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const config = JSON.parse(read("deploy/release.json"));
const known = new Set<string>([
  ...config.allowedInputs,
  ...Object.keys(config.images),
  "RELEASE_SHA",
  "RELEASE_ATTEMPT",
  "APP_REPLICAS",
]);
const required = (manifest: string) =>
  [...manifest.matchAll(/\$\{([A-Z0-9_]+)(?::\?[^}]*)?\}/g)].map((match) => match[1]);
const services = (manifest: string) =>
  Bun.YAML.parse(manifest) as { services: Record<string, unknown> };

// The shared release action refuses anything the configuration doesn't name, so
// a stack-file change that isn't reflected here would stop the next release.
test("the release configuration and .env.example cover every stack input", () => {
  const example = new Set(
    read(".env.example")
      .split("\n")
      .map((line) => /^([A-Z0-9_]+)=/.exec(line)?.[1]),
  );
  for (const path of [config.application.manifest, config.migration.manifest])
    for (const name of required(read(path))) {
      expect(known).toContain(name);
      expect(example.has(name)).toBe(true);
    }
});

test("the release configuration names the stacks' exact services", () => {
  expect(Object.keys(config.services).sort()).toEqual(
    Object.keys(services(read(config.application.manifest)).services).sort(),
  );
  expect(Object.keys(services(read(config.migration.manifest)).services)).toEqual([
    config.migration.service,
  ]);
  for (const { image } of Object.values<{ image: string }>(config.services))
    expect(Object.keys(config.images)).toContain(image);
});

test("Docker resolves the exact external names and images from the stored inputs", () => {
  const revision = "a".repeat(40);
  const images = {
    API_IMAGE: `${config.images.API_IMAGE}:${revision}@sha256:${"b".repeat(64)}`,
    WEB_IMAGE: `${config.images.WEB_IMAGE}:${revision}@sha256:${"c".repeat(64)}`,
  };
  const inputs = Object.fromEntries(
    read(".env.example")
      .replace(/SET_[A-Z_]+/g, "fixture")
      .split("\n")
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
  );
  const values = {
    ...inputs,
    ...config.inputs,
    ...images,
    RELEASE_SHA: revision,
    RELEASE_ATTEMPT: "1-1",
  };
  for (const part of [config.application, config.migration]) {
    const result = spawnSync("docker", ["stack", "config", "-c", part.manifest], {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      env: { ...process.env, ...values, APP_REPLICAS: "1" },
    });
    expect(result.status).toBe(0);
    const rendered = Bun.YAML.parse(result.stdout) as {
      services: Record<string, { image: string; environment: Record<string, string> }>;
      networks: Record<string, { name: string }>;
      secrets: Record<string, { name: string }>;
    };
    const migrating = part === config.migration;
    expect(rendered.networks.backend.name).toBe(values.BACKEND_NETWORK);
    expect(rendered.services[migrating ? config.migration.service : "ntumie-api"].image).toBe(
      images.API_IMAGE,
    );
    expect(rendered.secrets.database_url.name).toBe(
      values[migrating ? "MIGRATION_DATABASE_URL_SECRET" : "DATABASE_URL_SECRET"],
    );
    if (!migrating) {
      expect(rendered.networks.ingress.name).toBe(values.INGRESS_NETWORK);
      expect(rendered.services["ntumie-web"].image).toBe(images.WEB_IMAGE);
      expect(rendered.services["ntumie-worker"].environment.EMAIL_FROM_ADDRESS).toBe(
        values.EMAIL_FROM_ADDRESS,
      );
    }
  }
});
