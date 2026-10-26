import type { CollectionOutline } from "@ntumie/types";
import { permalink } from "../lib/http";

// The hub around a collection: its home, then its collections in a stable
// order, each opening to its sections. The current collection starts open and
// its section links follow the reading position (SectionSpy).
export function ReaderTree({ outline, token }: { outline: CollectionOutline; token?: string }) {
  return (
    <>
      {outline.hub && (
        <a className="tree-row tree-home" href={`/h/${encodeURIComponent(outline.hub.id)}`}>
          <HomeIcon />
          {outline.hub.name}
        </a>
      )}
      <p className="tree-label">Collections</p>
      <ul className="tree-collections">
        {outline.collections.map((collection) => {
          // A private collection read through its link keeps the token.
          const href = collection.current
            ? permalink(collection.id, token)
            : permalink(collection.id);
          return (
            <li key={collection.id} className={collection.current ? "is-current" : undefined}>
              {collection.sections.length ? (
                <details open={collection.current}>
                  <summary>
                    <a
                      className="tree-row"
                      href={href}
                      aria-current={collection.current ? "page" : undefined}
                    >
                      {collection.title}
                    </a>
                    <Chevron />
                  </summary>
                  <ul className="tree-sections">
                    {collection.sections.map((section) => (
                      <li key={section.id}>
                        <a
                          href={
                            collection.current
                              ? `#section-${section.id}`
                              : `${href}#section-${section.id}`
                          }
                          data-section-link={collection.current ? section.id : undefined}
                        >
                          {section.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <a
                  className="tree-row"
                  href={href}
                  aria-current={collection.current ? "page" : undefined}
                >
                  {collection.title}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function HomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      className="tree-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
