import "server-only";
import { randomBytes } from "node:crypto";
import { webServerConfig } from "@ntumie/config/web-server";
import type { CaptureRequest, CaptureResult } from "@ntumie/types";
import { cookies } from "next/headers";
import { recoveryRequest } from "./action-recovery";
import { type CaptureDraft, draftPath, draftTtl, openDraft, sealDraft } from "./capture-draft";
import { serverCookie } from "./cookies";
import { formPost, redirectResponse } from "./form-server";
import { isUuid } from "./validation";

// The cookie `capture_<id>` holds `ref.<token>`; the sealed draft lives in the
// API's action-recovery store under the token's hash, for the draft's lifetime.
// Reading a draft needs both its address and this browser's cookie.
const reference = /^ref\.([a-f0-9]{64})$/;
const cookieName = (id: string) => `capture_${id}`;

async function storedDraft(id: string, raw: string | undefined) {
  const token = raw && reference.exec(raw)?.[1];
  if (!token) return null;
  const sealed = await recoveryRequest({ operation: "get", token });
  return sealed ? openDraft(sealed, id, webServerConfig().sourceSecret) : null;
}

export async function readDraft(id: string) {
  return storedDraft(id, (await cookies()).get(cookieName(id))?.value);
}

async function forget(id: string) {
  const token = reference.exec((await cookies()).get(cookieName(id))?.value ?? "")?.[1];
  // A failed cleanup only leaves a row that expires with the draft.
  if (token) await recoveryRequest({ operation: "delete", token }).catch(() => undefined);
}

/** Keeps the draft for the rest of its lifetime, or clears it. */
export async function draftCookie(draft: CaptureDraft, clear = false) {
  await forget(draft.id);
  const left = Math.ceil(draftTtl - (Date.now() - draft.issued) / 1000);
  if (clear || left < 60) return serverCookie(cookieName(draft.id), "", 0);
  const token = randomBytes(32).toString("hex");
  await recoveryRequest({
    operation: "put",
    token,
    payload: sealDraft(draft, webServerConfig().sourceSecret),
    ttl: left,
  });
  return serverCookie(cookieName(draft.id), `ref.${token}`, left);
}

// At most three waiting drafts per browser: the newest two stay beside a new one.
export async function draftRoom() {
  const jar = await cookies();
  const entries = jar
    .getAll()
    .filter((c) => c.name.startsWith("capture_") && isUuid(c.name.slice(8)));
  const valid = (await Promise.all(entries.map((c) => storedDraft(c.name.slice(8), c.value))))
    .filter((d) => d !== null)
    .sort((a, b) => b.issued - a.issued);
  return Promise.all(valid.slice(2).map((d) => draftCookie(d, true)));
}
export async function saveDraft(
  request: Request,
  draft: CaptureDraft,
  extraCookies: string[] = [],
) {
  const body = {
    operationId: draft.operationId,
    startedAt: draft.issued,
    link: draft.link,
    destination: draft.destination,
    published: draft.published ?? true,
    ...(draft.sectionId ? { sectionId: draft.sectionId } : {}),
    ...(draft.collectionTitle ? { collectionTitle: draft.collectionTitle } : {}),
    ...(draft.collectionDescription ? { collectionDescription: draft.collectionDescription } : {}),
  } satisfies CaptureRequest;
  const result = await formPost<CaptureResult>(request, "/api/v1/capture", body);
  if (result.ok)
    return redirectResponse(
      // A started collection lands with its first link open and says so.
      draft.start
        ? `/c/${result.data.collectionId}?${new URLSearchParams({
            item: result.data.resourceId,
            notice: "collection-created",
          })}`
        : `/c/${result.data.collectionId}?notice=link-saved`,
      // The collection is saved; a failed cleanup only leaves a draft that expires.
      [
        ...extraCookies,
        ...(await draftCookie(draft, true).then(
          (c) => [c],
          () => [],
        )),
      ],
    );
  const path = draftPath(draft);
  // Keeping the draft can fail only when the API is unreachable; then say so.
  const kept = await draftCookie(draft).catch(() => null);
  if (!kept) return redirectResponse(`${path}?notice=unavailable`, extraCookies);
  if (result.status === 401)
    return redirectResponse(`/sign-in?returnTo=${encodeURIComponent(path)}&notice=signin`, [
      ...extraCookies,
      kept,
    ]);
  return redirectResponse(
    `${path}?notice=${
      result.code === "capture_destination_required"
        ? "choose-destination"
        : result.code === "capture_section_missing"
          ? "section-missing"
          : result.code === "private_allowance_reached"
            ? "private-allowance"
            : result.code === "link_not_public"
              ? "link-not-public"
              : result.status === 429
                ? "limited"
                : "save-failed"
    }`,
    [...extraCookies, kept],
  );
}
