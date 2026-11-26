import { expect, test } from "bun:test";
import {
  analyticsAddress,
  privateFreeEvent,
  privateFreeProperties,
} from "../src/lib/analytics-privacy";

test("an address keeps its path and view, never what someone typed or holds", () => {
  expect(analyticsAddress("https://ntumie.link/c/abc?s=share-token")).toBe(
    "https://ntumie.link/c/abc",
  );
  expect(analyticsAddress("https://ntumie.link/invitations/accept#token=one-time")).toBe(
    "https://ntumie.link/invitations/accept",
  );
  expect(analyticsAddress("https://ntumie.link/discover?q=private+words&tag=soil&tab=hubs")).toBe(
    "https://ntumie.link/discover?tag=soil&tab=hubs",
  );
  expect(analyticsAddress("/capture?title=My+link")).toBe("/capture");
  expect(analyticsAddress("$pageview")).toBe("$pageview");
});

test("every address in an event is cleaned, including clicked links", () => {
  const clean = privateFreeProperties({
    $current_url: "https://ntumie.link/c/abc?s=share-token",
    $referrer: "https://ntumie.link/discover?q=secret",
    $initial_referrer: "https://ntumie.link/invitations/accept#token=one-time",
    $elements_chain: 'a:attr__href="/c/abc?s=share-token"nth-child="1"',
    feature: "subscriptions",
    count: 2,
  });
  expect(JSON.stringify(clean)).not.toMatch(/share-token|secret|one-time/);
  expect(clean.$elements_chain).toBe('a:attr__href="/c/abc"nth-child="1"');
  expect(clean.feature).toBe("subscriptions");
  expect(clean.count).toBe(2);
});

test("person updates and nested first-visit details are cleaned too", () => {
  const clean = privateFreeEvent({
    event: "$pageview",
    properties: { $current_url: "https://ntumie.link/c/abc?s=share-token" },
    $set: { $current_url: "https://ntumie.link/discover?q=secret" },
    $set_once: {
      $initial_current_url: "https://ntumie.link/invitations/accept#token=one-time",
      $initial_person_info: { u: "https://ntumie.link/c/abc?s=share-token", r: "$direct" },
    },
  });
  expect(JSON.stringify(clean)).not.toMatch(/share-token|secret|one-time/);
  expect(clean.$set_once).toEqual({
    $initial_current_url: "https://ntumie.link/invitations/accept",
    $initial_person_info: { u: "https://ntumie.link/c/abc", r: "$direct" },
  });
  expect(clean.event).toBe("$pageview");
});
