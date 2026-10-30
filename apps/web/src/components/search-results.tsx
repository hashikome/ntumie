"use client";
import type { CollectionSearchHit, DiscoverSearchResult } from "@ntumie/types";
import { useEffect, useRef, useState } from "react";
import { browserRead } from "../lib/browser-api";
import { type ApiPath, withCursor } from "../lib/http";
import { CollectionCard } from "./collection-card";

// Collections found by a search, best match first. "Show more results" adds the
// next page in place; without JavaScript it is a link to that page.
export function SearchResults({
  path,
  query,
  initial,
  nextCursor,
  nextHref,
}: {
  path: ApiPath;
  query: string;
  initial: CollectionSearchHit[];
  nextCursor: string | null;
  nextHref: string | null;
}) {
  const [hits, setHits] = useState(initial);
  const [cursor, setCursor] = useState(nextCursor);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current?.abort();
    active.current = null;
    setHits(initial);
    setCursor(nextCursor);
    setPending(false);
    setFailed(false);
  }, [initial, nextCursor]);
  const more = async () => {
    if (!cursor || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setFailed(false);
    const result = await browserRead<DiscoverSearchResult>(
      withCursor(path, cursor),
      controller.signal,
    ).catch(() => null);
    if (controller.signal.aborted) return;
    active.current = null;
    setPending(false);
    if (!result?.ok) return setFailed(true);
    setHits((current) => [...current, ...result.data.collections]);
    setCursor(result.meta?.nextCursor ?? null);
  };
  return (
    <>
      <ul className="collection-cards">
        {hits.map(({ collection, highlight }) => (
          <CollectionCard
            key={collection.id}
            item={collection}
            highlight={highlight}
            searchQuery={query}
          />
        ))}
      </ul>
      {failed && <p role="status">Couldn't load more. Your current results are still here.</p>}
      {cursor && nextHref && (
        <div className="continuation" aria-busy={pending}>
          <a
            className="button"
            href={nextHref}
            aria-disabled={pending}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              void more();
            }}
          >
            {pending ? "Loading…" : "Show more results"}
          </a>
        </div>
      )}
    </>
  );
}
