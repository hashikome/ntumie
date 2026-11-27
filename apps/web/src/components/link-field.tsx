"use client";
import type { LinkPreview } from "@ntumie/types";
import { useEffect, useRef, useState } from "react";
import { browserRead } from "../lib/browser-api";
import { captureUrl, publicHref } from "../lib/validation";

// A link to save: the address, and under it the page title and site as soon
// as they are found (never typed). Without JavaScript it is a plain URL field.
export function LinkField({
  id,
  label,
  initial,
  origin,
}: {
  id: string;
  label: string;
  initial?: string;
  origin: string;
}) {
  const [url, setUrl] = useState(initial ?? "");
  const [left, setLeft] = useState(Boolean(initial));
  const [preview, setPreview] = useState<{
    for: string;
    title: string | null;
    status: string;
    collection?: boolean;
  }>();
  const field = useRef<HTMLInputElement>(null);
  // An address typed before the page was ready is adopted, not reset.
  useEffect(() => {
    if (field.current?.value) setUrl(field.current.value);
  }, []);
  const href = publicHref(url.trim(), origin);
  useEffect(() => {
    if (!href) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      browserRead<LinkPreview>(
        `/api/v1/link-preview?${new URLSearchParams({ url: href })}`,
        controller.signal,
      )
        .catch(() => null)
        .then((result) => {
          if (controller.signal.aborted) return;
          setPreview({
            for: href,
            title: result?.ok ? result.data.title : null,
            status: result?.ok ? result.data.status : "untitled",
            collection: result?.ok && result.data.collectionHint,
          });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [href]);
  const trimmed = url.trim();
  const message = !trimmed
    ? ""
    : !captureUrl(trimmed)
      ? left
        ? "Enter the full address, starting with https:// or http://."
        : ""
      : !href
        ? left
          ? "This address only works on your own computer or network, or is an example. Use a public web address."
          : ""
        : preview?.for === href && preview.status === "no_domain"
          ? "This address doesn't exist. Check it for typos."
          : "";
  useEffect(() => {
    field.current?.setCustomValidity(message);
  }, [message]);
  const site = href ? new URL(href).hostname.replace(/^www\./, "") : "";
  const shown = preview?.for === href ? preview : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        ref={field}
        id={id}
        name="url"
        type="url"
        inputMode="url"
        autoComplete="url"
        required
        maxLength={2048}
        placeholder="https://"
        defaultValue={initial}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? `${id}-error` : shown ? `${id}-preview` : undefined}
        onChange={(event) => setUrl(event.target.value)}
        onBlur={() => setLeft(true)}
      />
      {message ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {message}
        </p>
      ) : (
        href && (
          <div className="link-preview" id={`${id}-preview`} aria-live="polite">
            <span className="link-preview-mark" aria-hidden="true">
              {(shown?.title ?? site).charAt(0).toUpperCase()}
            </span>
            <span>
              <b>{shown ? (shown.title ?? site) : "Finding the title…"}</b>
              {shown?.collection ? (
                <span>Collection</span>
              ) : (
                (!shown || shown.title) && <span>{site}</span>
              )}
            </span>
          </div>
        )
      )}
    </div>
  );
}
