import { redirect } from "next/navigation";
import { SaveLinkForm } from "../../../components/save-link-form";
import { readSession } from "../../../lib/session";

export const dynamic = "force-dynamic";
// Save a link opened from a page: the same form as /capture, as a dialog over
// that page. Signed out (a session that ended since the page was drawn), it
// goes to Start as /capture does.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await readSession())) redirect("/start");
  return <SaveLinkForm query={await searchParams} dialog />;
}
