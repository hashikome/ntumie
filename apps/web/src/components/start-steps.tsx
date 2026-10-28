import type { CaptureDraft } from "../lib/capture-draft";

const labels = ["Your collection", "Your email", "Confirm"] as const;

// Where someone is in Start a collection. Finished steps show a check.
export function StartSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="start-steps" aria-label="Steps">
      {labels.map((label, index) => {
        const step = index + 1;
        return (
          <li
            key={label}
            className={step < current ? "is-done" : step === current ? "is-current" : undefined}
            aria-current={step === current ? "step" : undefined}
          >
            {step < current && <span className="sr-only">Done: </span>}
            <span className="start-step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// The collection that is waiting while the person confirms their email.
export function DraftSummary({ draft }: { draft: CaptureDraft }) {
  const links = draft.links.length;
  return (
    <div className="draft-summary">
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
      <span>
        <b>{draft.collectionTitle ?? "Your new collection"}</b>
        <span>
          {links} {links === 1 ? "link" : "links"} ·{" "}
          {draft.published === false ? "Private" : "Published"}
        </span>
      </span>
      <a href={`/start/${draft.id}`}>
        Edit<span className="sr-only"> your collection</span>
      </a>
    </div>
  );
}
