import type { ShareRole, ShareSource } from "./common.js";
import type { IsoTimestamp } from "./envelope.js";

export interface Collection {
  hub?: {
    id: string;
    handle: string;
    name: string;
    owner?: import("./envelope.js").PersonRef | null;
  };
  // Who created the collection (immutable provenance; may differ from the owner
  // after a transfer). Present on single-collection reads; null if unavailable.
  creator?: import("./envelope.js").PersonRef | null;
  // Everyone who has shaped its content, most recent first (up to five), and
  // how many there are. Present on single-collection reads.
  contributors?: { people: import("./envelope.js").PersonRef[]; total: number };
  /** canManage: the owner; canEdit: a contributor (owner or contributor). */
  capabilities?: { canManage: boolean; canEdit: boolean };
  restriction?: { reason: import("./operations.js").OperationReason; supportUrl: string };
  /** Public profiles: what that person did here, and when they last did it. */
  contribution?: Contribution;
  /** Listings (Discover, hub pages): how many sections and resources it holds. */
  sectionCount?: number;
  resourceCount?: number;
  /** Listings: how many people saved it. */
  saveCount?: number;
  id: string;
  hubId: string;
  title: string;
  description: string | null;
  /** Unique tags on this collection’s own items, most-used first, alphabetical ties. Stored relation, read-only. */
  tags: string[];
  published: boolean;
  linkSharingEnabled: boolean;
  commentsEnabled: boolean;
  version: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/**
 * A person's part in a collection: they created it, or else added `count`
 * links or sections, or else edited it. `at` is their latest change.
 */
export interface Contribution {
  kind: "created" | "links" | "sections" | "edited";
  count: number;
  at: IsoTimestamp;
}

export interface SharedCollection extends Collection {
  shareRole: ShareRole;
  shareSource: ShareSource;
}

export interface SavedCollection extends Collection {
  savedAt: IsoTimestamp;
  available: boolean;
}

export interface CollectionShareView {
  userId: string;
  displayName: string;
  /** Present for direct shares (the owner supplied it); null for link-source shares. */
  email: string | null;
  role: ShareRole;
  source: ShareSource;
}

export interface CreateCollectionRequest {
  title: string;
  description?: string;
  published?: boolean;
}

export interface UpdateCollectionRequest {
  commentsEnabled?: boolean;
  version: number;
  title?: string;
  description?: string;
  published?: boolean;
}

export interface SetLinkSharingRequest {
  enabled: boolean;
  rotate?: boolean;
}

export interface LinkSharingResult {
  collectionId: string;
  linkSharingEnabled: boolean;
  token?: string;
  queryParam?: string;
}

export interface CreateShareRequest {
  email: string;
  role?: ShareRole;
}

// Current collaborators in the authenticated owner's hub, not service accounts.
export interface HubPerson {
  userId: string;
  username: string;
  collectionCount: number;
}

export type ManagedCollectionAction =
  | "open"
  | "edit"
  | "add_link"
  | "history"
  | "share"
  | "publish"
  | "unpublish"
  | "delete"
  | "transfer"
  | "hold"
  | "release";

export interface ManagedCollection {
  id: string;
  hubId: string;
  hubHandle: string;
  /** Null when only moderation metadata is available. */
  title: string | null;
  visibility: "published" | "link" | "private" | null;
  held: boolean;
  updatedAt: IsoTimestamp | null;
  availableActions: ManagedCollectionAction[];
}

export interface CollectionImpactRequest {
  impactToken?: string;
}

export interface CollectionImpact {
  action: "delete" | "transfer";
  token: string;
  referenceCount: number;
  collections: {
    collectionId: string;
    title: string;
    referenceCount: number;
    removedSections: { id: string; title: string }[];
  }[];
}

export interface TransferCollectionRequest extends CollectionImpactRequest {
  email: string;
}

/**
 * Designed features that are not built yet. Using one records interest
 * (POST /api/v1/interest) and the client says it is on the way.
 */
export const interestFeatures = ["search", "subscriptions", "communities", "partners"] as const;
export type InterestFeature = (typeof interestFeatures)[number];

/** A tag on published collections, with how many use it. */
export interface PopularTag {
  name: string;
  collections: number;
}

/** Discover's Everything view in one read. */
export interface DiscoverOverview {
  popular: Collection[];
  hubs: import("./hubs.js").HubCard[];
  newest: Collection[];
  tags: PopularTag[];
}

/**
 * The reader's map: the hub (when the viewer may see it), its collections in
 * a stable order with their sections, and the collection after this one.
 * Visitors get published collections plus the one they are reading; owners
 * get every collection; a hub that is not public is left out entirely.
 */
export interface CollectionOutline {
  hub: { id: string; handle: string; name: string } | null;
  collections: Array<{
    id: string;
    title: string;
    current: boolean;
    sections: Array<{ id: string; title: string }>;
  }>;
  next: { id: string; title: string } | null;
}
