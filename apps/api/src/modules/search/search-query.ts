import { maxSearchLength } from "@ntumie/types";

// What a search box's text means to the index: up to eight words of letters
// and digits, lower case, each matched as a word prefix ("compo" finds
// "compost"). Anything else (punctuation, operators) is a separator, so no
// text can reach the query parser as syntax.
export interface ParsedSearch {
  /** The words, joined by spaces (for trigram similarity and display). */
  text: string;
  /** A to_tsquery expression: every word as a prefix, all required. */
  tsquery: string;
  /** LIKE patterns for tag-name prefixes. */
  tagPatterns: string[];
}

export function parseSearch(input: string | undefined): ParsedSearch | null {
  const words = (input ?? "")
    .slice(0, maxSearchLength)
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  if (!words.length) return null;
  return {
    text: words.join(" "),
    tsquery: words.map((word) => `${word}:*`).join(" & "),
    tagPatterns: words.map((word) => `${word}%`),
  };
}
