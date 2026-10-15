import { webServerConfig } from "@ntumie/config/web-server";
import type { Collection, PersonProfile as PersonProfileData } from "@ntumie/types";
import { notFound } from "next/navigation";
import { type ApiPath, permalink, withCursor } from "../lib/http";
import { readShared } from "../lib/server-api";
import { readOwnProfile, readSession } from "../lib/session";
import { Avatar } from "./avatar";
import { CollectionCard } from "./collection-card";
import { FakeDoor } from "./fake-door";
import { Feedback } from "./feedback";
import { FormNotice } from "./form-notice";
import { HubMark } from "./hub-mark";
import { Updated } from "./local-time";
import { NativeForm } from "./native-form";
import { ShareAction } from "./share-action";
import { ShareOpen } from "./share-open";
import { StartCollectionPrompt } from "./start-collection-prompt";

export async function PersonProfile({
  username,
  userId,
  cursor,
  notice,
  shareId,
  tab,
}: {
  username?: string;
  userId?: string;
  cursor?: string;
  notice?: string;
  shareId?: string;
  tab?: string;
}) {
  const profilePath = userId ? `/people/${userId}` : `/${encodeURIComponent(username ?? "")}`;
  const apiPath: ApiPath = userId
    ? `/api/v1/people/${userId}`
    : `/api/v1/people/by-username/${encodeURIComponent(username ?? "")}`;
  const returnTo = `${profilePath}${cursor ? `?${new URLSearchParams({ cursor })}` : ""}`;
  const [result, session] = await Promise.all([
    readShared<PersonProfileData>(withCursor(apiPath, cursor)),
    readSession(),
  ]);
  if (!result.ok && result.status === 404) notFound();
  if (!result.ok) return <Feedback error={result} resetPath={profilePath} />;
  const { person, hub, collections, contributionCount, saved } = result.data;
  const current = tab === "saved" && saved ? "saved" : "contributions";
  const own = session?.userId === person.userId;
  // Only the owner sees the prompts, and only while they keep no collections.
  const mine = own ? await readOwnProfile() : null;
  const starting = Boolean(mine && (!mine.hubId || mine.hubCollectionCount === 0));
  return (
    <div className="band-page person-page" data-reader>
      <ShareOpen shareId={shareId} kind="profile" resourceId={person.userId} />
      <section className="brand-band page-band" aria-labelledby="person-title">
        <div className="band-identity">
          <span className="person-picture">
            <Avatar userId={person.userId} large />
          </span>
          <div>
            <h1 id="person-title">{person.name || person.username}</h1>
            {(person.name || hub) && (
              <p className="band-handle">
                <span>{person.username}</span>
                {hub && (
                  <>
                    {" "}
                    of <a href={`/h/${hub.id}`}>{hub.name}</a>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        {person.bio && <p className="band-lead person-bio">{person.bio}</p>}
        <div className="band-actions">
          {own && (
            <a className="button band-ghost" href="/settings">
              Settings
            </a>
          )}
          <ShareAction
            target={{ kind: "profile", id: person.userId }}
            returnTo={returnTo}
            className="button band-ghost"
          />
        </div>
      </section>
      <div className="band-body">
        <FormNotice code={notice} />
        {starting && mine ? (
          <div className="profile-prompts">
            <StartCollectionPrompt
              hubAddress={
                mine.hubId && mine.handle
                  ? `${new URL(webServerConfig().publicOrigin).host}/@${mine.handle}`
                  : undefined
              }
            />
            <div className="profile-hints">
              {!person.bio && (
                <section className="profile-hint" aria-labelledby="bio-hint-title">
                  <h2 id="bio-hint-title">Say who you are</h2>
                  <p>A line or two on what you read and why. It shows under your name.</p>
                  <a className="button" href="/settings#bio">
                    Add a bio
                  </a>
                </section>
              )}
              <ShowWhatYouFollow shown={mine.showSavedCollections} returnTo={profilePath} />
            </div>
          </div>
        ) : null}
        {(!starting || collections.length > 0 || saved) && (
          <>
            <nav className="page-tabs" aria-label="Profile">
              <a href={profilePath} aria-current={current === "contributions" ? "page" : undefined}>
                Contributions <span>{contributionCount}</span>
              </a>
              {saved && (
                <a
                  href={`${profilePath}?tab=saved`}
                  aria-current={current === "saved" ? "page" : undefined}
                >
                  Saved <span>{result.data.savedCount ?? saved.length}</span>
                </a>
              )}
            </nav>
            {current === "saved" && saved ? (
              saved.length ? (
                <ul className="collection-cards">
                  {saved.map((item) => (
                    <CollectionCard key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <p className="empty">No saved collections to show.</p>
              )
            ) : (
              <>
                {collections.length ? (
                  <ul className="collection-rows">
                    {collections.map((item) => (
                      <ContributionRow key={item.id} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="meta">No public contributions yet.</p>
                )}
                {result.meta?.nextCursor && (
                  <div className="continuation">
                    <a
                      className="button"
                      href={`${profilePath}?cursor=${encodeURIComponent(result.meta.nextCursor)}`}
                    >
                      Show more
                    </a>
                  </div>
                )}
              </>
            )}
            {mine && !starting && (
              <div className="profile-follow-settings">
                <ShowWhatYouFollow shown={mine.showSavedCollections} returnTo={profilePath} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

// A collection the person helped make, with its hub and what they did there.
function ContributionRow({ item }: { item: Collection }) {
  const done = item.contribution;
  return (
    <li className="owned-row collection-item">
      <div>
        <a className="owned-row-title" href={permalink(item.id)}>
          {item.title}
        </a>
        {item.description && <span className="owned-row-description">{item.description}</span>}
        <span className="owned-row-meta">
          {item.hub && (
            <a className="row-hub" href={`/h/${encodeURIComponent(item.hub.id)}`}>
              <HubMark hubId={item.hub.id} size={20} />
              {item.hub.name}
            </a>
          )}
          {done?.kind === "created" || !done ? (
            <span>
              {item.hub && "· "}
              {done ? "Created · " : ""}Updated <Updated at={item.updatedAt} />
            </span>
          ) : (
            <span>
              {item.hub && "· "}
              {done.kind === "links"
                ? `Added ${plural(done.count, "link")}`
                : done.kind === "sections"
                  ? `Added ${plural(done.count, "section")}`
                  : "Edited"}{" "}
              · <Updated at={done.at} />
            </span>
          )}
        </span>
      </div>
    </li>
  );
}

// Only the owner sees this: what visitors may see besides contributions.
// Saves are real; subscriptions and communities are on the way (fake doors).
function ShowWhatYouFollow({ shown, returnTo }: { shown: boolean; returnTo: string }) {
  return (
    <section className="profile-hint follow-settings" aria-labelledby="follow-title">
      <h2 id="follow-title">Show what you follow</h2>
      <p>Let visitors see your saves, subscriptions and communities.</p>
      <div className="switch-row">
        <span id="show-saved-label">Saved collections</span>
        <NativeForm action="/forms/profile-show-saved" className="fake-door">
          <input type="hidden" name="show" value={String(!shown)} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            role="switch"
            aria-checked={shown}
            aria-labelledby="show-saved-label"
            className="switch"
          />
        </NativeForm>
      </div>
      {(["subscriptions", "communities"] as const).map((feature) => (
        <div className="switch-row" key={feature}>
          <span id={`show-${feature}-label`}>
            {feature === "subscriptions" ? "Subscriptions" : "Communities"}
          </span>
          <FakeDoor
            feature={feature}
            returnTo={returnTo}
            className="switch"
            switchLabelledBy={`show-${feature}-label`}
          >
            {null}
          </FakeDoor>
        </div>
      ))}
    </section>
  );
}
