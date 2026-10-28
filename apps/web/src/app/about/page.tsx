import type { Metadata } from "next";
import { ShareAction } from "../../components/share-action";
import { kitchenGarden, kitchenGardenItems } from "../../lib/kitchen-garden";

export const metadata: Metadata = {
  title: "About ntumie.",
  description:
    "Put the links worth passing on around one idea, say why each matters, and share one address.",
};
export const dynamic = "force-dynamic";

const host = (url?: string) => (url ? new URL(url).hostname.replace(/^www\./, "") : "");

// The first two sections of the sample collection, shown as loose saved links
// and then as the guide they become.
const guideSections = [
  { heading: kitchenGardenItems[0], links: kitchenGardenItems.slice(1, 3) },
  { heading: kitchenGardenItems[3], links: [kitchenGardenItems[5], kitchenGardenItems[4]] },
];
const loose = [
  kitchenGardenItems[5],
  kitchenGardenItems[1],
  kitchenGardenItems[4],
  kitchenGardenItems[2],
];

export default function Page() {
  return (
    <div className="brand-page" data-reader>
      <section className="brand-band" aria-labelledby="about-title">
        <div className="brand-hero brand-hero-about">
          <div className="brand-intro">
            <h1 id="about-title">A guide is more than a pile of links.</h1>
            <p className="brand-lead">
              Most saved links are never opened again. ntumie. is for the ones worth passing on: put
              them around one idea, add a sentence on why each matters, and share an address that
              gets better every time you add to it.
            </p>
            <div className="brand-actions">
              <a className="button band-solid" href="/start">
                Start a collection
              </a>
              <ShareAction
                target={{ kind: "site" }}
                returnTo="/about"
                label="Share ntumie."
                className="button band-ghost"
              />
            </div>
          </div>
          <figure
            className="saved-to-guide"
            aria-label="The same links, saved and forgotten, then arranged into a guide with sections and a reason for each"
          >
            <div className="saved-loose">
              <p className="saved-label">Saved and forgotten</p>
              <ul>
                {loose.map((item) => (
                  <li key={item.id}>
                    {item.title}
                    <small>{host(item.url)}</small>
                  </li>
                ))}
              </ul>
            </div>
            <svg
              className="saved-arrow"
              width="48"
              height="32"
              viewBox="0 0 48 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 16h38M30 5l12 11-12 11" />
            </svg>
            <div className="saved-guide">
              <p className="saved-guide-title">{kitchenGarden.title}</p>
              <p className="saved-guide-description">
                What to grow, where, and how to keep it growing.
              </p>
              {guideSections.map(({ heading, links }, index) => (
                <div key={heading.id}>
                  <p className="saved-section">
                    <b aria-hidden="true">{index + 1}</b>
                    {heading.title}
                  </p>
                  <ul>
                    {links.map((item) => (
                      <li key={item.id}>
                        {item.title}
                        <small>{host(item.url)}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="saved-why">
                Start the compost first; it needs a few months before the beds are ready for it.
              </p>
            </div>
          </figure>
        </div>
      </section>

      <section className="brand-steps" aria-labelledby="steps-title">
        <h2 id="steps-title">How a collection comes together</h2>
        <ol>
          <li>
            <h3>Pick the idea</h3>
            <p>One point you want someone to understand, like starting a kitchen garden.</p>
          </li>
          <li>
            <h3>Add resources in order</h3>
            <p>Group them into sections, with a line on why each one is there.</p>
          </li>
          <li>
            <h3>Share one address</h3>
            <p>Improve it whenever you learn more; everyone with the link sees the latest.</p>
          </li>
        </ol>
      </section>

      <section className="brand-more" aria-label="Help and the person behind ntumie.">
        <div>
          <h2>Need a hand?</h2>
          <p>
            Support covers accounts, signing in, importing your links and keeping collections
            together.
          </p>
          <a href="/support">Open Support</a>
        </div>
        <div>
          <h2>Who makes it</h2>
          <p>ntumie. is built by Paul John.</p>
          <a href="https://namestarlit.com" rel="noopener">
            namestarlit.com
          </a>
        </div>
      </section>
    </div>
  );
}
