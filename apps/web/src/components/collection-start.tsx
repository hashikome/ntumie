import { webServerConfig } from "@ntumie/config/web-server";
import { CopyLink } from "./copy-link";
import { ShareAction } from "./share-action";

// A new collection's owner prompts, shown until it reads like a collection
// (three links or a first section): where it lives, above the links...
export function LivePanel({ id, published }: { id: string; published: boolean }) {
  const address = new URL(`/c/${id}`, webServerConfig().publicOrigin);
  const shown = `${address.host}/c/${id.slice(0, 6)}…`;
  return (
    <section className="live-panel" aria-label="Collection address">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </svg>
      <p>
        <b>
          {published ? "It is live at " : "It lives at "}
          {shown}
        </b>
        <span>
          {published
            ? "Published: anyone with the address or on Discover can read it."
            : "Private: only you, and people you share it with, can read it."}
        </span>
      </p>
      <CopyLink href={address.href} />
    </section>
  );
}

// ...and the next few steps, below them.
export function KeepBuilding({ id, returnTo }: { id: string; returnTo: string }) {
  return (
    <section className="keep-building" aria-labelledby="keep-building-title">
      <h2 id="keep-building-title">Keep building it</h2>
      <p>A collection reads best with a few links in the order they make sense.</p>
      <ul>
        <li>
          <span>
            <b>Save the next link</b>
            <span>Paste an address; it lands here.</span>
          </span>
          <a className="button primary" href={`/capture?collection=${id}`}>
            <span className="desktop-label">Save a link</span>
            <span className="phone-label">Save the next link</span>
          </a>
        </li>
        <li>
          <span>
            <b>Put links in order</b>
            <span>Sections such as "Getting started" and "Going further".</span>
          </span>
          <a className="button" href={`/c/${id}/sections`}>
            Add a section
          </a>
        </li>
        <li className="keep-share">
          <span>
            <b>Share it</b>
            <span>Send the address to someone who is starting too.</span>
          </span>
          <ShareAction target={{ kind: "collection", id }} returnTo={returnTo} />
        </li>
      </ul>
    </section>
  );
}
