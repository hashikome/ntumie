"use client";
import { type HubSearchResult, maxSearchLength } from "@ntumie/types";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { browserRead } from "../lib/browser-api";
import { HubSearchResults } from "./hub-search-results";

// "Search this hub" (Ctrl K): a dialog over the reader. Without JavaScript the
// button is a link to the same search as a page.
export function HubSearch({ hubId }: { hubId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<HubSearchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const page = `/h/${encodeURIComponent(hubId)}/search`;
  const open = useCallback(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey)) return;
      if (trigger.current?.offsetParent === null) return;
      event.preventDefault();
      open();
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [open]);
  useEffect(() => {
    const q = text.trim();
    setFailed(false);
    if (!q) return setResult(null);
    const controller = new AbortController();
    // Waits for a pause in typing, and a newer search replaces this one.
    const wait = setTimeout(async () => {
      const found = await browserRead<HubSearchResult>(
        `/api/v1/hubs/${encodeURIComponent(hubId)}/search?${new URLSearchParams({ q })}`,
        controller.signal,
      ).catch(() => null);
      if (controller.signal.aborted) return;
      if (found?.ok) setResult(found.data);
      // Punctuation alone is not a search.
      else if (found?.status === 400) setResult(null);
      else setFailed(true);
    }, 200);
    return () => {
      clearTimeout(wait);
      controller.abort();
    };
  }, [text, hubId]);
  const click = (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open();
  };
  // Arrow keys walk from the field through the results.
  const walk = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const stops = [...event.currentTarget.querySelectorAll<HTMLElement>("input, a")];
    const next =
      stops.indexOf(document.activeElement as HTMLElement) + (event.key === "ArrowDown" ? 1 : -1);
    event.preventDefault();
    stops[Math.max(0, Math.min(next, stops.length - 1))]?.focus();
  };
  return (
    <>
      <a
        ref={trigger}
        className="hub-search-button"
        href={page}
        aria-haspopup="dialog"
        onClick={click}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4-4" />
        </svg>
        Search this hub
        <kbd>Ctrl K</kbd>
      </a>
      <dialog
        ref={dialog}
        className="hub-search-dialog"
        aria-label="Search this hub"
        onKeyDown={walk}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        onClose={() => trigger.current?.focus()}
      >
        <search>
          <form action={page} onSubmit={(event) => event.preventDefault()}>
            <input
              type="search"
              name="q"
              aria-label="Search this hub"
              placeholder="Search this hub"
              autoComplete="off"
              maxLength={maxSearchLength}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </form>
        </search>
        <div aria-live="polite">
          {failed ? (
            <p className="hub-search-status">Search isn't available right now. Try again.</p>
          ) : (
            result && <HubSearchResults result={result} />
          )}
        </div>
      </dialog>
    </>
  );
}
