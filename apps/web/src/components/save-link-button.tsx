"use client";
import { usePathname } from "next/navigation";
import { isUuid } from "../lib/validation";

// The header's Save a link: on a collection, that collection is preselected.
export function SaveLinkButton() {
  const id = /^\/c\/([^/]+)/.exec(usePathname() ?? "")?.[1];
  return (
    <a
      className="button primary nav-button nav-save"
      href={isUuid(id) ? `/capture?${new URLSearchParams({ collection: id })}` : "/capture"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="nav-save-label">Save a link</span>
    </a>
  );
}
