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

  it("ties questions to a section and an item, keeps replies unscoped, and caps bodies at 2,000", async () => {
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

    await post({ body: "x".repeat(2001) }).expect(400);
    await post({ body: "x".repeat(2000) }).expect(201);
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

  it("ranks guides worth following by completeness, then saves", async () => {
    const curator = await person("guide-curator");
    // Each fixture replaces the captured first link with the given layout.
    const guide = async (
      title: string,
      layout: Array<"section" | "link" | "noted">,
      description?: string,
      fetched = false,
    ) => {
      const created = await capture(curator, { collectionTitle: title, links: [{ url: link() }] });
      const id = created.body.data.collectionId as string;
      await prisma.resource.deleteMany({ where: { collectionId: id } });
      await prisma.collection.update({ where: { id }, data: { description: description ?? null } });
      const urls = layout.map(() => link());
      if (fetched)
        await prisma.linkMetadata.createMany({
          data: urls.map((url) => ({
            url,
            state: "ready",
            fetchedAt: new Date(),
            title: "A fetched title",
            description: "A fetched description.",
          })),
        });
      await prisma.resource.createMany({
        data: layout.map((kind, position) =>
          kind === "section"
            ? { collectionId: id, kind: "heading", titleOverride: `Step ${position}`, position }
            : {
                collectionId: id,
                kind: "external_link",
                url: urls[position],
                position,
                ...(kind === "noted" ? { note: "Why this one matters." } : {}),
              },
        ),
      });
      return id;
    };
    const full = ["section", "noted", "noted", "section", "noted"] as const;
    const saved = await guide("Saved full guide", [...full], "Everything in order.");
    const unsaved = await guide("Unsaved full guide", [...full], "Everything in order.");
    const described = await guide("Described full guide", [...full], "Everything in order.", true);
    const thin = await guide("Newest thin list", ["link", "link"]);
    const empty = await guide("Only a heading", ["section"], "Nothing to follow yet.");
    for (const who of [owner, reader])
      await prisma.collectionSave.create({ data: { collectionId: saved, userId: who.id } });

    const response = await request(server()).get("/api/v1/discover/guides?limit=12").expect(200);
    const ids = (response.body.data as Array<{ id: string; sectionCount: number }>).map(
      (item) => item.id,
    );
    expect(ids.indexOf(described)).toBeGreaterThanOrEqual(0);
    // Fetched titles and descriptions add completeness, which outranks saves.
    expect(ids.indexOf(described)).toBeLessThan(ids.indexOf(saved));
    expect(ids.indexOf(saved)).toBeLessThan(ids.indexOf(unsaved));
    // A newer, thinner list never outranks a complete guide; no links, no place.
    if (ids.includes(thin)) expect(ids.indexOf(thin)).toBeGreaterThan(ids.indexOf(unsaved));
    expect(ids).not.toContain(empty);
    expect(response.body.data[ids.indexOf(saved)]).toMatchObject({
      sectionCount: 2,
      resourceCount: 3,
    });
    await request(server()).get("/api/v1/discover/guides?limit=13").expect(400);
  });

  it("says what each person did on profiles and who else shapes the owner's rows", async () => {
    const curator = await person("profile-owner");
    const helper = await person("profile-helper");
    const created = await capture(curator, {
      collectionTitle: "Feeding your soil",
      links: [{ url: link() }],
    }).expect(201);
    const id = created.body.data.collectionId as string;
    await auth(request(server()).post(`/api/v1/collections/${id}/shares`), curator)
      .send({ email: helper.email, role: "contributor" })
      .expect(201);
    for (let added = 0; added < 3; added++)
      await capture(helper, { destination: id, links: [{ url: link() }] }).expect(201);

    const profile = async (who: Person) =>
      (await request(server()).get(`/api/v1/people/${who.id}`).expect(200)).body.data;
    const helped = await profile(helper);
    expect(helped.contributionCount).toBe(1);
    expect(helped.collections[0]).toMatchObject({ id, contribution: { kind: "links", count: 3 } });
    const made = await profile(curator);
    expect(made.collections[0].contribution).toMatchObject({ kind: "created" });

    const hubId =
      created.body.data.hubId ??
      (await prisma.collection.findUniqueOrThrow({ where: { id } })).hubId;
    const rows = (
      await auth(request(server()).get(`/api/v1/hubs/${hubId}/collections`), curator).expect(200)
    ).body.data as Array<{
      id: string;
      contributors?: { people: Array<{ userId: string }>; total: number };
    }>;
    expect(rows.find((row) => row.id === id)?.contributors).toMatchObject({
      people: [{ userId: helper.id }],
      total: 1,
    });
    // Visitors' listings carry no contributor summary.
    const visible = (await request(server()).get(`/api/v1/hubs/${hubId}/collections`).expect(200))
      .body.data as Array<{ id: string; contributors?: unknown }>;
    expect(visible.find((row) => row.id === id)?.contributors).toBeUndefined();
  });

  it("discovers popular collections, hubs and tags, filters by tag and counts saves", async () => {
    const curator = await person("discover-curator");
    const tag = `tag${randomUUID().slice(0, 8)}`;
    const make = async (title: string) => {
      const created = await capture(curator, {
        collectionTitle: title,
        links: [{ url: link(), tags: [tag] }],
      }).expect(201);
      return created.body.data.collectionId as string;
    };
    const loved = await make("Loved this month");
    const quiet = await make("Quiet guide");
    for (const who of [owner, reader])
      await prisma.collectionSave.create({ data: { collectionId: loved, userId: who.id } });
    const { hubId } = await prisma.collection.findUniqueOrThrow({ where: { id: loved } });

    const popular = (await request(server()).get("/api/v1/discover/popular?limit=48").expect(200))
      .body.data as Array<{ id: string; saveCount: number }>;
    const ids = popular.map((item) => item.id);
    expect(ids).toContain(loved);
    expect(ids).not.toContain(quiet);
    expect(popular.find((item) => item.id === loved)?.saveCount).toBe(2);

    const tagged = (
      await request(server()).get(`/api/v1/discover?tag=${tag.toUpperCase()}`).expect(200)
    ).body.data as Array<{ id: string }>;
    expect(tagged.map((item) => item.id).sort()).toEqual([loved, quiet].sort());
    const tags = (await request(server()).get("/api/v1/discover/tags?limit=48").expect(200)).body
      .data as Array<{ name: string; collections: number }>;
    expect(tags.find((item) => item.name === tag)?.collections).toBe(2);

    for (const order of ["popular", "newest"]) {
      const hubs = (
        await request(server()).get(`/api/v1/discover/hubs?limit=48&order=${order}`).expect(200)
      ).body.data as Array<{ id: string; collectionSaves: number }>;
      expect(hubs.find((hub) => hub.id === hubId)?.collectionSaves).toBe(2);
    }
    const page = (await request(server()).get(`/api/v1/hubs/${hubId}`).expect(200)).body.data;
    expect(page.hub.collectionSaves).toBe(2);

    const contributors = (
      await request(server()).get(`/api/v1/hubs/${hubId}/contributors`).expect(200)
    ).body.data;
    expect(contributors[0]).toMatchObject({
      person: { userId: curator.id },
      owner: true,
      kind: "created",
      count: 2,
    });
    await request(server()).get("/api/v1/discover/hubs?order=loudest").expect(400);
  });

  it("records interest in features that are on the way, signed in or not", async () => {
    await request(server()).post("/api/v1/interest").send({ feature: "search" }).expect(201);
    await auth(request(server()).post("/api/v1/interest"), reader)
      .send({ feature: "subscriptions" })
      .expect(201);
    await request(server()).post("/api/v1/interest").send({ feature: "teleport" }).expect(400);
    expect(
      await prisma.featureInterest.count({
        where: { feature: "subscriptions", userId: reader.id },
      }),
    ).toBeGreaterThan(0);
  });

  it("shows saved collections on a profile only by choice and only readable ones", async () => {
    const saver = await person("public-saver");
    const created = await capture(owner, {
      collectionTitle: "Worth saving",
      links: [{ url: link() }],
    }).expect(201);
    const id = created.body.data.collectionId as string;
    await auth(request(server()).post(`/api/v1/collections/${id}/save`), saver).expect((r) =>
      expect([200, 201]).toContain(r.status),
    );
    const profile = async () =>
      (await request(server()).get(`/api/v1/people/${saver.id}`).expect(200)).body.data;
    expect(await profile()).toMatchObject({ saved: null, savedCount: null });
    await auth(request(server()).patch("/api/v1/profile"), saver)
      .send({ showSavedCollections: true })
      .expect(200);
    const shown = await profile();
    expect(shown.savedCount).toBe(1);
    expect(shown.saved[0]).toMatchObject({ id, title: "Worth saving" });
    await prisma.collection.update({ where: { id }, data: { published: false } });
    expect(await profile()).toMatchObject({ saved: [], savedCount: 0 });
  });
});
