"use client";
import { useEffect, useState } from "react";

// Copies an address. Without JavaScript (or a clipboard) the address itself is
// the link, so it can still be copied by hand.
export function CopyLink({ href, label = "Copy link" }: { href: string; label?: string }) {
  const [enhanced, setEnhanced] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => setEnhanced(true), []);
  if (!enhanced)
    return (
      <a className="button" href={href}>
        Open link
      </a>
    );
  return (
    <span className="copy-link">
      <button
        type="button"
        className="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(href);
            setStatus("Link copied.");
          } catch {
            setStatus(`Copy this address: ${href}`);
          }
        }}
      >
        {label}
      </button>
      <span className="sr-only" role="status">
        {status}
      </span>
    </span>
  );
}
