import type { HubSearchResult } from "@ntumie/types";
import { maxSearchLength } from "@ntumie/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Feedback } from "../../../../components/feedback";
import { HubSearchResults } from "../../../../components/hub-search-results";
import { queryValue } from "../../../../lib/http";
import { readShared } from "../../../../lib/server-api";
import { isUuid } from "../../../../lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search this hub", robots: { index: false } };

// The hub search without JavaScript; the reader's dialog shows the same results.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const q = (queryValue((await searchParams).q) ?? "").trim();
  const result = q
    ? await readShared<HubSearchResult>(
        `/api/v1/hubs/${id}/search?${new URLSearchParams({ q: q.slice(0, maxSearchLength) })}`,
      )
    : null;
  const failure = result && !result.ok && result.status !== 400 ? result : null;
  if (failure) return <Feedback hub error={failure} />;
  return (
    <main className="hub-search-page">
      <h1>Search this hub</h1>
      <search>
        <form action={`/h/${id}/search`}>
          <input
            type="search"
            name="q"
            aria-label="Search this hub"
            defaultValue={q}
            maxLength={maxSearchLength}
          />
          <button type="submit" className="button">
            Search
          </button>
        </form>
      </search>
      {result?.ok && <HubSearchResults result={result.data} />}
    </main>
  );
}
