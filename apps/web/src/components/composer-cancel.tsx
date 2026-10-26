"use client";
import { useEffect, useState } from "react";

// Closes the comment box in place and keeps the draft (as reopening shows).
// Without JavaScript it is a link back to the discussion.
export function ComposerCancel({ href }: { href: string }) {
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  if (!enhanced)
    return (
      <a className="button text-button" href={href}>
        Cancel
      </a>
    );
  return (
    <button
      type="button"
      className="button text-button"
      onClick={(event) => {
        const box = event.currentTarget.closest("details");
        if (!box) return;
        box.open = false;
        box.querySelector("summary")?.focus();
      }}
    >
      Cancel
    </button>
  );
}
