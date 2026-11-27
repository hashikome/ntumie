"use client";
import { maxNoteLength } from "@ntumie/types";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

export type SaveChoice = { id: string; title: string; sections: { id: string; title: string }[] };

// Three collections show at first: the chosen one among them.
const shown = 3;
const lastSection = (choice?: SaveChoice) => choice?.sections.at(-1)?.id ?? "";

// Everything under the link: where it goes (an existing collection and its
// section, or a new collection named in place), its tags and note, and the
// buttons. Without JavaScript the same controls post as they are: the new
// collection's fields show by CSS while "New collection" is chosen, and the
// section list belongs to the collection it was rendered for (`sectionsFor`).
export function SaveLinkFields({
  children,
  collections,
  here,
  selected,
  fresh,
  all: allAtFirst,
  sectionId,
  tags,
  note,
  name,
  suggestion,
  description,
  published,
  privateText,
  privateFull,
  dialog,
  cancel,
}: {
  children: ReactNode;
  collections: SaveChoice[];
  here?: string;
  selected: string;
  fresh: "new" | "first";
  all: boolean;
  sectionId?: string;
  tags: string;
  note: string;
  name: string;
  /** The name the API gives when none is typed. */
  suggestion: string;
  description: string;
  published: boolean;
  privateText: string;
  privateFull: boolean;
  dialog: boolean;
  cancel: string;
}) {
  const router = useRouter();
  const [enhanced, setEnhanced] = useState(false);
  const [destination, setDestination] = useState(selected);
  const [existing, setExisting] = useState(
    selected === fresh ? (collections[0]?.id ?? "") : selected,
  );
  const [all, setAll] = useState(allAtFirst);
  const chosen = collections.find((c) => c.id === destination);
  const [section, setSection] = useState(() =>
    sectionId && chosen?.sections.some((s) => s.id === sectionId) ? sectionId : lastSection(chosen),
  );
  const isNew = destination === fresh;
  // Choices made before the page was ready are adopted, not reset.
  const fields = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once, on hydration.
  useEffect(() => {
    const form = fields.current;
    const picked = form?.querySelector<HTMLInputElement>('input[name="destination"]:checked');
    const placed = form?.querySelector<HTMLSelectElement>('select[name="sectionId"]');
    if (picked && picked.value !== destination) choose(picked.value);
    else if (placed && placed.value !== section) setSection(placed.value);
    setEnhanced(true);
  }, []);
  const choose = (value: string) => {
    setDestination(value);
    if (value === fresh) return;
    setExisting(value);
    setSection(lastSection(collections.find((c) => c.id === value)));
  };
  const visible = all
    ? collections
    : collections.filter(
        (c, index) => index < shown || (c.id === destination && collections.length > shown),
      );
  const more = `?${new URLSearchParams({ ...(here ? { collection: here } : {}), all: "1" })}`;
  return (
    <>
      <div className="save-link-fields" ref={fields}>
        {children}
        <fieldset className={`save-collection${enhanced ? " enhanced" : ""}`}>
          <legend>Collection</legend>
          {collections.length ? (
            <>
              {/* Phones pick from a list; the radios below still carry the choice. */}
              <div className="save-pick">
                <select
                  aria-label="Collection"
                  value={destination}
                  onChange={(event) => choose(event.target.value)}
                  tabIndex={enhanced ? undefined : -1}
                >
                  <option value={fresh}>{isNew ? "New collection" : "New collection…"}</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {destination === here && <small aria-hidden="true">You are here</small>}
              </div>
              <ul className="save-choices">
                <li>
                  <label className="save-choice save-choice-new">
                    <input
                      type="radio"
                      name="destination"
                      value={fresh}
                      checked={isNew}
                      onChange={() => choose(fresh)}
                    />
                    <PlusIcon />
                    <span>{isNew ? "New collection" : "New collection…"}</span>
                  </label>
                </li>
                {visible.map((c) => (
                  <li key={c.id}>
                    <label className="save-choice">
                      <input
                        type="radio"
                        name="destination"
                        value={c.id}
                        checked={destination === c.id}
                        onChange={() => choose(c.id)}
                      />
                      <span>{c.title}</span>
                      {c.id === here && <small>You are here</small>}
                    </label>
                  </li>
                ))}
              </ul>
              {visible.length < collections.length && (
                <a
                  className="save-more"
                  href={more}
                  onClick={(event) => {
                    if (!enhanced) return;
                    event.preventDefault();
                    setAll(true);
                  }}
                >
                  Show all {collections.length} collections
                </a>
              )}
            </>
          ) : (
            <input type="hidden" name="destination" value={fresh} />
          )}
          <div className={`save-new${collections.length ? "" : " only"}`}>
            <div className="field">
              <label htmlFor="capture-name">Name</label>
              <input
                id="capture-name"
                name="collectionTitle"
                maxLength={255}
                defaultValue={name}
                placeholder={suggestion}
                aria-describedby="capture-name-help"
              />
              <p className="field-help" id="capture-name-help">
                The one idea this collection is about.
              </p>
            </div>
            <div className="field">
              <label htmlFor="capture-description">
                Description <span className="optional">(optional)</span>
              </label>
              <input
                id="capture-description"
                name="collectionDescription"
                maxLength={5000}
                defaultValue={description}
                placeholder="What a reader will understand by the end"
              />
            </div>
            <fieldset className="visibility-choice">
              <legend>Who can see it</legend>
              <label className="choice-card">
                <input type="radio" name="published" value="true" defaultChecked={published} />
                <span>
                  <b>Published</b>
                  <small>Anyone can find it on Discover and read it.</small>
                </span>
              </label>
              <label className="choice-card">
                <input
                  type="radio"
                  name="published"
                  value="false"
                  defaultChecked={!published}
                  disabled={privateFull}
                />
                <span>
                  <b>Private</b>
                  <small>{privateText}</small>
                </span>
              </label>
              <p className="field-help">
                We will remember your choice for the next new collection. Add sections whenever you
                are ready.
              </p>
            </fieldset>
            {collections.length > 0 && enhanced && (
              <button type="button" className="save-more" onClick={() => choose(existing)}>
                Choose an existing collection instead
              </button>
            )}
          </div>
        </fieldset>
        {chosen && (
          <div className="save-placement">
            <input type="hidden" name="sectionsFor" value={chosen.id} />
            {chosen.sections.length > 0 && (
              <div className="field">
                <label htmlFor="capture-section">Section</label>
                <select
                  id="capture-section"
                  name="sectionId"
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                >
                  {chosen.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                  <option value="">No section</option>
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="capture-tags">
                Tags <span className="optional">(optional)</span>
              </label>
              <input id="capture-tags" name="tags" maxLength={2000} defaultValue={tags} />
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="capture-note">
            Note <span className="optional">(optional)</span>
          </label>
          <textarea
            id="capture-note"
            name="note"
            rows={3}
            maxLength={maxNoteLength}
            defaultValue={note}
            placeholder="Why it is here, what to look for"
            aria-describedby="capture-note-help"
          />
          <p className="field-help" id="capture-note-help">
            Your words, shown with the link. The page description is added for you. {maxNoteLength}{" "}
            characters.
          </p>
        </div>
      </div>
      <div className="save-link-footer">
        <button type="submit" className="button primary">
          {isNew ? "Create and save" : "Save link"}
        </button>
        {dialog ? (
          <button type="button" className="button quiet" onClick={() => router.back()}>
            Cancel
          </button>
        ) : (
          <a className="button quiet" href={cancel}>
            Cancel
          </a>
        )}
      </div>
    </>
  );
}

const PlusIcon = () => (
  <svg
    className="save-plus"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
