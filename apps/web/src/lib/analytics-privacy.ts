// Addresses carry private things: a share link's token (`?s=`), an invitation's
// one-time token (`#token=`), what someone searched (`?q=`), a link's title
// (`/capture?title=`). Analytics keeps an address's path and only parameters
// that say which view it was, never what someone typed or holds.
const kept = new Set(["tab", "tag"]);

export function analyticsAddress(value: string): string {
  const absolute = /^https?:\/\//.test(value);
  if (!absolute && !value.startsWith("/")) return value;
  let url: URL;
  try {
    url = new URL(value, "https://ntumie.invalid");
  } catch {
    return "";
  }
  const query = new URLSearchParams();
  for (const [key, item] of url.searchParams) if (kept.has(key)) query.set(key, item);
  const search = query.size ? `?${query}` : "";
  return absolute ? `${url.origin}${url.pathname}${search}` : `${url.pathname}${search}`;
}

// Autocapture lists clicked elements with their attributes; a link's href is an address too.
function elementsChain(chain: string): string {
  return chain.replace(
    /(attr__href=")([^"]*)(")/g,
    (_, start, href, end) => `${start}${analyticsAddress(href)}${end}`,
  );
}

// Addresses sit under many keys, some nested: `$initial_person_info` keeps the
// first page as `u` and its referrer as `r`.
const addressKey = /url|referrer|href|pathname|^u$|^r$/i;

function scrub(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    if (key === "$elements_chain") return elementsChain(value);
    return addressKey.test(key) ? analyticsAddress(value) : value;
  }
  if (Array.isArray(value)) return value.map((item) => scrub(item, key));
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, item]) => [k, scrub(item, k)]));
  return value;
}

export function privateFreeProperties(properties: Record<string, unknown>) {
  return scrub(properties) as Record<string, unknown>;
}

/** The parts of an event that can hold an address: its properties and person updates. */
export function privateFreeEvent<
  T extends { properties?: Record<string, unknown>; $set?: unknown; $set_once?: unknown },
>(event: T): T {
  return {
    ...event,
    properties: privateFreeProperties(event.properties ?? {}),
    ...(event.$set === undefined ? {} : { $set: scrub(event.$set) }),
    ...(event.$set_once === undefined ? {} : { $set_once: scrub(event.$set_once) }),
  };
}
