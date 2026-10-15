import type { IsoTimestamp } from "./envelope.js";

// The authenticated user's own profile (GET/PATCH /profile). `handle`/`hubId`
// describe the user's one hub; `hubId` is the client's entry point to every
// hub-scoped call.
export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  /** Private display preference: IANA timezone, or null for the viewer's device. */
  timeZone: string | null;
  /** Hub setting: publish its owner connection. Null when the person has no hub. */
  showOwner: boolean | null;
  handle: string | null;
  /** Backend-derived next eligible handle change; null when available or without a hub. */
  handleChangeAvailableAt: IsoTimestamp | null;
  hubId: string | null;
  hubName: string | null;
  /** Every collection in the hub, private ones included; null without a hub. */
  hubCollectionCount: number | null;
  /** Public profile shows the published collections this person saved. */
  showSavedCollections: boolean;
  email: string;
  hubDescription: string | null;
  image: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface UpdateProfileRequest {
  /** Stored lowercase, 3–20 letters/digits with single internal hyphens. */
  username?: string;
  hubName?: string;
  displayName?: string;
  /** Public plain text, at most 500 characters. Empty string clears it. */
  bio?: string;
  /** Null restores Automatic (device timezone). */
  timeZone?: string | null;
  showOwner?: boolean;
  handle?: string;
  hubDescription?: string;
  /** Show the published collections you saved on your public profile. */
  showSavedCollections?: boolean;
}

export interface HandleAvailability {
  handle: string;
  status: "available" | "current" | "invalid" | "reserved" | "taken";
}

export interface PersonProfile {
  person: import("./envelope.js").PersonRef & { name: string | null; bio: string | null };
  hub: { id: string; handle: string; name: string } | null;
  collections: import("./collections.js").Collection[];
  /** How many public collections this person has contributed to. */
  contributionCount: number;
  /** Published collections they saved, when they chose to show them; else null. */
  saved: import("./collections.js").Collection[] | null;
  savedCount: number | null;
}
export interface UsernameAvailability {
  username: string;
  status: HandleAvailability["status"];
  /** Available shortened spelling for an overlong draft; not a reservation. */
  suggestion?: string;
}
