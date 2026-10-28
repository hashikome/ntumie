import { FormNotice } from "./form-notice";
import { GoogleSignIn } from "./google-sign-in";
import { NativeForm } from "./native-form";
import { PasskeyAutofill, PasskeyButton } from "./passkey-button";

export async function AuthEntry({
  intent,
  returnTo,
  notice,
  reason,
}: {
  intent: "sign-in" | "sign-up";
  returnTo: string;
  notice?: string;
  reason?: string;
}) {
  const signup = intent === "sign-up";
  return (
    <section className="auth-column auth-entry">
      <h1>{signup ? "Create your account" : "Sign in to ntumie."}</h1>
      <p className="auth-lead">
        {reason ??
          (signup
            ? "Collections are free to make and share. We will email you a code."
            : "We will email you a code. There is no password.")}
      </p>
      <FormNotice code={notice} />
      <NativeForm action="/forms/email-start" className="auth-form">
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label htmlFor="email">Email</label>
        {/* "webauthn" lets the browser offer saved passkeys in this field. */}
        <input
          id="email"
          name="email"
          type="email"
          autoComplete={signup ? "email" : "username webauthn"}
          required
          maxLength={254}
        />
        <button type="submit" className="button primary auth-submit">
          Continue with email
        </button>
      </NativeForm>
      <GoogleSignIn returnTo={returnTo} intent={intent} />
      {!signup && (
        <>
          <PasskeyAutofill returnTo={returnTo} />
          <div className="auth-passkey">
            <PasskeyButton returnTo={returnTo} label="Sign in with a passkey" plain quiet />
          </div>
        </>
      )}
      <p className="auth-foot">
        {signup ? "Already have an account?" : "New here?"}{" "}
        <a href={`/${signup ? "sign-in" : "sign-up"}?returnTo=${encodeURIComponent(returnTo)}`}>
          {signup ? "Sign in" : "Create an account"}
        </a>
      </p>
      {notice === "signout-failed" && (
        <NativeForm action="/forms/sign-out">
          <button type="submit" className="text-button">
            Try signing out again
          </button>
        </NativeForm>
      )}
    </section>
  );
}
