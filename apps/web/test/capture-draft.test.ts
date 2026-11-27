import { describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { openDraft, sealDraft } from "../src/lib/capture-draft";
import { captureUrl, parseTags } from "../src/lib/validation";

const secret = "synthetic-capture-cookie-secret-32-chars";
describe("private capture drafts", () => {
  it("seals a maximum-length URL, keeps it out of the ciphertext and binds it to its draft", () => {
    const id = randomUUID(),
      issued = Date.now();
    const draft = {
      id,
      operationId: randomUUID(),
      links: [{ url: `https://fixture-links.dev/${"a".repeat(2022)}` }],
      issued,
      destination: "first",
    };
    const sealed = sealDraft(draft, secret);
    expect(sealed).not.toContain("fixture-links.dev");
    expect(openDraft(sealed, id, secret)).toEqual(draft);
    expect(openDraft(sealed, randomUUID(), secret)).toBeNull();
    expect(openDraft(sealed, id, "wrong-secret")).toBeNull();
    expect(openDraft(`${sealed.slice(0, -3)}abc`, id, secret)).toBeNull();
    expect(openDraft(sealed, id, secret, issued + 1800000)).toBeNull();
    expect(openDraft(sealed, id, secret, issued - 1)).toBeNull();
  });
  it("keeps every tag of a large draft: the browser holds only a reference", () => {
    const id = randomUUID();
    const draft = {
      id,
      operationId: randomUUID(),
      links: Array.from({ length: 2 }, (_, n) => ({
        url: `https://fixture-links.dev/${n}/${"a".repeat(600)}`,
        tags: Array.from({ length: 30 }, (_, t) => `tag-${t}-${"b".repeat(30)}`),
      })),
      collectionTitle: "Reading list",
      issued: Date.now(),
      destination: "new",
    };
    const opened = openDraft(sealDraft(draft, secret), id, secret);
    expect(opened?.links).toEqual(draft.links);
    expect(opened?.collectionTitle).toBe("Reading list");
    expect(parseTags(" video, , Beginner ,")).toEqual(["video", "Beginner"]);
  });
  it("rejects executable schemes, credentials, controls and encoded overlong URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "ftp://fixture-links.dev",
      "https://user:pass@example.com",
      "https://fixture-links.dev/\nfoo",
      `https://fixture-links.dev/${"é".repeat(500)}`,
    ])
      expect(captureUrl(url)).toBeNull();
    expect(captureUrl("https://fixture-links.dev/reading")).toBe(
      "https://fixture-links.dev/reading",
    );
  });
});
