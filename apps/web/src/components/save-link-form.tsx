import { randomUUID } from "node:crypto";
import { webServerConfig } from "@ntumie/config/web-server";
import type { CaptureDestination, CollectionNameSuggestion } from "@ntumie/types";
import type { CaptureDraft } from "../lib/capture-draft";
import { queryValue } from "../lib/http";
import { serverRead } from "../lib/server-api";
import { readOwnProfileResult, readSession } from "../lib/session";
import { isUuid } from "../lib/validation";
import { Feedback } from "./feedback";
import { FormNotice } from "./form-notice";
import { LinkField } from "./link-field";
import { NativeForm } from "./native-form";
import {
  PrivateLimitHelp,
  privateAllowanceText,
  privateLeft,
  readPrivateAllowance,
} from "./private-allowance";
import { SaveLinkFields } from "./save-link-fields";
import { SaveLinkFrame } from "./save-link-frame";

// Save a link (r2-save): the link with its title, the collection (the one the
// person is on first, marked "You are here"), its section, tags and a note; or
// a new collection named in place. The same form is the /capture page and,
// opened from the header, its dialog and phone sheet.
export async function SaveLinkForm({
  draft,
  query,
  dialog = false,
}: {
  draft?: CaptureDraft;
  query: Record<string, string | string[] | undefined>;
  dialog?: boolean;
}) {
  // The collection the person is on; a retry keeps the one it was saving into.
  const target = queryValue(query.collection);
  const here = isUuid(target) ? target : undefined;
  const keep = isUuid(draft?.destination) ? draft.destination : here;
  const [profile, session, allowance, suggestion, destinations] = await Promise.all([
    readOwnProfileResult(),
    readSession(),
    readPrivateAllowance(),
    serverRead<CollectionNameSuggestion>("/api/v1/capture/suggested-name"),
    serverRead<CaptureDestination[]>(
      `/api/v1/capture/destinations${keep ? `?${new URLSearchParams({ here: keep })}` : ""}`,
    ),
  ]);
  const path = draft ? `/capture/${draft.id}` : "/capture";
  if (!profile.ok && profile.status !== 401) return <Feedback error={profile} resetPath={path} />;
  if (!destinations.ok && destinations.status !== 401)
    return <Feedback error={destinations} resetPath={path} />;
  const choices = destinations.ok ? destinations.data : [];
  const editable = here && choices.some((c) => c.id === here) ? here : undefined;
  const id = draft?.id ?? randomUUID();
  // Signed in with no collection yet, the first save starts one.
  const fresh = choices.length ? "new" : "first";
  const selected =
    draft?.destination === "first" || draft?.destination === "new"
      ? fresh
      : (draft?.destination ?? editable ?? (choices.length ? choices[0].id : fresh));
  const full = privateLeft(allowance) === 0;
  const cancel = editable
    ? `/c/${editable}`
    : profile.ok
      ? profile.data.hubId
        ? `/h/${profile.data.hubId}`
        : `/${profile.data.username}`
      : "/";
  return (
    <SaveLinkFrame dialog={dialog} cancel={cancel}>
      <FormNotice code={queryValue(query.notice)} />
      <NativeForm action="/forms/capture-save" className="save-link-form">
        <input type="hidden" name="draftId" value={id} />
        {editable && <input type="hidden" name="here" value={editable} />}
        <SaveLinkFields
          collections={choices}
          here={editable}
          selected={selected}
          fresh={fresh}
          all={query.all === "1"}
          sectionId={draft?.sectionId}
          tags={draft?.link.tags?.join(", ") ?? ""}
          note={draft?.link.note ?? ""}
          name={draft?.collectionTitle ?? queryValue(query.title, 255) ?? ""}
          suggestion={suggestion.ok ? suggestion.data.title : ""}
          description={draft?.collectionDescription ?? ""}
          published={full || (draft?.published ?? session?.newCollectionPublished ?? true)}
          privateText={privateAllowanceText(allowance, Boolean(session))}
          privateFull={full}
          dialog={dialog}
          cancel={cancel}
        >
          <LinkField
            id="capture-url"
            label="Link"
            initial={draft?.link.url}
            origin={webServerConfig().publicOrigin}
          />
        </SaveLinkFields>
      </NativeForm>
      {full && <PrivateLimitHelp returnTo={path} />}
    </SaveLinkFrame>
  );
}
