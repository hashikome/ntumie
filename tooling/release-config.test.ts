import { expect, test } from "bun:test";
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
test("the release configuration covers every stack input and example", () => {
  for (const path of [config.application.manifest, config.migration.manifest])
    for (const name of required(read(path))) expect(known).toContain(name);
  for (const line of read("deploy/production.env.example").split("\n")) {
    const name = /^([A-Z0-9_]+)=/.exec(line)?.[1];
    if (name) expect(known).toContain(name);
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
