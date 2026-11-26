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

export function privateFreeProperties(properties: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== "string") clean[key] = value;
    else if (key === "$elements_chain") clean[key] = elementsChain(value);
    else if (/url|referrer|href|pathname/i.test(key)) clean[key] = analyticsAddress(value);
    else clean[key] = value;
  }
  return clean;
}
