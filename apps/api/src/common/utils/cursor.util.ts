// Opaque keyset-pagination cursors: base64url-encoded JSON. Clients must
// treat cursors as opaque tokens; the payload shape is a server detail.

export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T;
    }
    return null;
  } catch {
    return null;
  }
}

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** A cursor after a row ordered by creation time, then id (newest first or last). */
export function timeIdCursor(
  row: { createdAt: Date; id: string },
  extra: Record<string, unknown> = {},
) {
  return encodeCursor({ ...extra, t: row.createdAt.toISOString(), i: row.id });
}

/** The time and id a `timeIdCursor` holds, or null when it is malformed. */
export function readTimeIdCursor<T extends Record<string, unknown> = Record<string, unknown>>(
  cursor: string,
): ({ createdAt: Date; id: string } & Partial<T>) | null {
  const payload = decodeCursor<{ t: unknown; i: unknown } & Partial<T>>(cursor);
  if (!payload || typeof payload.t !== "string" || typeof payload.i !== "string") return null;
  const createdAt = new Date(payload.t);
  if (Number.isNaN(createdAt.getTime()) || !uuid.test(payload.i)) return null;
  const { t: _t, i: _i, ...extra } = payload;
  return { ...(extra as unknown as Partial<T>), createdAt, id: payload.i };
}
