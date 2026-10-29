import { describe, expect, it } from "bun:test";
import { eventNames, safeProperties } from "./privacy";

// Worker alerts must pass the event allow-list, or a Redis outage would end
// the worker with nothing logged (ADR-0071).
describe("worker events", () => {
  it("allows the outage, stuck-row and lookup failure events", () => {
    for (const event of [
      "email.redis_unavailable",
      "link_metadata.redis_unavailable",
      "email.outbox_stuck",
      "link_metadata.stuck",
      "email.relay_failed",
      "link_metadata.relay_failed",
      "link_metadata.failed",
    ])
      expect(eventNames.has(event)).toBe(true);
  });
  it("keeps row counts only as non-negative integers", () => {
    expect(safeProperties({ "rows.count": 3 })).toEqual({ "rows.count": 3 });
    expect(safeProperties({ "rows.count": -1 })).toEqual({});
    expect(safeProperties({ "rows.count": 1.5 })).toEqual({});
    expect(safeProperties({ "rows.count": "3" })).toEqual({});
  });
});
