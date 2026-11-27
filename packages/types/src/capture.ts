export interface CaptureLink {
  url: string;
  tags?: string[];
  /** Why this link is here (at most maxNoteLength). */
  note?: string;
}
export interface CaptureRequest {
  operationId: string;
  startedAt: number;
  /** "first", "new", or the id of a collection to save into. */
  destination: string;
  link: CaptureLink;
  /** A section (heading) of the destination collection; the link lands at its end. */
  sectionId?: string;
  /** Name for a collection created by this save ("new" or a first capture); blank uses the dated default. */
  collectionTitle?: string;
  /** Description for a collection created by this save. */
  collectionDescription?: string;
  /** Visibility of a collection created by this save; remembered for the next one. */
  published?: boolean;
}
export interface CaptureResult {
  collectionId: string;
  resourceId: string;
}
/** The name a new collection gets when none is typed. */
export interface CollectionNameSuggestion {
  title: string;
}
export interface LinkPreview {
  url: string;
  /** Recognized application collection URL; no ownership or availability implied. */
  collectionHint?: boolean;
  title: string | null;
  /** found: title read. untitled: no title (blocked, slow, none) — still saveable.
   *  no_domain: the host name does not exist, so the address is a typo. */
  status: "found" | "untitled" | "no_domain";
}

// Tags on links and collections: at most 30, each up to 80 characters.
export const maxTags = 30;
export const maxTagLength = 80;
