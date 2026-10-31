import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { searchMarkEnd, searchMarkStart } from "@ntumie/types";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/database/prisma.service";
import { signInHubOwner } from "./fixtures/sign-in";

// Discover search finds only what the public can read, ranks by how well the
// content matches (title before description, then tags), tolerates typos and
// prefixes, and marks the matched words.
describe("Discover search (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // Made-up words, unique to this run, so other fixtures never match.
  const word = (stem: string) =>
    `${stem}${randomUUID()
      .replace(/[^a-f]/g, "")
      .slice(0, 6)}`;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication<INestApplication<App>>({ bodyParser: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });

  const search = (query: Record<string, string>) =>
    request(app.getHttpServer()).get(`/api/v1/discover/search?${new URLSearchParams(query)}`);
  const owner = async (name = "Searcher") => {
    const login = await signInHubOwner(app.getHttpServer(), {
      email: `search-${randomUUID()}@example.com`,
      name,
    });
    const token = login.headers["set-auth-token"] as string;
    const userId = login.body.user.id as string;
    const create = async (title: string, description?: string, published = true) =>
      (
        await request(app.getHttpServer())
          .post("/api/v1/collections")
          .auth(token, { type: "bearer" })
          .send({ title, description, published })
          .expect(201)
      ).body.data.id as string;
    return { token, userId, create };
  };
  const tag = async (collectionId: string, name: string) => {
    const created = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.collectionTag.create({ data: { collectionId, tagId: created.id, itemCount: 1 } });
  };

  it("finds published collections by title, description, tag and prefix, best match first", async () => {
    const soil = word("soilword");
    const me = await owner();
    const byTitle = await me.create(`Living ${soil} at home`);
    const byDescription = await me.create("Garden notes", `Everything about ${soil} and worms`);
    const byTag = await me.create("Bed preparation");
    await tag(byTag, soil);
    const found = (await search({ q: soil }).expect(200)).body.data;
    expect(
      found.collections.map((hit: { collection: { id: string } }) => hit.collection.id),
    ).toEqual([byTitle, byDescription, byTag]);
    expect(found.collectionTotal).toBe(3);
    expect(found.collections[0].highlight.title).toBe(
      `Living ${searchMarkStart}${soil}${searchMarkEnd} at home`,
    );
    expect(found.collections[1].highlight.title).toBeNull();
    expect(found.collections[1].highlight.description).toContain(
      `${searchMarkStart}${soil}${searchMarkEnd}`,
    );
    // A prefix finds the whole word; a typo still finds the title.
    const prefix = (await search({ q: soil.slice(0, -2) }).expect(200)).body.data;
    expect(prefix.collectionTotal).toBe(3);
    const typo = `${soil.slice(0, 4)}${soil.slice(5)}`;
    const near = (await search({ q: typo }).expect(200)).body.data;
    expect(
      near.collections.map((hit: { collection: { id: string } }) => hit.collection.id),
    ).toContain(byTitle);
    // The tag filter narrows to collections carrying that tag.
    const tagged = (await search({ q: soil, tag: soil }).expect(200)).body.data;
    expect(
      tagged.collections.map((hit: { collection: { id: string } }) => hit.collection.id),
    ).toEqual([byTag]);
  });

  it("never finds, counts or marks what the public cannot read", async () => {
    const secret = word("secretword");
    const me = await owner();
    await me.create(`Private ${secret}`, undefined, false);
    const held = await me.create(`Held ${secret}`);
    await prisma.collectionHold.create({
      data: { collectionId: held, reason: "review", actorUserId: me.userId },
    });
    const gone = await owner();
    await gone.create(`Inactive ${secret}`);
    await prisma.user.update({ where: { id: gone.userId }, data: { accountState: "inactive" } });
    const result = (await search({ q: secret }).expect(200)).body.data;
    expect(result.collectionTotal).toBe(0);
    expect(result.collections).toEqual([]);
    expect(result.hubTotal).toBe(0);
  });

  it("finds public hubs by name and handle, pages through results, and refuses empty searches", async () => {
    const hubWord = word("hubword");
    const me = await owner();
    await me.create(`Shelf ${hubWord}`);
    const hub = await prisma.hub.findUniqueOrThrow({ where: { ownerUserId: me.userId } });
    await prisma.hub.update({ where: { id: hub.id }, data: { name: `The ${hubWord} hub` } });
    const hidden = await owner();
    const hiddenHub = await prisma.hub.findUnique({ where: { ownerUserId: hidden.userId } });
    if (hiddenHub)
      await prisma.hub.update({ where: { id: hiddenHub.id }, data: { name: `${hubWord} empty` } });
    const result = (await search({ q: hubWord }).expect(200)).body.data;
    // Only a hub with a published collection is public.
    expect(result.hubs.map((card: { id: string }) => card.id)).toEqual([hub.id]);
    const byHandle = (await search({ q: hub.handle.split("-")[0] ?? hub.handle }).expect(200)).body
      .data;
    expect(byHandle.hubs.map((card: { id: string }) => card.id)).toContain(hub.id);

    const pageWord = word("pageword");
    for (let i = 0; i < 3; i++) await me.create(`${pageWord} ${i}`);
    const first = await search({ q: pageWord, limit: "2" }).expect(200);
    expect(first.body.data.collections).toHaveLength(2);
    expect(first.body.meta.nextCursor).toBeTruthy();
    const second = await search({
      q: pageWord,
      limit: "2",
      cursor: first.body.meta.nextCursor,
    }).expect(200);
    expect(second.body.data.collections).toHaveLength(1);
    expect(second.body.meta.nextCursor).toBeNull();
    const ids = [...first.body.data.collections, ...second.body.data.collections].map(
      (hit: { collection: { id: string } }) => hit.collection.id,
    );
    expect(new Set(ids).size).toBe(3);

    const hubsOnly = (await search({ q: hubWord, scope: "hubs" }).expect(200)).body.data;
    expect(hubsOnly.collections).toEqual([]);
    expect(hubsOnly.hubTotal).toBe(1);
    expect((await search({ q: "  !!! " }).expect(400)).body.error.code).toBe("bad_request");
    await search({}).expect(400);
    // Text past the limit is cut, not refused.
    await search({ q: `${pageWord} ${"x".repeat(300)}` }).expect(200);
  });

  describe("inside one hub", () => {
    const inHub = (hubId: string, q: string, token?: string) => {
      const call = request(app.getHttpServer()).get(
        `/api/v1/hubs/${hubId}/search?${new URLSearchParams({ q })}`,
      );
      return token ? call.auth(token, { type: "bearer" }) : call;
    };
    const hubOf = async (userId: string) =>
      (await prisma.hub.findUniqueOrThrow({ where: { ownerUserId: userId } })).id;
    const links = (body: { data: { links: Array<{ id: string }> } }) =>
      body.data.links.map((link) => link.id);
    const add = (collectionId: string, data: { kind: string; title?: string; note?: string }) =>
      prisma.resource.create({
        data: {
          collectionId,
          kind: data.kind,
          url: data.kind === "heading" ? null : `https://example.com/${randomUUID()}`,
          titleOverride: data.title ?? null,
          note: data.note ?? null,
          position: Math.floor(Math.random() * 1_000_000),
        },
      });

    it("groups collections, sections and links, and marks the matched words", async () => {
      const term = word("hubterm");
      const me = await owner();
      const hubId = await hubOf(me.userId);
      const shelf = await me.create(`Shelf of ${term}`);
      const section = await add(shelf, { kind: "heading", title: `All about ${term}` });
      const titled = await add(shelf, { kind: "external_link", title: `Guide to ${term}` });
      const noted = await add(shelf, { kind: "external_link", title: "Plain", note: `On ${term}` });
      const found = (await inHub(hubId, term).expect(200)).body;
      expect(found.data.collections.map((hit: { id: string }) => hit.id)).toEqual([shelf]);
      expect(found.data.sections).toEqual([
        {
          id: section.id,
          collectionId: shelf,
          collectionTitle: `Shelf of ${term}`,
          title: `All about ${searchMarkStart}${term}${searchMarkEnd}`,
        },
      ]);
      // The title outranks the note.
      expect(links(found)).toEqual([titled.id, noted.id]);
      const other = await owner();
      await other.create(`Elsewhere ${term}`);
      expect((await inHub(hubId, term).expect(200)).body.data.collections).toHaveLength(1);
      expect((await inHub(hubId, "  !!! ").expect(400)).body.error.code).toBe("bad_request");
    });

    it("shows each viewer only what the policy lets them read", async () => {
      const term = word("hubsecret");
      const me = await owner();
      const hubId = await hubOf(me.userId);
      await me.create(`Open ${term}`);
      const hidden = await me.create(`Closed ${term}`, undefined, false);
      const inside = await add(hidden, { kind: "external_link", title: `Inner ${term}` });
      const shared = await owner("Helper");
      const email = (await prisma.user.findUniqueOrThrow({ where: { id: shared.userId } })).email;
      await request(app.getHttpServer())
        .post(`/api/v1/collections/${hidden}/shares`)
        .auth(me.token, { type: "bearer" })
        .send({ email, role: "viewer" })
        .expect((response) => expect(response.status).toBeLessThan(300));
      const stranger = await owner("Stranger");
      for (const viewer of [undefined, stranger.token]) {
        const found = (await inHub(hubId, term, viewer).expect(200)).body;
        expect(found.data.collections).toHaveLength(1);
        expect(found.data.links).toEqual([]);
      }
      for (const viewer of [me.token, shared.token]) {
        const found = (await inHub(hubId, term, viewer).expect(200)).body;
        expect(found.data.collections).toHaveLength(2);
        expect(links(found)).toEqual([inside.id]);
      }
      const answer = await inHub(hubId, term, me.token).expect(200);
      expect(answer.headers["cache-control"]).toContain("no-store");
      // An unknown hub answers like one with nothing readable.
      const unknown = await inHub(randomUUID(), term).expect(200);
      expect(unknown.body.data.collections).toEqual([]);
    });
  });
});
