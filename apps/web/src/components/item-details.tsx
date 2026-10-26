"use client";
import { useEffect, useId, useState } from "react";
import { Avatar } from "./avatar";
import { LocalTime } from "./local-time";
import type { ResourcePresentation } from "./resource-presentation";

// Inline context beneath the item's disclosure; the API authorizes every field.
// Board order: what the link is, why it is here (the adder's note), who added
// it and when, then Copy link and Discuss.
export function ItemDetails({
  item,
  permalink,
  preview = false,
  discussHref,
}: {
  item: ResourcePresentation;
  permalink?: string;
  preview?: boolean;
  discussHref?: string;
}) {
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
          {item.createdAt && (
            <>
              on <LocalTime at={item.createdAt} variant="day" />
            </>
          )}
        </p>
      )}
      {(permalink || discussHref) && (
        <div className="item-actions">
          {permalink && <ItemPermalink permalink={permalink} />}
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
