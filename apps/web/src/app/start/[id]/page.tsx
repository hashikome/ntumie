import type { Metadata } from "next";
import { StartCollection } from "../../../components/start-collection";
import { readDraft } from "../../../lib/capture-server";

export const metadata: Metadata = { title: "Start a collection" };
export const dynamic = "force-dynamic";
// A waiting collection, reopened from its summary's Edit or after a problem.
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
      <section className="auth-column">
        <h1>This collection wasn't saved</h1>
        <p className="auth-lead">
          A collection waits 30 minutes for you to confirm your email. Start it again to continue.
        </p>
        <a className="button primary auth-submit" href="/start">
          Start a collection
        </a>
      </section>
    );
  return <StartCollection draft={draft} query={await searchParams} />;
}
