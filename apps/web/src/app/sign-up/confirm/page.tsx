import type { Metadata } from "next";
import { FormNotice } from "../../../components/form-notice";
import { NativeForm } from "../../../components/native-form";
import { readFlow } from "../../../lib/form-server";
import { queryValue } from "../../../lib/http";
import { serverRead } from "../../../lib/server-api";
import { isDraftPath } from "../../../lib/validation";
export const metadata: Metadata = { title: "Create your account" };
export const dynamic = "force-dynamic";
// After proof, an account is only ever created on an explicit choice. Three
// situations share this page: someone signing up (name it, optionally), a
// sign-in that found no account, and a Google email with no account yet.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const flow = await readFlow();
  const signup = flow?.intent === "sign-up";
  const starting = flow ? isDraftPath(flow.returnTo) : false;
  const google = query.method === "google";
  const pending = await serverRead<{ email: string; name?: string | null; registration?: boolean }>(
    google ? "/api/v1/auth/google-connection" : "/api/v1/auth/email-registration",
  );
  const ready = pending.ok && (!google || pending.data.registration);
  const notice = (
    <FormNotice
      code={
        ready
          ? queryValue(query.notice)
          : !pending.ok && pending.status !== 404
            ? "unavailable"
            : "registration-expired"
      }
    />
  );
  const action = google ? "/forms/google-register" : "/forms/email-register";
  const cancel = google ? "/forms/google-cancel" : "/forms/email-registration-cancel";
  if (!ready)
    return (
      <section className="auth-column verify">
        <h1>Create your account</h1>
        {notice}
        <a className="button primary auth-submit" href="/sign-up">
          Start again
        </a>
      </section>
    );
  const { email, name } = pending.data;
  if (google)
    return (
      <section className="auth-column verify">
        <h1>Create an account with Google?</h1>
        <p className="auth-lead">There is no ntumie. account for this Google email yet.</p>
        {notice}
        <div className="identity-card">
          <span className="identity-mark" aria-hidden="true">
            {(name || email).charAt(0).toUpperCase()}
          </span>
          <span>
            {name && <b>{name}</b>}
            <span>{email}</span>
          </span>
        </div>
        <NativeForm action={action} className="auth-form">
          <input type="hidden" name="confirm" value="yes" />
          <button type="submit" className="button primary auth-submit">
            Create account
          </button>
        </NativeForm>
        <NativeForm action={cancel} className="auth-foot">
          <button type="submit" className="text-button">
            Back to sign in
          </button>
        </NativeForm>
      </section>
    );
  if (!signup && !starting)
    return (
      <section className="auth-column verify">
        <h1>No account for this email</h1>
        <p className="auth-lead">
          <strong>{email}</strong> is confirmed, but it has no ntumie. account yet.
        </p>
        {notice}
        <NativeForm action={action} className="auth-form">
          <input type="hidden" name="confirm" value="yes" />
          <button type="submit" className="button primary auth-submit">
            Create account
          </button>
        </NativeForm>
        <NativeForm action={cancel} className="auth-foot">
          <button type="submit" className="text-button">
            Use a different email
          </button>
        </NativeForm>
      </section>
    );
  return (
    <section className="auth-column verify">
      <h1>Create your account</h1>
      <div className="identity-card">
        <span className="identity-mark" aria-hidden="true">
          {email.charAt(0).toUpperCase()}
        </span>
        <span>
          <b>{email}</b>
          <span className="identity-confirmed">✓ Email confirmed</span>
        </span>
      </div>
      {notice}
      <NativeForm action={action} className="auth-form">
        <input type="hidden" name="confirm" value="yes" />
        <div className="field">
          <label htmlFor="account-name">
            Your name <span className="optional">(optional)</span>
          </label>
          <input
            id="account-name"
            name="name"
            autoComplete="name"
            maxLength={255}
            aria-describedby="account-name-hint"
          />
          <p className="field-help" id="account-name-hint">
            Shown on your profile. You can change it later.
          </p>
        </div>
        <button type="submit" className="button primary auth-submit">
          Create account
        </button>
      </NativeForm>
      <p className="auth-foot">
        {starting
          ? "Next: your collection is created. Your hub comes with it."
          : "Next: start your first collection. Your hub comes with it."}
      </p>
    </section>
  );
}
