import type { PrivateAllowance } from "@ntumie/types";
import { serverRead } from "../lib/server-api";
import { FakeDoor } from "./fake-door";

// The free private-collection allowance, from the API (it enforces the limit;
// these screens only say how much is left). Null when it can't be read: the
// choice then shows without a count and the API still decides.
export async function readPrivateAllowance(): Promise<PrivateAllowance | null> {
  const result = await serverRead<PrivateAllowance>("/api/v1/collections/private-allowance");
  return result.ok ? result.data : null;
}

export const privateLeft = (allowance: PrivateAllowance | null) =>
  allowance ? Math.max(0, allowance.limit - allowance.used) : null;

// The Private choice's second line, in the boards' words.
export function privateAllowanceText(allowance: PrivateAllowance | null, signedIn: boolean) {
  if (!allowance) return "Only you.";
  const plural = allowance.limit === 1 ? "" : "s";
  if (!signedIn)
    return `Only you. Free accounts include ${allowance.limit} private collection${plural}.`;
  const left = privateLeft(allowance) ?? 0;
  return left
    ? `Only you. ${left} of ${allowance.limit} free private collection${plural} left.`
    : `Only you. You have used your ${allowance.limit} free private collection${plural}.`;
}

// At the limit: the deliberate ways on (never an automatic publish). Rendered
// outside other forms, since the request for more is its own form.
export function PrivateLimitHelp({ returnTo }: { returnTo: string }) {
  return (
    <div className="private-limit" role="note">
      <p>
        To keep a new collection private, make one of your private collections public from{" "}
        <a href="/manage/collections">your collections</a>, or ask for more.
      </p>
      <FakeDoor feature="private_collections" returnTo={returnTo} className="button">
        More private collections
      </FakeDoor>
    </div>
  );
}
