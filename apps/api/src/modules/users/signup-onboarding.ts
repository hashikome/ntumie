import type { Prisma } from "../../generated/prisma/client";
import { accountUsername } from "./account-onboarding";

// App-owned identity/onboarding policy, shared by every credential provider.
// Call both phases inside the account-creation transaction after consent/proof.
// No hub is created here: a hub comes with the first collection (ADR-0069).
export async function prepareSignup(tx: Prisma.TransactionClient, name: string) {
  // Skip retired hub handles, so the hub that comes with the first collection
  // can take the same handle as the username.
  return {
    username: await accountUsername(
      tx,
      name,
      async (candidate) =>
        !(await tx.hubHandleReservation.findUnique({ where: { handle: candidate } })),
    ),
  };
}

// The after-creation phase. Nothing app-owned is needed yet; it stays so every
// provider keeps one place to add onboarding steps.
export async function completeSignup(_tx: Prisma.TransactionClient, _userId: string) {}
