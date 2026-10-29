import type { Collection } from "./collections.js";
import type { HubCard } from "./hubs.js";

/**
 * Matched words in search highlights are wrapped in these private-use
 * characters; clients turn them into their own marking (the web uses <mark>).
 */
export const searchMarkStart = "";
export const searchMarkEnd = "";

/** Longest search the API reads (longer text is cut). */
export const maxSearchLength = 100;

/** A collection found by search, with its matched words marked. */
export interface CollectionSearchHit {
  collection: Collection;
  /** Title and description with matches marked; null when nothing matched there. */
  highlight: { title: string | null; description: string | null };
}

/** Discover search: matching hubs first, then collections by best match. */
export interface DiscoverSearchResult {
  /** The words searched for, as the API read them. */
  query: string;
  hubs: HubCard[];
  hubTotal: number;
  collections: CollectionSearchHit[];
  collectionTotal: number;
}
