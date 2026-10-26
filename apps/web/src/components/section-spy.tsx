"use client";
import { useEffect } from "react";

// Follows the section being read: marks its links in the hub tree and the
// phone chips, and points the discussion's "About" at it until the reader
// chooses something else. Sections load with pagination, so new ones are
// picked up as they appear.
export function SectionSpy() {
  useEffect(() => {
    let current: string | null = null;
    const mark = (id: string | null) => {
      if (id === current) return;
      current = id;
      for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-section-link]")) {
        if (link.dataset.sectionLink === id) {
          link.setAttribute("aria-current", "location");
          if (link.closest(".section-chips"))
            link.scrollIntoView({ block: "nearest", inline: "nearest" });
        } else link.removeAttribute("aria-current");
      }
      for (const select of document.querySelectorAll<HTMLSelectElement>(
        "select[data-follows-section]",
      )) {
        if (select.dataset.touched || !id) continue;
        if ([...select.options].some((option) => option.value === id)) select.value = id;
      }
    };
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.readerSection;
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        // The topmost section in the reading band wins.
        const first = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        if (first) mark(first[0]);
      },
      { rootMargin: "-15% 0px -60% 0px" },
    );
    const watch = () => {
      for (const section of document.querySelectorAll<HTMLElement>("[data-reader-section]"))
        observer.observe(section);
    };
    watch();
    const added = new MutationObserver(watch);
    const list = document.querySelector(".reader-content");
    if (list) added.observe(list, { childList: true, subtree: true });
    const touched = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.dataset.followsSection !== undefined)
        target.dataset.touched = "true";
    };
    document.addEventListener("change", touched);
    return () => {
      observer.disconnect();
      added.disconnect();
      document.removeEventListener("change", touched);
    };
  }, []);
  return null;
}
