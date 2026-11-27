import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SaveLinkForm } from "../../components/save-link-form";
import { queryValue } from "../../lib/http";
import { readSession } from "../../lib/session";
export const metadata: Metadata = { title: "Save a link" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  // Signed out, the first link starts a collection.
  if (!(await readSession())) {
    const title = queryValue(query.title, 255);
    redirect(title ? `/start?${new URLSearchParams({ title })}` : "/start");
  }
  return <SaveLinkForm query={query} />;
}
