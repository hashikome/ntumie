import type { Collection } from "./collections.js";
import type { IsoTimestamp } from "./envelope.js";

// One hub per user (Google-Drive model): no memberships, no roles beyond the
// owner; sharing happens per collection (see collections.ts).
export interface HubSummary {
  id: string;
  handle: string;
  name: string;
  ownerName: string | null;
  owner: import("./envelope.js").PersonRef | null;
  description: string | null;
  publishedCollectionCount: number;
  /** Saves across the hub's published collections. */
  collectionSaves: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** A public hub as Discover lists it. */
export type HubCard = Omit<HubSummary, "createdAt" | "updatedAt">;

/**
 * Someone who changed the hub's published collections, and what they did:
 * created `count` collections, or else added `count` links or sections, or
 * else edited. `collections` is how many collections that covers; with one,
 * `collectionTitle` names it.
 */
export interface HubContributor {
  person: import("./envelope.js").PersonRef & { name: string | null };
  owner: boolean;
  kind: "created" | "links" | "sections" | "edited";
  count: number;
  collections: number;
  collectionTitle: string | null;
  at: IsoTimestamp;
}

export interface HubPage {
  hub: HubSummary & {
    /** People who changed its published collections (the Contributors tab). */
    contributorCount: number;
  };
  collections: Collection[];
}
