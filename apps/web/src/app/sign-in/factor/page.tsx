import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CodeInput } from "../../../components/code-input";
import { FormNotice } from "../../../components/form-notice";
import { NativeForm } from "../../../components/native-form";
import { PasskeyButton } from "../../../components/passkey-button";
import { readFlow } from "../../../lib/form-server";
import { queryValue } from "../../../lib/http";
import { serverRead } from "../../../lib/server-api";
export const metadata: Metadata = { title: "Confirm your sign-in" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flow = await readFlow();
  if (!flow) redirect("/sign-in?notice=expired");
  const query = await searchParams;
  const recovery = queryValue(query.method) === "recovery";
  // Ask only for what this account has. If that can't be read, offer both.
  const pending = await serverRead<{ totp: boolean; passkey: boolean }>(
    "/api/v1/auth/pending-factors",
  );
  const totp = !pending.ok || pending.data.totp;
  const passkey = !pending.ok || pending.data.passkey;
  const showForm = recovery || totp;
  return (
    <section className="auth-column verify">
      <h1>Confirm it is you</h1>
      <p className="auth-lead">
        {recovery
          ? "Enter one of the recovery codes you saved. Each works once."
          : totp
            ? "Enter the six-digit code from your authenticator app."
            : "Use your passkey to finish signing in."}
      </p>
      <FormNotice code={queryValue(query.notice)} />
      {showForm && (
        <NativeForm action="/forms/factor-verify" id="factor-form" className="auth-form">
          <input type="hidden" name="method" value={recovery ? "recovery" : "totp"} />
          <label htmlFor="code" className={recovery ? undefined : "sr-only"}>
            {recovery ? "Recovery code" : "Six-digit authenticator code"}
          </label>
          {recovery ? (
            <input
              id="code"
              name="code"
              autoComplete="one-time-code"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={11}
            />
          ) : (
            <CodeInput invalid={queryValue(query.notice) === "invalid"} />
          )}
        </NativeForm>
      )}
      {passkey && !showForm && (
        <PasskeyButton pending returnTo={flow.returnTo} label="Use a passkey" />
      )}
      <div className="code-row">
        {passkey && showForm && (
          <PasskeyButton pending returnTo={flow.returnTo} label="Use a passkey" plain />
        )}
        {(totp || !recovery) && (
          <a href={recovery ? "/sign-in/factor" : "/sign-in/factor?method=recovery"}>
            {recovery ? "Use an authenticator code" : "Use a recovery code"}
          </a>
        )}
      </div>
      {showForm && (
        <button type="submit" form="factor-form" className="button primary auth-submit">
          Sign in
        </button>
      )}
      <div className="auth-foot">
        {flow.googleConnection ? (
          <NativeForm action="/forms/google-cancel">
            <button type="submit" className="text-button">
              Cancel
            </button>
          </NativeForm>
        ) : (
          <a href="/support#account-recovery">Help with account recovery</a>
        )}
      </div>
    </section>
  );
}
