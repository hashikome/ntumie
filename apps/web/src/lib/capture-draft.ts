import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { recoveryPayloadLimit } from "@ntumie/config/action-recovery";
import { type CaptureLink, maxNoteLength } from "@ntumie/types";
import { captureUrl, isUuid } from "./validation";

export const draftTtl = 1800;
export const maxDescriptionLength = 5000;
export interface CaptureDraft {
  id: string;
  operationId: string;
  link: CaptureLink;
  destination: string;
  /** A heading of the destination; the link lands at the end of its section. */
  sectionId?: string;
  collectionTitle?: string;
  collectionDescription?: string;
  published?: boolean;
  /** Started from Start a collection (lives at /start/<id>, lands as created). */
  start?: boolean;
  issued: number;
}

// Where a waiting draft is shown, and where signing in returns.
export const draftPath = (draft: Pick<CaptureDraft, "id" | "start">) =>
  `/${draft.start ? "start" : "capture"}/${draft.id}`;
const key = (secret: string) => createHash("sha256").update(`web-capture:${secret}`).digest();
// A draft is sealed here and kept by the API's action-recovery store; the
// browser holds only a reference to it (capture-server.ts).
export function sealDraft(draft: CaptureDraft, secret: string): string {
  const text = JSON.stringify(draft);
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const sealed = Buffer.concat([
    iv,
    cipher.update(text),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64url");
  if (sealed.length > recoveryPayloadLimit) throw new Error("draft-size");
  return sealed;
}
export function openDraft(
  raw: string,
  id: string,
  secret: string,
  now = Date.now(),
): CaptureDraft | null {
  try {
    if (!isUuid(id) || raw.length > recoveryPayloadLimit) return null;
    const bytes = Buffer.from(raw, "base64url"),
      decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(-16));
    const draft = JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString(),
    );
    if (
      draft.id !== id ||
      !isUuid(draft.operationId) ||
      !captureUrl(draft.link?.url) ||
      (draft.link.tags !== undefined &&
        !(
          Array.isArray(draft.link.tags) &&
          draft.link.tags.every((tag: unknown) => typeof tag === "string")
        )) ||
      (draft.link.note !== undefined &&
        (typeof draft.link.note !== "string" || draft.link.note.length > maxNoteLength)) ||
      (draft.sectionId !== undefined && !isUuid(draft.sectionId)) ||
      (draft.collectionDescription !== undefined &&
        (typeof draft.collectionDescription !== "string" ||
          draft.collectionDescription.length > maxDescriptionLength)) ||
      (draft.published !== undefined && typeof draft.published !== "boolean") ||
      (draft.start !== undefined && draft.start !== true) ||
      (draft.collectionTitle !== undefined &&
        (typeof draft.collectionTitle !== "string" || draft.collectionTitle.length > 255)) ||
      !Number.isFinite(draft.issued) ||
      draft.issued > now ||
      now - draft.issued >= draftTtl * 1000 ||
      typeof draft.destination !== "string" ||
      (!["first", "new"].includes(draft.destination) && !isUuid(draft.destination))
    )
      return null;
    return draft;
  } catch {
    return null;
  }
}
