import { SaveLinkForm } from "../../../components/save-link-form";
import { readSession } from "../../../lib/session";

export const dynamic = "force-dynamic";
// Save a link opened from a page: the same form as /capture, as a dialog over
// that page. Signed out, /capture itself sends the person to Start.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await readSession())) return null;
  return <SaveLinkForm query={await searchParams} dialog />;
}
