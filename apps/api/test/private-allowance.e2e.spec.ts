import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/database/prisma.service";
import { signInHubOwner } from "./fixtures/sign-in";

// Free accounts keep three owner-only private collections (ADR-0028). Every
// way of making a collection private checks the allowance in the backend,
// concurrent requests never oversubscribe it, and nothing is ever published
// or deleted to make room.
describe("Private collection allowance (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // The test runner raises the allowance for other fixtures; check the product's.
  const configured = process.env.FREE_PRIVATE_COLLECTIONS;
  beforeAll(async () => {
    process.env.FREE_PRIVATE_COLLECTIONS = "3";
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication<INestApplication<App>>({ bodyParser: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    if (configured === undefined) delete process.env.FREE_PRIVATE_COLLECTIONS;
    else process.env.FREE_PRIVATE_COLLECTIONS = configured;
    await app.close();
  });

  const owner = async (name: string) => {
    const email = `${name}-${randomUUID()}@example.com`;
    const login = await signInHubOwner(app.getHttpServer(), { email });
    return { email, id: login.body.user.id as string, token: login.headers["set-auth-token"] };
  };
  const api = (token: string) => ({
    get: (path: string) => request(app.getHttpServer()).get(path).auth(token, { type: "bearer" }),
    post: (path: string, body: object = {}) =>
      request(app.getHttpServer()).post(path).auth(token, { type: "bearer" }).send(body),
    patch: (path: string, body: object) =>
      request(app.getHttpServer()).patch(path).auth(token, { type: "bearer" }).send(body),
  });
  const create = (token: string, published: boolean) =>
    api(token).post("/api/v1/collections", { title: `C ${randomUUID()}`, published });

  it("reports the allowance and refuses a fourth private collection on every path", async () => {
    const me = await owner("allowance");
    const as = api(me.token);
    // Signed out, the free limit (Start a collection shows it).
    expect(
      (await request(app.getHttpServer()).get("/api/v1/collections/private-allowance").expect(200))
        .body.data,
    ).toEqual({ limit: 3, used: 0 });
    expect((await as.get("/api/v1/collections/private-allowance").expect(200)).body.data).toEqual({
      limit: 3,
      used: 0,
    });
    for (let i = 0; i < 3; i++) await create(me.token, false).expect(201);
    expect((await as.get("/api/v1/collections/private-allowance")).body.data).toEqual({
      limit: 3,
      used: 3,
    });
    const refused = await create(me.token, false).expect(409);
    expect(refused.body.error.code).toBe("private_allowance_reached");
    // Public collections are unlimited.
    const open = (await create(me.token, true).expect(201)).body.data;
    // Unpublishing and editing to private are refused, and change nothing.
    expect(
      (await as.post(`/api/v1/collections/${open.id}/unpublish`).expect(409)).body.error.code,
    ).toBe("private_allowance_reached");
    await as
      .patch(`/api/v1/collections/${open.id}`, { version: open.version, published: false })
      .expect(409);
    expect((await prisma.collection.findUniqueOrThrow({ where: { id: open.id } })).published).toBe(
      true,
    );
    // Saving a link into a new private collection is refused too.
    const capture = await as
      .post("/api/v1/capture", {
        operationId: randomUUID(),
        links: [{ url: `https://fixture-links.dev/${randomUUID()}` }],
        destination: "new",
        collectionTitle: "Fourth private",
        published: false,
        startedAt: Date.now(),
      })
      .expect(409);
    expect(capture.body.error.code).toBe("private_allowance_reached");
    // Publishing one frees a place.
    const first = await prisma.collection.findFirstOrThrow({
      where: { hub: { ownerUserId: me.id }, published: false },
    });
    await as.post(`/api/v1/collections/${first.id}/publish`).expect(201);
    await as.post(`/api/v1/collections/${open.id}/unpublish`).expect(201);
    expect((await as.get("/api/v1/collections/private-allowance")).body.data.used).toBe(3);
  });

  it("keeps collections already over the limit and never oversubscribes concurrently", async () => {
    const me = await owner("allowance-race");
    const hub = await prisma.hub.findUniqueOrThrow({ where: { ownerUserId: me.id } });
    // Collections made private before the allowance existed are kept.
    for (let i = 0; i < 4; i++)
      await prisma.collection.create({
        data: { hubId: hub.id, creatorUserId: me.id, title: `Old ${i}`, published: false },
      });
    expect((await api(me.token).get("/api/v1/collections/private-allowance")).body.data.used).toBe(
      4,
    );
    await create(me.token, false).expect(409);
    await prisma.collection.deleteMany({ where: { hubId: hub.id } });
    await create(me.token, false).expect(201);
    await create(me.token, false).expect(201);
    const replies = await Promise.all([1, 2, 3].map(() => create(me.token, false)));
    expect(replies.map((reply) => reply.status).sort()).toEqual([201, 409, 409]);
    expect(await prisma.collection.count({ where: { hubId: hub.id, published: false } })).toBe(3);
  });

  it("counts a transferred private collection against the recipient", async () => {
    const alice = await owner("allowance-from");
    const bob = await owner("allowance-to");
    for (let i = 0; i < 3; i++) await create(bob.token, false).expect(201);
    const kept = (await create(alice.token, false).expect(201)).body.data;
    await api(alice.token)
      .post(`/api/v1/collections/${kept.id}/shares`, { email: bob.email, role: "contributor" })
      .expect(201);
    const refused = await api(alice.token)
      .post(`/api/v1/collections/${kept.id}/transfer`, { email: bob.email })
      .expect(409);
    expect(refused.body.error.code).toBe("private_allowance_reached");
    const still = await prisma.collection.findUniqueOrThrow({
      where: { id: kept.id },
      include: { hub: true },
    });
    expect(still.hub.ownerUserId).toBe(alice.id);
    expect(still.published).toBe(false);
  });
});
