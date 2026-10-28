import { randomUUID } from "node:crypto";
import { webServerConfig } from "@ntumie/config/web-server";
import { maxNoteLength } from "@ntumie/types";
import type { CaptureDraft } from "../lib/capture-draft";
import { queryValue } from "../lib/http";
import { readSession } from "../lib/session";
import { FirstLinkField } from "./first-link-field";
import { FormNotice } from "./form-notice";
import { NativeForm } from "./native-form";
import { StartSteps } from "./start-steps";

// Start a collection (replaces "Save your first link"): one idea, its first
// link and who can see it. Nothing is created until the person is confirmed;
// signed in, Continue creates it straight away.
export async function StartCollection({
  draft,
  query,
}: {
  draft?: CaptureDraft;
  query: Record<string, string | string[] | undefined>;
}) {
  const session = await readSession();
  const id = draft?.id ?? randomUUID();
  const first = draft?.links[0];
  const published = draft?.published ?? session?.newCollectionPublished ?? true;
  const title = draft?.collectionTitle ?? queryValue(query.title, 255) ?? "";
  return (
    <section className="auth-column start-collection" aria-labelledby="start-title">
      {!session && <StartSteps current={1} />}
      <h1 id="start-title">Start a collection</h1>
      <p className="auth-lead">
        Name the idea and add the first link that explains it. You can add more links and sections
        next.
      </p>
      <FormNotice code={queryValue(query.notice)} />
      <NativeForm action="/forms/start-collection" className="auth-form">
        <input type="hidden" name="draftId" value={id} />
        <div className="field">
          <label htmlFor="start-name">What is it about?</label>
          <input
            id="start-name"
            name="collectionTitle"
            maxLength={255}
            defaultValue={title}
            placeholder="Starting a kitchen garden"
            aria-describedby="start-name-hint"
          />
          <p className="field-help" id="start-name-hint">
            One idea, in a few words. You can rename it later.
          </p>
        </div>
        <FirstLinkField initial={first?.url} origin={webServerConfig().publicOrigin} />
        <div className="field">
          <label htmlFor="start-note">
            Note <span className="optional">(optional)</span>
          </label>
          <textarea
            id="start-note"
            name="note"
            rows={3}
            maxLength={maxNoteLength}
            defaultValue={first?.note}
            placeholder="Why this link is worth reading"
          />
        </div>
        <fieldset className="visibility-choice">
          <legend>Who can see it</legend>
          <label className="choice-card">
            <input type="radio" name="published" value="true" defaultChecked={published} />
            <span>
              <b>Published</b>
              <small>Anyone can find it on Discover and read it.</small>
            </span>
          </label>
          <label className="choice-card">
            <input type="radio" name="published" value="false" defaultChecked={!published} />
            <span>
              <b>Private</b>
              <small>Only you.</small>
            </span>
          </label>
        </fieldset>
        <button type="submit" className="button primary auth-submit">
          {session ? "Create collection" : "Continue"}
        </button>
      </NativeForm>
      {!session && (
        <p className="auth-foot">Have an account already? You sign in on the next step.</p>
      )}
    </section>
  );
}
