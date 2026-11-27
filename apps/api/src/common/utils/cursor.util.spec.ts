import { describe, expect, it } from "bun:test";
import { encodeCursor, readTimeIdCursor, timeIdCursor } from "./cursor.util";

describe("time-and-id cursors", () => {
  const row = {
    createdAt: new Date("2026-11-27T10:00:00.123Z"),
    id: "01937a4e-0000-7000-8000-000000000001",
  };

  it("round-trips a row's time and id, with any extra fields", () => {
    expect(readTimeIdCursor(timeIdCursor(row))).toEqual({ createdAt: row.createdAt, id: row.id });
    expect(readTimeIdCursor<{ p: string }>(timeIdCursor(row, { p: "parent" }))).toEqual({
      p: "parent",
      createdAt: row.createdAt,
      id: row.id,
    });
  });

  it("refuses a cursor without a real time or a uuid id", () => {
    for (const bad of [
      "not-base64-json",
      encodeCursor({ t: "yesterday", i: row.id }),
      encodeCursor({ t: row.createdAt.toISOString(), i: "1; DROP TABLE" }),
      encodeCursor({ i: row.id }),
    ])
      expect(readTimeIdCursor(bad)).toBeNull();
  });
});
