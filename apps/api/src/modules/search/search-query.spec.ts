import { describe, expect, it } from "bun:test";
import { parseSearch } from "./search-query";

describe("parseSearch", () => {
  it("reads words as required prefixes and drops everything else", () => {
    expect(parseSearch("  Compost & soil!")).toEqual({
      text: "compost soil",
      tsquery: "compost:* & soil:*",
      tagPatterns: ["compost%", "soil%"],
    });
  });
  it("keeps letters from any language and refuses empty searches", () => {
    expect(parseSearch("Bustani ya mboga")?.tsquery).toBe("bustani:* & ya:* & mboga:*");
    expect(parseSearch("  !!! ")).toBeNull();
    expect(parseSearch(undefined)).toBeNull();
  });
  it("cannot pass query syntax through", () => {
    expect(parseSearch("a:* | !b <-> (c)")?.tsquery).toBe("a:* & b:* & c:*");
    expect(parseSearch("50%_off")?.tagPatterns).toEqual(["50%", "off%"]);
  });
  it("bounds the input", () => {
    const parsed = parseSearch("x".repeat(500));
    expect(parsed?.text.length).toBe(100);
    expect(
      parseSearch(Array.from({ length: 20 }, (_, i) => `w${i}`).join(" "))?.tagPatterns,
    ).toHaveLength(8);
  });
});
