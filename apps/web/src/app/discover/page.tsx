import type { Collection } from "@ntumie/types";
import type { Metadata } from "next";
import { Feedback } from "../../components/feedback";
import { PaginatedList } from "../../components/paginated-list";
import { queryValue, withCursor } from "../../lib/http";
import { serverRead } from "../../lib/server-api";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";
async function Discover({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cursor = queryValue((await searchParams).cursor);
  const result = await serverRead<Collection[]>(withCursor("/api/v1/discover", cursor));
  if (!result.ok) return <Feedback error={result} resetPath="/discover" />;
  return (
    <div className="band-page" data-reader>
      <section className="brand-band page-band" aria-labelledby="discover-title">
        <h1 id="discover-title">Discover</h1>
        <p className="band-lead">
          Guides people put together around one idea, and the hubs that make them.
        </p>
      </section>
      <section className="band-body" aria-labelledby="newest-title">
        <div className="band-section-head">
          <h2 id="newest-title">Newest collections</h2>
        </div>
        <PaginatedList
          kind="collections"
          layout="cards"
          path="/api/v1/discover"
          initial={result.data}
          nextCursor={result.meta?.nextCursor}
        />
      </section>
    </div>
  );
}
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return Discover(props);
}
