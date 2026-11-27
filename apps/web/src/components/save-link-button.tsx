"use client";
import { usePathname } from "next/navigation";
import { isUuid } from "../lib/validation";
import { PlusIcon } from "./icons";

// The header's Save a link: on a collection, that collection is preselected.
export function SaveLinkButton() {
  const id = /^\/c\/([^/]+)/.exec(usePathname() ?? "")?.[1];
  return (
    <a
      className="button primary nav-button nav-save"
      href={isUuid(id) ? `/capture?${new URLSearchParams({ collection: id })}` : "/capture"}
    >
      <PlusIcon />
      <span className="nav-save-label">Save a link</span>
    </a>
  );
}
