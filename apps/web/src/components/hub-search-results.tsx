import type { HubSearchResult } from "@ntumie/types";
import { Marked } from "./collection-card";

// What a search found inside a hub, grouped. The dialog and the page without
// JavaScript show the same list. Links open in their collection.
export function HubSearchResults({ result }: { result: HubSearchResult }) {
  const { collections, sections, links } = result;
  if (!collections.length && !sections.length && !links.length)
    return <p className="hub-search-status">Nothing in this hub matches that.</p>;
  return (
    <div className="hub-search-results">
      {collections.length > 0 && (
        <section>
          <h2>Collections</h2>
          <ul>
            {collections.map((collection) => (
              <li key={collection.id}>
                <a href={`/c/${collection.id}`}>
                  <Marked text={collection.title} />
                  {collection.description && (
                    <small>
                      <Marked text={collection.description} />
                    </small>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {sections.length > 0 && (
        <section>
          <h2>Sections</h2>
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`/c/${section.collectionId}#section-${section.id}`}>
                  <Marked text={section.title} />
                  <small>{section.collectionTitle}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {links.length > 0 && (
        <section>
          <h2>Links</h2>
          <ul>
            {links.map((link) => (
              <li key={link.id}>
                <a href={`/c/${link.collectionId}?item=${link.id}`}>
                  <Marked text={link.title} />
                  <small>{link.collectionTitle}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
