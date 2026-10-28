import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NativeForm } from "../../../components/native-form";
import { PasskeyButton } from "../../../components/passkey-button";
import { readFlow } from "../../../lib/form-server";

export const metadata: Metadata = { title: "Continue signing in" };
export const dynamic = "force-dynamic";
// After the email: a passkey on this device can skip the code. The page never
// says whether the address has an account; the code works either way.
export default async function Page() {
  const flow = await readFlow();
  if (!flow?.email || flow.invitationToken || flow.googleConnection) redirect("/sign-in");
  const signup = flow.intent === "sign-up";
  return (
    <section className="auth-column verify">
      {!signup && (
        <span className="auth-icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="15" r="4" />
            <path d="m10.8 12.2 8.2-8.2M17 6l2 2M15 8l2 2" />
          </svg>
        </span>
      )}
      <h1>{signup ? "Confirm your email" : "Welcome back"}</h1>
      <p className="auth-lead">
        {signup ? (
          <>
            We will email a six-digit code to <strong>{flow.email}</strong>. If you already have an
            account, it signs you in.
          </>
        ) : (
          <>
            Use the passkey saved on this device for <strong>{flow.email}</strong>.
          </>
        )}
      </p>
      {!signup && <PasskeyButton email={flow.email} returnTo={flow.returnTo} label="Use passkey" />}
      <NativeForm action="/forms/code-send" className={signup ? "auth-form" : "auth-foot"}>
        <input type="hidden" name="email" value={flow.email} />
        <input type="hidden" name="returnTo" value={flow.returnTo} />
        <button
          type="submit"
          className={signup ? "button primary auth-submit" : "text-button auth-text-action"}
        >
          {signup ? "Send code" : "Email me a code instead"}
        </button>
      </NativeForm>
      <p className="auth-foot">
        <a
          href={`/${signup ? "sign-up" : "sign-in"}?returnTo=${encodeURIComponent(flow.returnTo)}`}
        >
          Use a different email
        </a>
      </p>
    </section>
  );
}
