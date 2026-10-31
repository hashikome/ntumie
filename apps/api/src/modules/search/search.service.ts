import { Injectable } from "@nestjs/common";
import {
  type CollectionSearchHit,
  type DiscoverSearchResult,
  type HubSearchEntry,
  type HubSearchResult,
  searchMarkEnd,
  searchMarkStart,
} from "@ntumie/types";
import { ResourceKind } from "src/common/enums/resource-kind.enum";
import { AuthUser } from "src/common/interfaces/auth-user.interface";
import { decodeCursor, encodeCursor } from "src/common/utils/cursor.util";
import { PrismaService } from "src/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";
import { appError } from "../../common/errors/app-exception";
import { CollectionsService } from "../collections/collections.service";
import { availableCollections } from "../hubs/availability";
import { CollectionPolicyService } from "../hubs/collection-policy.service";
import { type ParsedSearch, parseSearch } from "./search-query";

const marks = `StartSel=${searchMarkStart}, StopSel=${searchMarkEnd}, HighlightAll=true`;
const marked = (text: string | null) => (text?.includes(searchMarkStart) ? text : null);
// Each group of a hub's results stops here; a hub search is a jump, not a list.
const hubGroupLimit = 10;
const toEntry = ({ id, collectionId, collectionTitle, title }: HubSearchEntry) => ({
  id,
  collectionId,
  collectionTitle,
  title,
});

