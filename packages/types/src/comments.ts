import type { IsoTimestamp, PersonRef } from "./envelope.js";

// Who wrote a comment: the person reference plus their collection role.
export interface CommentAuthor extends PersonRef {
  role: "owner" | "contributor" | null;
}

/** A section or item a comment is about; title null when it has none yet. */
export interface CommentScopeRef {
  id: string;
  title: string | null;
}

export interface CommentView {
  id: string;
  parentId: string | null;
  /** Section the question is about; replies inherit their parent's. */
  section: CommentScopeRef | null;
  /** Item attached from its Discuss action; replies inherit their parent's. */
  item: CommentScopeRef | null;
  // Null for hidden (to non-moderators) or deleted comments kept for their replies.
  body: string | null;
  state: "visible" | "hidden" | "deleted";
  // A reply the owner or a contributor marked as the answer to its question.
  accepted: boolean;
  author: CommentAuthor | null;
  version: number;
  createdAt: IsoTimestamp;
  editedAt: IsoTimestamp | null;
  canEdit: boolean;
  canModerate: boolean;
  replies: CommentView[];
  // Continue this thread with replyTo=id and replyCursor on the same question page.
  repliesNextCursor: string | null;
}

export interface CommentThreads {
  comments: CommentView[];
  // Comments are switched on for this collection.
  enabled: boolean;
  // The viewer may post (signed in, has access, comments on, not on hold).
  canComment: boolean;
  /** Every comment the viewer can see, replies included. */
  total: number;
  /** Questions with an answer the viewer can see (the Answered filter). */
  answered: number;
}

export interface CreateCommentRequest {
  body: string;
  parentId?: string;
  /** Top-level only: a section heading in this collection. */
  sectionId?: string;
  /** Top-level only: a link item in this collection. */
  itemId?: string;
}

/** Longest comment body accepted for new and edited comments. */
export const maxCommentLength = 2000;

export interface UpdateCommentRequest {
  body: string;
  version: number;
}
