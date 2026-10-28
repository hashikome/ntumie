import type { Metadata } from "next";
import { AuthEntry } from "../../components/auth-entry";
import { FormNotice } from "../../components/form-notice";
import { NativeForm } from "../../components/native-form";
import { DraftSummary, StartSteps } from "../../components/start-steps";
import { VerifyStart } from "../../components/verification";
import { draftPath } from "../../lib/capture-draft";
import { readDraft } from "../../lib/capture-server";
import { queryValue, safeReturn } from "../../lib/http";
import { readPendingAction } from "../../lib/pending-action";
import { draftId } from "../../lib/validation";
import { type VerificationPurpose, verificationCopy } from "../../lib/verification";
export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const returnTo = safeReturn(queryValue(query.returnTo) ?? "/hub");
  const waiting = draftId(returnTo);
  const [draft, pending] = await Promise.all([
    waiting ? readDraft(waiting) : null,
    readPendingAction(),
  ]);
  // The situation decides the words: a waiting first link, an action the
  // session interrupted, signing in to reach something, or plain sign-in.
  const purpose: VerificationPurpose = draft
    ? "first-link"
    : pending?.target === returnTo
      ? "resume"
      : queryValue(query.returnTo)
        ? "continue"
        : "sign-in";
  if (!draft)
    return (
      <AuthEntry
        intent="sign-in"
        returnTo={returnTo}
        notice={queryValue(query.notice)}
        reason={
          purpose === "sign-in"
            ? undefined
            : verificationCopy(purpose, { returnTo, action: pending?.label }).reason
        }
      />
    );
  // Start a collection, step 2: the collection waits above the email field.
  if (draft.start)
    return (
      <section className="auth-column verify">
        <StartSteps current={2} />
        <DraftSummary draft={draft} />
        <h1>Where should we send your code?</h1>
        <p className="auth-lead">
          We email a six-digit code to confirm it is you. There is no password.
        </p>
        <FormNotice code={queryValue(query.notice)} />
        <NativeForm action="/forms/code-send" className="auth-form">
          <input type="hidden" name="purpose" value="first-link" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
          <button type="submit" className="button primary auth-submit">
            Send code
          </button>
        </NativeForm>
        <p className="auth-foot">
          New here? Confirming creates your account. <a href="/support#privacy">Privacy</a>
        </p>
      </section>
    );
  return (
    <VerifyStart
      copy={verificationCopy(purpose, { returnTo, action: pending?.label })}
      purpose={purpose}
      sendAction="/forms/code-send"
      sendLabel="Send code"
      returnTo={returnTo}
      notice={queryValue(query.notice)}
      footer={<a href={draftPath(draft)}>Back to your link</a>}
    />
  );
}
