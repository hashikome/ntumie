import type { Metadata } from "next";
import { SaveLinkForm } from "../../../components/save-link-form";
import { readDraft } from "../../../lib/capture-server";
export const metadata: Metadata = { title: "Save a link" };
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const draft = await readDraft((await params).id);
  if (!draft)
    return (
      <section className="reader account-flow">
        <h1>This draft has expired</h1>
        <p>Draft links are kept for 30 minutes. Paste your link again to continue.</p>
        <a className="button primary" href="/capture">
          Save a link
        </a>
      </section>
    );
  return <SaveLinkForm draft={draft} query={await searchParams} />;
}
