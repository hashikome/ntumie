"use client";
import { useEffect } from "react";

// Ctrl K / Cmd K reaches the hub search (on the way: it is a fake door).
export function HubSearchShortcut() {
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey)) return;
      const button = document.querySelector<HTMLButtonElement>("button.hub-search-button");
      if (!button || button.offsetParent === null) return;
      event.preventDefault();
      button.focus();
      button.click();
    };
    document.addEventListener("keydown", open);
    return () => document.removeEventListener("keydown", open);
  }, []);
  return null;
}
