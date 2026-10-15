"use client";

import { usePathname } from "next/navigation";

// Header destinations; the current one is marked for screen readers and
// underlined, as in the redesign's header.
const links = [
  { href: "/discover", label: "Discover" },
  { href: "/about", label: "About" },
];

export function PrimaryLinks() {
  const pathname = usePathname();
  return links.map(({ href, label }) => (
    <a key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
      {label}
    </a>
  ));
}
