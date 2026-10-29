import { Injectable } from "@nestjs/common";
import {
  type CollectionSearchHit,
  type DiscoverSearchResult,
  searchMarkEnd,
  searchMarkStart,
} from "@ntumie/types";
import { decodeCursor, encodeCursor } from "src/common/utils/cursor.util";
import { PrismaService } from "src/database/prisma.service";
import { Prisma } from "src/generated/prisma/client";
import { appError } from "../../common/errors/app-exception";
import { CollectionsService } from "../collections/collections.service";
import { type ParsedSearch, parseSearch } from "./search-query";

// Search over what the public can read: published collections and public hubs
// (a published collection, an active owner, no active hold). Postgres full-text
// search ranked by ts_rank_cd (title A, description B), with pg_trgm word
// similarity for typos and tag-prefix matches, then saves and recency.
// Discover and the reader depend on this module only, so a dedicated engine
// can replace it later (docs/exec-plans/active/discover-search.md).
// The search text is never logged or recorded.
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collections: CollectionsService,
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

  private async collectionHits(
    search: ParsedSearch,
    tag: string | undefined,
    offset: number,
    limit: number,
  ): Promise<{ hits: CollectionSearchHit[]; total: number }> {
    const marks = `StartSel=${searchMarkStart}, StopSel=${searchMarkEnd}, HighlightAll=true`;
    const tagMatch = Prisma.sql`EXISTS (
      SELECT 1 FROM collection_tags ct JOIN tags t ON t.id = ct.tag_id
      WHERE ct.collection_id = c.id AND lower(t.name) LIKE ANY (${search.tagPatterns}::text[]))`;
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
    const marked = (text: string | null) => (text?.includes(searchMarkStart) ? text : null);
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
