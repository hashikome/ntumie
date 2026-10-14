import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { CommentView, Resource, SessionView } from "@ntumie/types";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/database/prisma.service";
import { signInWithCode } from "./fixtures/sign-in";

// Contracts added for the cobalt redesign (M2): link notes, section-tied
// comments, remembered visibility, named new collections and hub visibility
// (ADR-0069).
describe("cobalt redesign contracts", () => {
  let app: INestApplication, prisma: PrismaService;
  type Person = { id: string; email: string; token: string };
  let owner: Person, reader: Person;
  const server = () => app.getHttpServer();
  const auth = (r: request.Test, who?: Person) =>
    who ? r.set("Authorization", `Bearer ${who.token}`) : r;
  const link = () => `https://fixture-links.dev/${randomUUID()}`;
  const person = async (name: string): Promise<Person> => {
    const email = `${name}-${randomUUID()}@example.com`;
    const r = await signInWithCode(server(), { email, name });
    return { id: r.body.user.id, email, token: r.headers["set-auth-token"] as string };
  };
  const capture = (who: Person, body: Record<string, unknown>) =>
    auth(request(server()).post("/api/v1/capture"), who).send({
      operationId: randomUUID(),
      startedAt: Date.now(),
      destination: "new",
      ...body,
    });
  const session = async (who: Person) =>
    (await auth(request(server()).get("/api/v1/session"), who).expect(200)).body
      .data as SessionView;
  const items = async (collectionId: string, who: Person) =>
    (
      await auth(
        request(server()).get(`/api/v1/collections/${collectionId}/resources`),
        who,
      ).expect(200)
    ).body.data as Resource[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.requestBudget.deleteMany();
    owner = await person("curator");
    reader = await person("reader");
  });
  afterAll(async () => {
    await app.close();
  });

  it("starts a named collection with a noted first link, for new and returning owners alike", async () => {
    const first = await capture(owner, {
      collectionTitle: "  Starting a kitchen garden  ",
      links: [{ url: link(), note: "  Read this before choosing a spot.  " }],
    }).expect(201);
    const id = first.body.data.collectionId as string;
    const collection = await prisma.collection.findUniqueOrThrow({ where: { id } });
    expect(collection.title).toBe("Starting a kitchen garden");
    expect(collection.published).toBe(true);
    const [saved] = await items(id, owner);
    expect(saved.note).toBe("Read this before choosing a spot.");

    // Starting again always makes another collection; a blank name gets the dated default.
    const second = await capture(owner, {
      collectionTitle: "   ",
      links: [{ url: link() }],
    }).expect(201);
    expect(second.body.data.collectionId).not.toBe(id);
    const named = await prisma.collection.findUniqueOrThrow({
      where: { id: second.body.data.collectionId },
    });
    expect(named.title).toStartWith("Saved links, ");
  });

  it("remembers an explicit private choice for the next new collection", async () => {
    const who = await person("private-first");
    expect((await session(who)).newCollectionPublished).toBe(true);
    await capture(who, { published: false, links: [{ url: link() }] }).expect(201);
    expect((await session(who)).newCollectionPublished).toBe(false);
    const next = await capture(who, { links: [{ url: link() }] }).expect(201);
    const collection = await prisma.collection.findUniqueOrThrow({
      where: { id: next.body.data.collectionId },
    });
    expect(collection.published).toBe(false);
  });

  it("edits and clears a link note, and refuses notes on sections or past 280 characters", async () => {
    const id = (await capture(owner, { links: [{ url: link() }, { url: link() }] }).expect(201))
      .body.data.collectionId as string;
    const [a, b] = await items(id, owner);
    const patch = (resourceId: string, body: object) =>
      auth(
        request(server()).patch(`/api/v1/collections/${id}/resources/${resourceId}`),
        owner,
      ).send(body);
    const noted = (await patch(a.id, { version: a.version, note: "Why it is here" }).expect(200))
      .body.data as Resource;
    expect(noted.note).toBe("Why it is here");
    const cleared = (await patch(a.id, { version: noted.version, note: "" }).expect(200)).body
      .data as Resource;
    expect(cleared.note).toBeNull();
    await patch(b.id, { version: b.version, note: "x".repeat(281) }).expect(400);
    const section = (
      await auth(request(server()).post(`/api/v1/collections/${id}/resources/heading`), owner)
        .send({ title: "Choosing a spot", firstItemId: b.id, firstItemVersion: b.version })
        .expect(201)
    ).body.data as Resource;
    expect(section.note).toBeNull();
    await patch(section.id, { version: section.version, note: "Not for sections" }).expect(400);
  });

  it("ties questions to a section and an item, keeps replies unscoped, and caps bodies at 1,000", async () => {
    const id = (await capture(owner, { links: [{ url: link() }, { url: link() }] }).expect(201))
      .body.data.collectionId as string;
    const [first, second] = await items(id, owner);
    const section = (
      await auth(request(server()).post(`/api/v1/collections/${id}/resources/heading`), owner)
        .send({ title: "Preparing beds", firstItemId: second.id, firstItemVersion: second.version })
        .expect(201)
    ).body.data as Resource;
    const post = (body: object) =>
      auth(request(server()).post(`/api/v1/collections/${id}/comments`), reader).send(body);

    const question = (
      await post({
        body: "Does this hold for clay?",
        sectionId: section.id,
        itemId: first.id,
      }).expect(201)
    ).body.data as CommentView;
    expect(question.section).toEqual({ id: section.id, title: "Preparing beds" });
    expect(question.item?.id).toBe(first.id);

    // A section must be a heading and an item must be a link, both in this collection.
    await post({ body: "Wrong kind", sectionId: first.id }).expect(400);
    await post({ body: "Wrong kind", itemId: section.id }).expect(400);
    await post({ body: "Elsewhere", sectionId: randomUUID() }).expect(400);
    // Replies inherit their question's scope and cannot set their own.
    await post({ body: "Scoped reply", parentId: question.id, sectionId: section.id }).expect(400);
    const reply = (await post({ body: "Yes, with compost.", parentId: question.id }).expect(201))
      .body.data as CommentView;
    expect(reply.section).toBeNull();

    await post({ body: "x".repeat(1001) }).expect(400);
    await post({ body: "x".repeat(1000) }).expect(201);
  });

  it("keeps a hub public only while it has a published collection, and hides its byline otherwise", async () => {
    const who = await person("quiet");
    const id = (await capture(who, { published: false, links: [{ url: link() }] }).expect(201)).body
      .data.collectionId as string;
    const hub = await prisma.hub.findUniqueOrThrow({ where: { ownerUserId: who.id } });
    expect(hub).toMatchObject({ collectionCount: 1, publishedCollectionCount: 0 });

    await request(server()).get(`/api/v1/hubs/${hub.id}`).expect(404);
    await auth(request(server()).get(`/api/v1/hubs/${hub.id}`), reader).expect(404);
    await auth(request(server()).get(`/api/v1/hubs/${hub.id}`), who).expect(200);
    const hidden = (await request(server()).get(`/api/v1/people/${who.id}`).expect(200)).body.data;
    expect(hidden.hub).toBeNull();

    await prisma.collection.update({ where: { id }, data: { published: true } });
    expect(await prisma.hub.findUniqueOrThrow({ where: { id: hub.id } })).toMatchObject({
      collectionCount: 1,
      publishedCollectionCount: 1,
    });
    await request(server()).get(`/api/v1/hubs/${hub.id}`).expect(200);
    const shown = (await request(server()).get(`/api/v1/people/${who.id}`).expect(200)).body.data;
    expect(shown.hub?.id).toBe(hub.id);

    // Removing the last collection hides the hub but keeps it for the next one.
    await prisma.collection.delete({ where: { id } });
    expect(await prisma.hub.findUniqueOrThrow({ where: { id: hub.id } })).toMatchObject({
      collectionCount: 0,
      publishedCollectionCount: 0,
    });
    await request(server()).get(`/api/v1/hubs/${hub.id}`).expect(404);
    const again = await capture(who, { links: [{ url: link() }] }).expect(201);
    const reused = await prisma.collection.findUniqueOrThrow({
      where: { id: again.body.data.collectionId },
    });
    expect(reused.hubId).toBe(hub.id);
  });

  it("creates the missing hub when an import starts", async () => {
    const who = await person("importer");
    expect(await prisma.hub.findUnique({ where: { ownerUserId: who.id } })).toBeNull();
    await auth(request(server()).post("/api/v1/imports"), who)
      .field("sourceKind", "text")
      .attach("file", Buffer.from(link()), "links.txt")
      .expect(201);
    expect(await prisma.hub.findUnique({ where: { ownerUserId: who.id } })).toMatchObject({
      collectionCount: 0,
    });
  });
});
