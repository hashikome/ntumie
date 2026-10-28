"use client";
import { useState } from "react";
import { ResourceRow } from "./primitives";
import type { ResourcePresentation as Resource } from "./resource-presentation";

export function ResourceSections({
  items,
  section,
  itemBase,
  collectionId,
  canEdit = false,
  selectedItem,
  preview = false,
  discussBase,
  noteCollection,
}: {
  items: Resource[];
  /** The reader's address for "Discuss" on an item (opens the comment box with it). */
  discussBase?: string;
  noteCollection?: string;
  preview?: boolean;
  section?: Resource;
  selectedItem?: Resource;
  itemBase?: string | null;
  collectionId?: string;
  canEdit?: boolean;
}) {
  const SectionTitle = preview ? "h3" : "h2";
  const [selectedId, setSelectedId] = useState(selectedItem?.id);
  const select = (id: string, open: boolean) =>
    setSelectedId((current) => (open ? id : current === id ? undefined : current));
  const groups: Array<{ section?: Resource; items: Resource[] }> = [];
  let current: { section?: Resource; items: Resource[] } = { section, items: [] };
  for (const item of items) {
    if (item.kind === "heading") {
      if (current.items.length || current.section) groups.push(current);
      current = { section: item, items: [] };
    } else current.items.push(item);
  }
  if (current.items.length || current.section) groups.push(current);
  return (
    <>
      {selectedItem &&
        !items.some((item) => item.id === selectedItem.id) &&
        selectedItem.id !== section?.id && (
          <div className="linked-item">
            <p className="meta">Linked item</p>
            <ul className="resource-list">
              <ResourceRow
                key={selectedItem.id}
                item={selectedItem}
                itemBase={itemBase}
                preview={preview}
                discussBase={discussBase}
                noteCollection={noteCollection}
                expanded={selectedId === selectedItem.id}
                onExpandedChange={(open) => select(selectedItem.id, open)}
              />
            </ul>
          </div>
        )}
      <ul className="resource-list">
        {groups.flatMap((group) =>
          group.section
            ? [
                <li className="resource-section" key={group.section.id}>
                  {/* Sections read straight through; the hub tree and the phone
                      chips jump between them. */}
                  <section
                    className="reader-section"
                    id={`section-${group.section.id}`}
                    data-reader-section={group.section.id}
                    aria-labelledby={`section-title-${group.section.id}`}
                  >
                    <SectionTitle id={`section-title-${group.section.id}`}>
                      {group.section.title}
                    </SectionTitle>
                    {group.section.description && (
                      <p className="section-description">{group.section.description}</p>
                    )}
                    <ul className="resource-list">
                      {group.items.map((item) => (
                        <ResourceRow
                          key={item.id}
                          item={item}
                          itemBase={itemBase}
                          preview={preview}
                          discussBase={discussBase}
                          noteCollection={noteCollection}
                          expanded={item.id === selectedId}
                          onExpandedChange={(open) => select(item.id, open)}
                        />
                      ))}
                    </ul>
                  </section>
                  {canEdit && collectionId && (
                    <a
                      className="section-edit"
                      href={`/c/${collectionId}/sections?section=${group.section.id}`}
                    >
                      Edit section description
                    </a>
                  )}
                </li>,
              ]
            : group.items.map((item) => (
                <ResourceRow
                  key={item.id}
                  item={item}
                  itemBase={itemBase}
                  preview={preview}
                  discussBase={discussBase}
                  noteCollection={noteCollection}
                  expanded={item.id === selectedId}
                  onExpandedChange={(open) => select(item.id, open)}
                />
              )),
        )}
      </ul>
    </>
  );
}
