import type { ReactNode } from "react";
import type { VerificationCopy, VerificationPurpose } from "../lib/verification";
import { CodeInput } from "./code-input";
import { FormNotice } from "./form-notice";
import { NativeForm } from "./native-form";
import { ResendCode } from "./resend-code";

// The two screens every email-code situation shares, written to scan at a
// glance: why we're asking, then where the code goes (the address in bold) and
// what happens next, then the actions.

// Step 1: send a code. A known address (signed in, invitation) is shown, never
// asked for; otherwise the person enters it.
export function VerifyStart({
  copy,
  purpose,
  email,
  sendAction,
  returnTo,
  notice,
  cancelAction,
  footer,
  alternatives,
  sendLabel = "Send code",
}: {
  alternatives?: ReactNode;
  sendLabel?: string;
  copy: VerificationCopy;
  purpose: VerificationPurpose;
  email?: string;
  sendAction: `/forms/${string}`;
  returnTo?: string;
  notice?: string;
  /** A form action that abandons the flow, shown as the secondary button. */
  cancelAction?: `/forms/${string}`;
  footer?: ReactNode;
}) {
  return (
    <section className="reader account-flow verify">
      <h1>{copy.title}</h1>
      <p className="verify-reason">{copy.reason}</p>
      <FormNotice code={notice} />
      {alternatives}
      <NativeForm action={sendAction}>
        <input type="hidden" name="purpose" value={purpose} />
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
        {email ? (
          <p className="verify-detail">
            We'll send a code to <strong>{email}</strong>. {copy.after}
          </p>
        ) : (
          <>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </>
        )}
        {!email && <p className="verify-detail">{copy.after}</p>}
        <div className="verify-actions">
          <button type="submit" className="button primary">
            {sendLabel}
          </button>
          {cancelAction && (
            <button type="submit" formAction={cancelAction} className="button" formNoValidate>
              Cancel
            </button>
          )}
        </div>
      </NativeForm>
      {footer && <div className="verify-footer">{footer}</div>}
    </section>
  );
}

// Step 2: enter the code. Choosing to send it was the decision, so the way on
// is the code, or a new one if it didn't arrive (board: "Check your email").
export function VerifyCode({
  copy,
  email,
  notice,
  wait,
  resendIn,
  footer,
  before,
  leadEnd,
}: {
  copy: VerificationCopy;
  email: string;
  notice?: string;
  wait?: string;
  resendIn: number;
  footer?: ReactNode;
  /** Shown above the title (Start a collection's steps and summary). */
  before?: ReactNode;
  /** Finishes "Enter the code we sent to …" ("to sign in"). */
  leadEnd?: string;
}) {
  const mismatch = notice === "code-invalid";
  return (
    <section className="auth-column verify">
      {before}
      <h1>{copy.codeTitle}</h1>
      <p className="auth-lead">
        Enter the code we sent to <strong>{email}</strong>
        {leadEnd ? ` ${leadEnd}` : ""}. It works for five minutes.
      </p>
      {/* The page already says the code was sent; only problems need a notice. */}
      <FormNotice code={notice === "sent" || mismatch ? undefined : notice} wait={wait} />
      <NativeForm action="/forms/code-verify" id="code-form" className="auth-form">
        <label htmlFor="code" className="sr-only">
          Six-digit code
        </label>
        <CodeInput invalid={mismatch} />
        {mismatch && (
          <p className="field-error" id="code-error" role="alert">
            That code does not match. Check the newest email from ntumie., or send a new code.
          </p>
        )}
      </NativeForm>
      <div className="code-row">
        <ResendCode remaining={resendIn} />
        {footer}
      </div>
      <button type="submit" form="code-form" className="button primary auth-submit">
        {copy.codeButton}
      </button>
    </section>
  );
}
