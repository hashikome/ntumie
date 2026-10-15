"use client";

import type { Collection, HubPage, Resource } from "@ntumie/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserRead } from "../lib/browser-api";
import { type ApiPath, type Failure, withCursor } from "../lib/http";
import { refreshInApp } from "../lib/navigation";
import { CollectionCard, OwnedCollectionRow } from "./collection-card";
import { Retry } from "./feedback";
import { ResourceSections } from "./resource-sections";

type Props = {
  path: ApiPath;
  nextCursor?: string | null;
  token?: string;
  itemBase?: string;
  section?: Resource;
  selectedItem?: Resource;
  collectionId?: string;
  canEdit?: boolean;
  publicHub?: { handle: string; preview?: boolean };
} & (
  | {
      kind: "collections";
      initial: Collection[];
      /** Cards (Discover, a hub to visitors) or the owner's rows. */
      layout: "cards" | "rows";
      /** Cards name each collection's hub except on that hub's own page. */
      showHub?: boolean;
    }
  | { kind: "resources"; initial: Resource[] }
);
export function PaginatedList(props: Props) {
  const [items, setItems] = useState<(Collection | Resource)[]>(props.initial);
  const [cursor, setCursor] = useState(props.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Failure>();
  const [announcement, setAnnouncement] = useState("");
  // Links without a title are looked up when the collection opens; read the
  // first page once more shortly after and fill in the titles that arrived.
  // biome-ignore lint/correctness/useExhaustiveDependencies: One follow-up read per opened list.
  useEffect(() => {
    if (props.kind !== "resources") return;
    const untitled = (props.initial as Resource[]).some(
      (r) => r.kind === "external_link" && !r.title,
    );
    if (!untitled) return;
    // The worker looks titles up within seconds of a save (a slow site takes up
    // to its 3 s deadline); read again twice to pick them up.
    const controller = new AbortController();
    const refresh = async () => {
      const result = await browserRead<Resource[]>(
        props.path,
        controller.signal,
        props.token,
      ).catch(() => null);
      if (!result?.ok) return;
      const fresh = new Map(result.data.map((r) => [r.id, r]));
      setItems((current) =>
        current.map((item) => {
          const found = fresh.get(item.id);
          return found?.title && !(item as Resource).title
            ? {
                ...item,
                title: found.title,
                description: found.description,
                siteName: found.siteName,
              }
            : item;
        }),
      );
    };
    const timers = [2500, 6000].map((delay) => setTimeout(refresh, delay));
    return () => {
      for (const timer of timers) clearTimeout(timer);
      controller.abort();
    };
  }, []);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current?.abort();
    active.current = null;
    setItems(props.initial);
    setCursor(props.nextCursor);
    setPending(false);
    setError(undefined);
  }, [props.initial, props.nextCursor]);
  const continuation = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!restoreFocus.current) return;
    continuation.current?.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true });
    if (!pending) restoreFocus.current = false;
  }, [pending]);
  useEffect(() => {
    const stop = () => {
      active.current?.abort();
      active.current = null;
      setPending(false);
    };
    window.addEventListener("reader:suspend", stop);
    return () => {
      stop();
      window.removeEventListener("reader:suspend", stop);
    };
  }, []);
  const more = useCallback(async () => {
    if (!cursor || active.current) return;
    restoreFocus.current = continuation.current?.contains(document.activeElement) ?? false;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError(undefined);
    const result = await browserRead<(Collection | Resource)[] | HubPage>(
      withCursor(props.path, cursor),
      controller.signal,
      props.token,
    );
    if (controller.signal.aborted) return;
    active.current = null;
    setPending(false);
    if (!result.ok) {
      if ([401, 403, 404].includes(result.status)) {
        document.documentElement.dataset.revalidating = "true";
        refreshInApp();
        return;
      }
      setError(result);
      return;
    }
    const data = props.publicHub
      ? (result.data as HubPage).collections
      : (result.data as (Collection | Resource)[]);
    const seen = new Set(items.map((item) => item.id));
    const additions = data.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    setItems((current) => [...current, ...additions]);
    setCursor(result.meta?.nextCursor);
    setAnnouncement(`${additions.length} more ${props.kind} loaded.`);
  }, [cursor, items, props.kind, props.path, props.publicHub, props.token]);
  const automaticCursor = useRef<string | null>(null);
  useEffect(() => {
    if (props.kind !== "resources" || !cursor || error) return;
    const body = continuation.current?.closest<HTMLElement>(".sheet-body");
    if (!body) return;
    const media = matchMedia("(min-width: 1024px) and (min-height: 600px)");
    let previousTop = body.scrollTop;
    const onScroll = () => {
      const top = body.scrollTop;
      const movingDown = top > previousTop;
      previousTop = top;
      if (
        !movingDown ||
        !media.matches ||
        document.hidden ||
        document.documentElement.dataset.revalidating ||
        active.current ||
        automaticCursor.current === cursor ||
        body.scrollHeight - top - body.clientHeight > 192
      )
        return;
      // One automatic attempt per cursor. Failures keep the explicit retry,
      // and a repeated cursor cannot turn a scroll gesture into a request loop.
      automaticCursor.current = cursor;
      void more();
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    return () => body.removeEventListener("scroll", onScroll);
  }, [cursor, error, more, props.kind]);
  const viewParams = {
    ...(props.token ? { s: props.token } : {}),
    ...(props.publicHub?.preview ? { view: "public" } : {}),
  };
  const fallback = `?${new URLSearchParams({ cursor: cursor ?? "", ...viewParams })}`;
  return (
    <>
      {props.kind === "resources" ? (
        <ResourceSections
          items={items as Resource[]}
          section={props.section}
          itemBase={props.itemBase}
          collectionId={props.collectionId}
          canEdit={props.canEdit}
          selectedItem={props.selectedItem}
        />
      ) : (
        <ul className={props.layout === "cards" ? "collection-cards" : "collection-rows"}>
          {(items as Collection[]).map((item) =>
            props.layout === "cards" ? (
              <CollectionCard key={item.id} item={item} showHub={props.showHub} />
            ) : (
              <OwnedCollectionRow key={item.id} item={item} />
            ),
          )}
        </ul>
      )}
      {!items.length && (
        <p className="empty">
          {props.kind === "collections"
            ? props.publicHub
              ? "No published collections here yet."
              : "No published collections yet."
            : "No resources in this collection yet."}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="continuation" aria-busy={pending} ref={continuation}>
        {error && (
          <p role="status">
            {error.code === "invalid_cursor"
              ? "This list has changed. Reload to see the latest results."
              : "Couldn't load more. Your current results are still here."}
          </p>
        )}
        {error?.code === "invalid_cursor" ? (
          <a className="button" href={`?${new URLSearchParams(viewParams)}`}>
            Reload list
          </a>
        ) : error ? (
          <Retry seconds={error.retryAfter} action={() => more()} />
        ) : cursor || announcement ? (
          <a
            className="button"
            href={fallback}
            aria-disabled={pending || !cursor}
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              void more();
            }}
          >
            {pending
              ? "Loading…"
              : cursor
                ? `${props.kind === "collections" ? "Show more" : "More"} ${props.kind}`
                : `All ${props.kind} loaded`}
          </a>
        ) : null}
      </div>
    </>
  );
}
