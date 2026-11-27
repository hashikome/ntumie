import { randomUUID } from "node:crypto";
import { webServerConfig } from "@ntumie/config/web-server";
import type { Collection, CollectionNameSuggestion, CollectionOutline } from "@ntumie/types";
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
import { type SaveChoice, SaveLinkFields } from "./save-link-fields";
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
  const [profile, session, allowance, suggestion] = await Promise.all([
    readOwnProfileResult(),
    readSession(),
    readPrivateAllowance(),
    serverRead<CollectionNameSuggestion>("/api/v1/capture/suggested-name"),
  ]);
  const path = draft ? `/capture/${draft.id}` : "/capture";
  if (!profile.ok && profile.status !== 401) return <Feedback error={profile} resetPath={path} />;
  const target = queryValue(query.collection);
  const here = isUuid(target) ? target : undefined;
  const choices = profile.ok ? await collectionChoices(profile.data.hubId, here) : [];
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

// The collections a link can be saved into, each with its sections: the
// person's own (the outline of any one lists them all), most recently updated
// first, and the one they are on first of all, even when it is someone
// else's they contribute to.
async function collectionChoices(hubId: string | null, here?: string): Promise<SaveChoice[]> {
  const own = hubId
    ? await serverRead<Collection[]>(`/api/v1/hubs/${hubId}/collections?limit=50`)
    : null;
  const ownList = own?.ok ? own.data : [];
  const outlineOf = async (id: string) => {
    const outline = await serverRead<CollectionOutline>(`/api/v1/collections/${id}/outline`);
    return outline.ok ? outline.data.collections : [];
  };
  const mapped = ownList.length ? await outlineOf(ownList[0].id) : [];
  const sections = new Map(mapped.map((c) => [c.id, c.sections]));
  const recent = new Map(ownList.map((c, index) => [c.id, index]));
  const choices: SaveChoice[] = mapped
    .map((c) => ({ id: c.id, title: c.title, sections: c.sections }))
    .sort(
      (a, b) =>
        (recent.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (recent.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  if (here && !sections.has(here)) {
    const shared = await serverRead<Collection>(`/api/v1/collections/${here}`);
    if (shared.ok && shared.data.capabilities?.canEdit) {
      const current = (await outlineOf(here)).find((c) => c.current);
      choices.unshift({
        id: here,
        title: shared.data.title,
        sections: current?.sections ?? [],
      });
    }
  }
  const at = choices.findIndex((c) => c.id === here);
  if (at > 0) choices.unshift(...choices.splice(at, 1));
  return choices;
}
