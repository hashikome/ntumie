import type { CollectionOutline } from "@ntumie/types";
import { ReaderTree } from "./reader-tree";

// Phones: the reader's header gains a menu holding Discover, About and the
// hub's collections (the desktop sidebar). A native disclosure, so it works
// without JavaScript; CSS places its button at the start of the header.
export function ReaderMenu({ outline, token }: { outline: CollectionOutline; token?: string }) {
  return (
    <details className="reader-menu">
      <summary aria-label="Menu: Discover, About, collections in this hub">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </summary>
      <nav className="reader-menu-panel" aria-label="Reader menu">
        <a className="tree-row" href="/discover">
          Discover
        </a>
        <a className="tree-row" href="/about">
          About
        </a>
        <ReaderTree outline={outline} token={token} />
      </nav>
    </details>
  );
}
