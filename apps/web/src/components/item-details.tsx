"use client";
import { maxNoteLength } from "@ntumie/types";
import { useEffect, useId, useState } from "react";
import { Avatar } from "./avatar";
import { LocalTime, Updated } from "./local-time";
import { NativeForm } from "./native-form";
import type { ResourcePresentation } from "./resource-presentation";

// Inline context beneath the item's disclosure; the API authorizes every field.
// Board order: what the link is, why it is here (the adder's note), who added
// it and when, then Copy link and Discuss.
export function ItemDetails({
  item,
  permalink,
  preview = false,
  discussHref,
  noteCollection,
}: {
  item: ResourcePresentation;
  permalink?: string;
  preview?: boolean;
  discussHref?: string;
  /** Set for people who can edit: a link without a note offers "Add a note". */
  noteCollection?: string;
}) {
  const addNote =
    noteCollection && item.kind === "external_link" && !item.note && item.version !== undefined;
  return (
    <div className="item-context">
      {item.description && <p className="description">{item.description}</p>}
      {item.kind === "collection_link" && !item.linkedCollection && (
        <p>This collection may be private or no longer available.</p>
      )}
      {item.note && (
        <figure className="item-note">
          {item.addedBy && (
            <figcaption>
              <Avatar userId={item.addedBy.userId} />
              {item.addedBy.username}
            </figcaption>
          )}
          <blockquote>{item.note}</blockquote>
        </figure>
      )}
      {(item.createdAt || item.addedBy) && (
        <p className="meta item-added">
          Added{" "}
          {item.addedBy && (
            <>
              by{" "}
              {preview ? (
                <b>{item.addedBy.username}</b>
              ) : (
                <a className="person" href={`/${encodeURIComponent(item.addedBy.username)}`}>
                  {item.addedBy.username}
                </a>
              )}{" "}
            </>
          )}
          {item.createdAt &&
            // Today reads relative ("just now", per the board); older adds by day.
            (Date.now() - Date.parse(item.createdAt) < 86_400_000 ? (
              <Updated at={item.createdAt} />
            ) : (
              <>
                on <LocalTime at={item.createdAt} variant="day" />
              </>
            ))}
        </p>
      )}
      {(permalink || discussHref || addNote) && (
        <div className="item-actions">
          {permalink && <ItemPermalink permalink={permalink} />}
          {addNote && noteCollection && item.version !== undefined && (
            <AddNote collectionId={noteCollection} itemId={item.id} version={item.version} />
          )}
          {discussHref && (
            <a className="button text-button item-discuss" href={discussHref}>
              Discuss
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Why this link is here, added where it is read. Without JavaScript the
// disclosure still opens and the form posts.
function AddNote({
  collectionId,
  itemId,
  version,
}: {
  collectionId: string;
  itemId: string;
  version: number;
}) {
  const fieldId = useId();
  return (
    <details className="item-add-note">
      <summary className="text-button">Add a note</summary>
      <NativeForm action="/forms/item-note">
        <input type="hidden" name="collectionId" value={collectionId} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="version" value={version} />
        <label htmlFor={fieldId}>Note</label>
        <textarea
          id={fieldId}
          name="note"
          rows={3}
          required
          maxLength={maxNoteLength}
          placeholder="Why this link is worth reading"
        />
        <button type="submit" className="button primary">
          Save note
        </button>
      </NativeForm>
    </details>
  );
}

function ItemPermalink({ permalink }: { permalink: string }) {
  const inputId = useId();
  const [enhanced, setEnhanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [manualLink, setManualLink] = useState("");
  useEffect(() => setEnhanced(true), []);
  return (
    <div className="item-link-copy">
      {enhanced && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={async () => {
            const link = new URL(permalink, window.location.origin).href;
            setBusy(true);
            setStatus("Copying…");
            setManualLink("");
            try {
              await navigator.clipboard.writeText(link);
              setStatus("Link copied.");
            } catch {
              setManualLink(link);
              setStatus("Select the link below and copy it.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Copy link to this item
        </button>
      )}
      <noscript>
        <a href={permalink}>Open item link to copy its address</a>
      </noscript>
      <span className="meta" role="status">
        {status}
      </span>
      {manualLink && (
        <div className="action-form">
          <label htmlFor={inputId}>Link to this item</label>
          <input
            id={inputId}
            value={manualLink}
            readOnly
            onFocus={(event) => event.target.select()}
          />
        </div>
      )}
    </div>
  );
}
