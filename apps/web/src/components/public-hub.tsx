import type { HubContributor, HubPage } from "@ntumie/types";
import { serverRead } from "../lib/server-api";
import { Avatar } from "./avatar";
import { FakeDoor } from "./fake-door";
import { FormNotice } from "./form-notice";
import { HubMark } from "./hub-mark";
import { PaginatedList } from "./paginated-list";
import { ShareAction } from "./share-action";

export async function PublicHub({
  data,
  nextCursor,
  preview = false,
  returnTo,
  tab,
  notice,
}: {
  data: HubPage;
  nextCursor?: string | null;
  preview?: boolean;
  returnTo?: string;
  tab?: string;
  notice?: string;
}) {
  const { hub, collections } = data;
  const here = withTab(returnTo ?? `/h/${hub.id}${preview ? "?view=public" : ""}`);
  const current = ["contributors", "communities", "partners"].includes(tab ?? "")
    ? (tab as string)
    : "collections";
  // The list is read only on its own tab; the count comes with the hub.
  const contributors =
    current === "contributors"
      ? await serverRead<HubContributor[]>(
          `/api/v1/hubs/${encodeURIComponent(hub.id)}/contributors`,
        )
      : null;
  return (
    <div className="band-page public-hub" data-reader>
      <FormNotice code={notice} />
      <HubBand
        hub={hub}
        stats={hub.collectionSaves > 0 ? hub.collectionSaves : undefined}
        actions={
          <>
            <FakeDoor feature="subscriptions" returnTo={here} className="button band-solid">
              Subscribe
            </FakeDoor>
            <FakeDoor feature="communities" returnTo={here} className="button band-ghost">
              Join a community
            </FakeDoor>
            <ShareAction
              target={{ kind: "hub", id: hub.id }}
              returnTo={here}
              className="button band-ghost share-compact"
              icon
            />
          </>
        }
      />
      <div className="band-body">
        <nav className="page-tabs" aria-label="Hub">
          <a href={withTab(here)} aria-current={current === "collections" ? "page" : undefined}>
            Collections <span>{hub.publishedCollectionCount}</span>
          </a>
          <FakeDoor
            feature="communities"
            returnTo={withTab(here, "communities")}
            notice={false}
            className="tab-button"
            current={current === "communities"}
          >
            Communities
          </FakeDoor>
          <a
            href={withTab(here, "contributors")}
            aria-current={current === "contributors" ? "page" : undefined}
          >
            Contributors <span>{hub.contributorCount}</span>
          </a>
          <FakeDoor
            feature="partners"
            returnTo={withTab(here, "partners")}
            notice={false}
            className="tab-button"
            current={current === "partners"}
          >
            Partners
          </FakeDoor>
        </nav>
        {current === "contributors" ? (
          contributors?.ok ? (
            <HubContributors people={contributors.data} />
          ) : (
            <p className="empty" role="status">
              Contributors couldn't load. <a href={withTab(here, "contributors")}>Try again</a>.
            </p>
          )
        ) : current === "communities" ? (
          <ComingSoon title="Communities are on the way">
            Communities this hub runs will be listed here: people who join read the collections
            published for them. Thanks for looking; it tells us people want this.
          </ComingSoon>
        ) : current === "partners" ? (
          <ComingSoon title="Partner hubs are on the way">
            Hubs this one makes collections with will be listed here, credited both ways. Thanks for
            looking; it tells us people want this.
          </ComingSoon>
        ) : (
          <PaginatedList
            kind="collections"
            layout="cards"
            showHub={false}
            path={`/api/v1/hubs/${encodeURIComponent(hub.id)}`}
            initial={collections}
            nextCursor={nextCursor}
            publicHub={{ handle: hub.handle, preview }}
          />
        )}
      </div>
    </div>
  );
}

// The same address with (or without) a tab, keeping its other parameters.
export function withTab(path: string, tab?: string) {
  const url = new URL(path, "http://local.invalid");
  // A list position, a shown notice or a share visit doesn't carry over.
  for (const key of ["cursor", "notice", "via"]) url.searchParams.delete(key);
  if (tab) url.searchParams.set("tab", tab);
  else url.searchParams.delete("tab");
  return url.pathname + url.search;
}

// A tab whose feature is on the way: what it will hold, in its place.
export function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="coming-soon" aria-labelledby="coming-soon-title">
      <h2 id="coming-soon-title">{title}</h2>
      <p>{children}</p>
    </section>
  );
}

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

function contribution(person: HubContributor) {
  const where = person.collectionTitle
    ? ` ${person.kind === "links" || person.kind === "sections" ? "to" : "in"} ${person.collectionTitle}`
    : person.collections > 1
      ? ` across ${person.collections} collections`
      : "";
  if (person.kind === "created") return `Created ${plural(person.count, "collection")}`;
  if (person.kind === "links") return `Added ${plural(person.count, "link")}${where}`;
  if (person.kind === "sections") return `Added ${plural(person.count, "section")}${where}`;
  return `Edited${where}`;
}

// Everyone who changed the hub's collections, with what they did.
function HubContributors({ people }: { people: HubContributor[] }) {
  if (!people.length) return <p className="empty">No contributions to show yet.</p>;
  return (
    <ul className="people-rows">
      {people.map((person) => (
        <li key={person.person.userId}>
          <Avatar userId={person.person.userId} />
          <div>
            <a href={`/${encodeURIComponent(person.person.username)}`}>
              {person.person.name ?? person.person.username}
            </a>
            <span>
              {person.person.username}
              {person.owner ? " · Owner" : ""} · {contribution(person)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// The hub's band: mark, name, "@handle by Owner", description and actions.
export function HubBand({
  hub,
  actions,
  stats,
}: {
  hub: {
    id: string;
    name: string;
    handle: string | null;
    description: string | null;
    owner: { username: string } | null;
    ownerName: string | null;
  };
  actions: React.ReactNode;
  /** Saves across its published collections, when there are any. */
  stats?: number;
}) {
  const ownerName = hub.ownerName?.trim();
  return (
    <section className="brand-band page-band hub-band" aria-labelledby="hub-title">
      <div className="band-identity">
        <HubMark hubId={hub.id} size={64} />
        <div>
          <h1 id="hub-title">{hub.name}</h1>
          {/* The handle is the hub's; "by Name" only when the owner shows it. */}
          <p className="band-handle">
            {hub.handle && <span className="person-handle">@{hub.handle}</span>}
            {ownerName && hub.owner && (
              <>
                {" by "}
                <a className="person-name" href={`/${encodeURIComponent(hub.owner.username)}`}>
                  {ownerName}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
      {hub.description && <p className="band-lead">{hub.description}</p>}
      {stats !== undefined && (
        <p className="band-stats">
          <b>{stats.toLocaleString("en")}</b> collection {stats === 1 ? "save" : "saves"}
        </p>
      )}
      <div className="band-actions">{actions}</div>
    </section>
  );
}
