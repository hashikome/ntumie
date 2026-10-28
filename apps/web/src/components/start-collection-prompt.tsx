// Shown to someone with no collections: their hub comes with their first
// collection (ADR-0069), so starting one is the only call to action.
// `hubAddress` is shown only when the (hidden) hub already exists; a new hub's
// handle is chosen when it is created.
export function StartCollectionPrompt({ hubAddress }: { hubAddress?: string }) {
  return (
    <section className="start-prompt" aria-labelledby="start-prompt-title">
      <h2 id="start-prompt-title">Start your first collection</h2>
      <p>
        Pick one idea you know well and add the first link that explains it. Your hub comes with it.
      </p>
      <ul className="start-prompt-points">
        <li>
          <Check />
          Name the idea; add links and sections as you go
        </li>
        <li>
          <Check />
          {hubAddress ? (
            <span>
              Your hub, <b>{hubAddress}</b>, opens to visitors once you publish
            </span>
          ) : (
            "Your hub is created with it"
          )}
        </li>
        <li>
          <Check />
          Publish it when it is ready to share
        </li>
      </ul>
      <form action="/start" method="get">
        <label htmlFor="start-title">What is it about?</label>
        <input
          id="start-title"
          name="title"
          maxLength={255}
          placeholder="Starting a kitchen garden"
          required
        />
        <button type="submit" className="button primary">
          Start a collection
        </button>
      </form>
    </section>
  );
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}
