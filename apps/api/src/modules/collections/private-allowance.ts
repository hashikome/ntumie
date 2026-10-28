import type { PrivateAllowance } from "@ntumie/types";
import { appError } from "../../common/errors/app-exception";
import type { Prisma } from "../../generated/prisma/client";

// Free accounts keep a limited number of owner-only private collections
// (ADR-0028, PRODUCT.md §6.13). Paid allowances replace this number later.
export function privateCollectionLimit() {
  const configured = Number(process.env.FREE_PRIVATE_COLLECTIONS);
  return Number.isInteger(configured) && configured >= 0 ? configured : 3;
}

type Db = Pick<Prisma.TransactionClient, "collection" | "$queryRaw">;

export async function privateAllowance(db: Db, hubId: string | null): Promise<PrivateAllowance> {
  const limit = privateCollectionLimit();
  if (!hubId) return { limit, used: 0 };
  return { limit, used: await db.collection.count({ where: { hubId, published: false } }) };
}

// Call inside the transaction that makes a collection private in this hub.
// The hub row lock serialises concurrent private creations and changes, so
// the allowance is never oversubscribed. Existing private collections over
// the limit are kept; only adding one is refused.
export async function requirePrivateRoom(tx: Db, hubId: string) {
  await tx.$queryRaw`SELECT id FROM hubs WHERE id = ${hubId}::uuid FOR UPDATE`;
  const { limit, used } = await privateAllowance(tx, hubId);
  if (used >= limit) throw appError("private_allowance_reached");
}