// Search over what the public can read: published collections and public hubs
// (a published collection, an active owner, no active hold). Postgres full-text
// search ranked by ts_rank_cd (title A, description B), with pg_trgm word
// similarity for typos and tag-prefix matches, then saves and recency.
// Discover and the reader depend on this module only, so a dedicated engine
// can replace it later (docs/exec-plans/active/discover-search.md).
// In-hub search covers what the viewer can read, private collections included,
// so it stays in Postgres behind the policy service whatever serves Discover.
// The search text is never logged or recorded.
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collections: CollectionsService,
    private readonly policy: CollectionPolicyService,
  ) {}

  async discover(input: {
    q: string;
    tag?: string;
    cursor?: string;
    limit?: number;
    scope?: "all" | "hubs";
  }): Promise<{ data: DiscoverSearchResult; nextCursor: string | null }> {
    const search = parseSearch(input.q);
    if (!search) throw appError("bad_request");
    const limit = input.limit ?? 20;
    const offset = Math.max(0, Number(decodeCursor<{ o: number }>(input.cursor ?? "")?.o) || 0);
    const hubsOnly = input.scope === "hubs";
    const [hubs, collections] = await Promise.all([
      this.hubs(search, hubsOnly ? offset : 0, hubsOnly ? limit : 4),
      hubsOnly
        ? Promise.resolve({ hits: [], total: 0 })
        : this.collectionHits(search, input.tag, offset, limit),
    ]);
    const shown = hubsOnly ? hubs.cards.length : collections.hits.length;
    const total = hubsOnly ? hubs.total : collections.total;
    return {
      data: {
        query: search.text,
        hubs: hubs.cards,
        hubTotal: hubs.total,
        collections: collections.hits,
        collectionTotal: collections.total,
      },
      nextCursor: offset + shown < total ? encodeCursor({ o: offset + shown }) : null,
    };
  }

  // One hub's collections, sections and links. The policy service picks the
  // collections first, so nothing unreadable can match, count or be marked; an
  // unknown hub and one with nothing readable answer alike.
  async hub(hubId: string, q: string, viewer: AuthUser | null): Promise<HubSearchResult> {
    const search = parseSearch(q);
    if (!search) throw appError("bad_request");
    const candidates = await this.prisma.collection.findMany({
      where: { hubId, ...availableCollections(viewer?.userId) },
    });
    const access = await this.policy.resolveMany(candidates, viewer);
    const readable = candidates.flatMap(({ id }) => (access.get(id)?.canRead ? [id] : []));
    if (!readable.length) return { query: search.text, collections: [], sections: [], links: [] };
    const [collections, entries] = await Promise.all([
      this.hubCollections(search, readable),
      this.hubEntries(search, readable),
    ]);
    return {
      query: search.text,
      collections,
      sections: entries.filter((entry) => entry.kind === ResourceKind.HEADING).map(toEntry),
      links: entries.filter((entry) => entry.kind !== ResourceKind.HEADING).map(toEntry),
    };
  }

  private async hubCollections(search: ParsedSearch, ids: string[]) {
    const tagMatch = this.tagMatch(search);
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.5`;
      return tx.$queryRaw<Array<{ id: string; title: string; description: string | null }>>`
        WITH q AS (SELECT to_tsquery('simple', ${search.tsquery}) AS tsq, ${search.text}::text AS text)
        SELECT c.id,
               ts_headline('simple', c.title, q.tsq, ${marks}) AS title,
               CASE WHEN c.description IS NULL THEN NULL
                    ELSE ts_headline('simple', c.description, q.tsq, ${marks}) END AS description
        FROM collections c
        CROSS JOIN q
        WHERE c.id = ANY(${ids}::uuid[])
          AND (public.collection_search_vector(c.title, c.description) @@ q.tsq
               OR q.text <% lower(c.title)
               OR ${tagMatch})
        ORDER BY ts_rank_cd(public.collection_search_vector(c.title, c.description), q.tsq)
                 + 0.5 * word_similarity(q.text, lower(c.title))
                 + CASE WHEN ${tagMatch} THEN 0.3 ELSE 0 END DESC,
                 c.updated_at DESC, c.id DESC
        LIMIT ${hubGroupLimit}
      `;
    });
    return rows.map((row) => ({ ...row, description: marked(row.description) }));
  }

  // Sections and links: titles first, then descriptions, notes and sites, then
  // tags. A hub is small enough to read this without an index of its own.
  private async hubEntries(search: ParsedSearch, ids: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.5`;
      return tx.$queryRaw<Array<HubSearchEntry & { kind: string }>>`
        WITH q AS (SELECT to_tsquery('simple', ${search.tsquery}) AS tsq, ${search.text}::text AS text),
        entries AS (
          SELECT r.id, r.kind, r.collection_id, c.title AS collection_title, c.updated_at,
                 coalesce(nullif(btrim(r.title_override), ''), nullif(btrim(m.title), ''), r.url, '') AS title,
                 concat_ws(' ', r.section_description, r.note, m.description, m.site_name) AS body,
                 (SELECT string_agg(t.name, ' ') FROM item_tags it JOIN tags t ON t.id = it.tag_id
                  WHERE it.item_id = r.id) AS tags
          FROM resources r
          JOIN collections c ON c.id = r.collection_id
          LEFT JOIN link_metadata m ON m.url = r.url AND m.state = 'ready'
          WHERE r.collection_id = ANY(${ids}::uuid[])
            AND r.kind IN (${ResourceKind.HEADING}, ${ResourceKind.EXTERNAL_LINK})
        ),
        weighted AS (
          SELECT entries.*,
                 setweight(to_tsvector('simple', title), 'A')
                 || setweight(to_tsvector('simple', body), 'B')
                 || setweight(to_tsvector('simple', coalesce(tags, '')), 'C') AS vector
          FROM entries
        ),
        ranked AS (
          SELECT weighted.*, ROW_NUMBER() OVER (
                   PARTITION BY kind
                   ORDER BY ts_rank_cd(vector, q.tsq) + 0.5 * word_similarity(q.text, lower(title)) DESC,
                            updated_at DESC, id DESC) AS place
          FROM weighted CROSS JOIN q
          WHERE vector @@ q.tsq OR q.text <% lower(title)
        )
        SELECT ranked.id, kind, collection_id AS "collectionId", collection_title AS "collectionTitle",
               ts_headline('simple', title, q.tsq, ${marks}) AS title
        FROM ranked CROSS JOIN q
        WHERE place <= ${hubGroupLimit}
        ORDER BY kind, place
      `;
    });
  }

  private tagMatch(search: ParsedSearch) {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM collection_tags ct JOIN tags t ON t.id = ct.tag_id
      WHERE ct.collection_id = c.id AND lower(t.name) LIKE ANY (${search.tagPatterns}::text[]))`;
  }

  private async collectionHits(
    search: ParsedSearch,
    tag: string | undefined,
    offset: number,
    limit: number,
  ): Promise<{ hits: CollectionSearchHit[]; total: number }> {
    const tagMatch = this.tagMatch(search);
    const rows = await this.prisma.$transaction(async (tx) => {
      // "compst" is close enough to "compost" (word similarity 0.71).
      await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.5`;
      return tx.$queryRaw<
        Array<{ id: string; title_mark: string; description_mark: string | null; total: bigint }>
      >`
        WITH q AS (SELECT to_tsquery('simple', ${search.tsquery}) AS tsq, ${search.text}::text AS text)
        SELECT c.id,
               ts_headline('simple', c.title, q.tsq, ${marks}) AS title_mark,
               CASE WHEN c.description IS NULL THEN NULL
                    ELSE ts_headline('simple', c.description, q.tsq, ${marks}) END AS description_mark,
               COUNT(*) OVER () AS total
        FROM collections c
        CROSS JOIN q
        JOIN hubs h ON h.id = c.hub_id
        JOIN users u ON u.id = h.owner_user_id AND u.account_state = 'active'
        LEFT JOIN collection_holds hold ON hold.collection_id = c.id AND hold.active
        WHERE c.published AND hold.collection_id IS NULL
          AND (public.collection_search_vector(c.title, c.description) @@ q.tsq
               OR q.text <% lower(c.title)
               OR ${tagMatch})
          ${
            tag
              ? Prisma.sql`AND EXISTS (SELECT 1 FROM collection_tags ft JOIN tags tt ON tt.id = ft.tag_id
                  WHERE ft.collection_id = c.id AND tt.name = ${tag})`
              : Prisma.empty
          }
        ORDER BY ts_rank_cd(public.collection_search_vector(c.title, c.description), q.tsq)
                 + 0.5 * word_similarity(q.text, lower(c.title))
                 + CASE WHEN ${tagMatch} THEN 0.3 ELSE 0 END DESC,
                 (SELECT COUNT(*) FROM collection_saves cs WHERE cs.collection_id = c.id) DESC,
                 c.updated_at DESC, c.id DESC
        OFFSET ${offset} LIMIT ${limit}
      `;
    });
    const listings = await this.collections.listingsInOrder(rows.map((row) => row.id));
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      hits: listings.map((collection) => {
        const row = byId.get(collection.id);
        return {
          collection,
          highlight: {
            title: marked(row?.title_mark ?? null),
            description: marked(row?.description_mark ?? null),
          },
        };
      }),
      total: Number(rows[0]?.total ?? 0),
    };
  }

  private async hubs(search: ParsedSearch, offset: number, limit: number) {
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.5`;
      return tx.$queryRaw<Array<{ id: string; total: bigint }>>`
        WITH q AS (SELECT to_tsquery('simple', ${search.tsquery}) AS tsq, ${search.text}::text AS text)
        SELECT h.id, COUNT(*) OVER () AS total
        FROM hubs h
        CROSS JOIN q
        JOIN users u ON u.id = h.owner_user_id AND u.account_state = 'active'
        WHERE h.published_collection_count > 0
          AND (public.hub_search_vector(h.name, h.handle, h.description) @@ q.tsq
               OR q.text <% lower(h.name))
        ORDER BY ts_rank_cd(public.hub_search_vector(h.name, h.handle, h.description), q.tsq)
                 + 0.5 * word_similarity(q.text, lower(h.name)) DESC,
                 h.published_collection_count DESC, h.id DESC
        OFFSET ${offset} LIMIT ${limit}
      `;
    });
    return {
      cards: await this.collections.hubCards(rows.map((row) => row.id)),
      total: Number(rows[0]?.total ?? 0),
    };
  }
}
