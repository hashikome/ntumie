import type { Collection } from "@ntumie/types";
import type { Metadata } from "next";
import { FormNotice } from "../components/form-notice";
import { RouteArt } from "../components/route-art";
import { ShareOpen } from "../components/share-open";
import { queryValue } from "../lib/http";
import { kitchenGarden, kitchenGardenItems } from "../lib/kitchen-garden";
import { serverRead } from "../lib/server-api";

export const metadata: Metadata = {
  title: { absolute: "ntumie. · Good links belong together." },
  description:
    "Gather the resources that explain one idea, put them in order, and share one guide people can follow.",
};
export const dynamic = "force-dynamic";

// The labelled sample shows only enough of the collection to name its parts.
const host = (url?: string) => (url ? new URL(url).hostname.replace(/^www\./, "") : "");
const [spot, firstLink, secondLink, beds, , bedsLink] = kitchenGardenItems;
const spotLinks = [firstLink, secondLink];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const notice = queryValue(query.notice);
  // Guides worth following come from Discover; the section is left out when
  // there is nothing published or Discover is unavailable.
  const guides = await serverRead<Collection[]>("/api/v1/discover?limit=3");
  const featured = guides.ok ? guides.data.slice(0, 3) : [];
  return (
    <div className="brand-page" data-reader>
      <ShareOpen shareId={queryValue(query.via)} kind="site" />
      <section className="brand-band" aria-labelledby="landing-title">
        <div className="brand-hero">
          <div className="brand-intro">
            {notice === "signed-out" && <FormNotice code={notice} />}
            <h1 id="landing-title">Good links belong together.</h1>
            <p className="brand-lead">
              Gather the resources that explain one idea, put them in the order they make sense, and
              share one guide people can follow.
            </p>
            <div className="brand-actions">
              {/* The first-link flow becomes Start a collection in the cobalt redesign (M5). */}
              <a className="button band-solid" href="/capture">
                Start a collection
              </a>
              <a
                className="button band-ghost"
                href={featured[0] ? `/c/${featured[0].id}` : "/discover"}
              >
                Read a guide
              </a>
            </div>
          </div>
          <RouteArt />
        </div>
      </section>

      <section className="anatomy" aria-labelledby="anatomy-title">
        <h2 id="anatomy-title">How to read a collection</h2>
        <p className="brand-section-lead">
          Every part has one job. Here is a sample collection, “{kitchenGarden.title}”, labelled.
        </p>
        <figure
          className="anatomy-figure"
          aria-label="A sample collection labelled: 1 the idea, its title and description; 2 sections that put resources in order; 3 a resource with where it lives; 4 one address that keeps improving"
        >
          <div className="anatomy-card" aria-hidden="true" />
          <div className="anatomy-part anatomy-idea" data-part="1">
            <p className="anatomy-title">{kitchenGarden.title}</p>
            <p className="anatomy-muted">{kitchenGarden.description}</p>
          </div>
          <div className="anatomy-part anatomy-sections" data-part="2">
            <p className="anatomy-section">{spot.title}</p>
            <ul>
              {spotLinks.map((item, index) => (
                <li key={item.id} data-part={index === 0 ? "3" : undefined}>
                  <b>{item.title}</b>
                  <span>{host(item.url)}</span>
                </li>
              ))}
            </ul>
            <p className="anatomy-section">{beds.title}</p>
            <ul>
              <li>
                <b>{bedsLink.title}</b>
                <span>{host(bedsLink.url)}</span>
              </li>
            </ul>
          </div>
          <p className="anatomy-part anatomy-address" data-part="4">
            ntumie.link/c/01a2…
          </p>
          <figcaption className="anatomy-callouts">
            <p className="callout callout-idea">
              <b>
                <span className="callout-n">1</span> The idea
              </b>
              A title and one sentence on what it explains.
            </p>
            <p className="callout callout-sections">
              <b>
                <span className="callout-n">2</span> Sections
              </b>
              Put resources in the order they make sense.
            </p>
            <p className="callout callout-resource">
              <b>
                <span className="callout-n">3</span> A resource
              </b>
              Its title, where it lives and why it is here.
            </p>
            <p className="callout callout-address">
              <b>
                <span className="callout-n">4</span> One address
              </b>
              Share it once; it keeps improving.
            </p>
          </figcaption>
        </figure>
      </section>

      <section className="brand-ideas" aria-label="What makes a collection">
        <div>
          <h3>One idea each</h3>
          <p>A collection makes a point; every link is there for a reason.</p>
        </div>
        <div>
          <h3>In the order that makes sense</h3>
          <p>Sections turn a pile of links into a path someone can follow.</p>
        </div>
        <div>
          <h3>One address that keeps improving</h3>
          <p>Share it once. Readers always see the latest version.</p>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="brand-guides" aria-labelledby="guides-title">
          <div className="brand-section-head">
            <h2 id="guides-title">Guides worth following</h2>
            <a href="/discover">Discover more</a>
          </div>
          <ul className="guide-cards">
            {featured.map((guide) => (
              <li key={guide.id}>
                <a className="guide-card" href={`/c/${guide.id}`}>
                  <span className="guide-card-text">
                    <b>{guide.title}</b>
                    {guide.description && <span>{guide.description}</span>}
                  </span>
                  {guide.sectionCount !== undefined && (
                    <em>
                      {guide.sectionCount} {guide.sectionCount === 1 ? "section" : "sections"}
                    </em>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
