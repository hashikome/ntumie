# ADR-0039: Google sign-in and account creation

Status: accepted (2026-10-10). Entry screens are [ADR-0044](0044-separate-sign-in-and-sign-up.md);
protected authentication is [ADR-0035](0035-passwordless-account-security.md); the current contract is
[passwordless security](../design-docs/passwordless-security.md).

This record holds what ADR-0037 and ADR-0038 decided before it. Those first required external-email
users to visit Settings to connect Google, then an extra inbox code to create an account after
Google. Both were replaced: the first proof moved inside sign-in, and creation now trusts Google's
verified identity once the person explicitly confirms it.

## Context

Google is sign-in convenience. It supplies an authenticated identity, a verified email and a
profile name, so asking a new person for another inbox code repeats the identity step. Silently
creating an account after Google consent is still unwanted: someone may have picked the wrong
Google account while trying to sign in. Google itself recommends extra ownership proof for an email
it does not host, even when the claim is verified
([guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)).

## Decision

**A missing account.** After validated Google authentication, a person with no account sees their
email and exactly two choices: Create account, or Already have an account? Sign in. The Google
callback, or viewing that screen, creates nothing. Create account confirms registration without
another email code or provider round trip; the alternative cancels pending Google state and returns
to ordinary sign-in with the destination preserved.

The backend stages the verified Google subject, email and name in an encrypted, ten-minute,
browser-bound record. `POST /api/v1/auth/google-connection/register` accepts only
`{ confirm: true }`. Within the authority transaction it requires a live pending new-account proof,
no current account with that email and no existing association for the subject. Better Auth creates
the verified user and session through the app-owned onboarding hook; the completion hook connects
the subject, consumes proof, audits sign-in and stamps freshness atomically. Email, name or subject
supplied by a client are never accepted. Provider-only signup stays disabled in Better Auth, and
email-code continuation cannot consume a new-account Google proof.

The Google name initializes the full name (at most 255 characters), with a neutral default when
missing; sign-in never renames an existing account. Google photos are not imported: avatars come from
Gravatar by the verified account email, with a generated fallback, and never block creation.

**An existing account.** An authoritative Gmail or Workspace match links automatically. Any other
verified Google email needs a first proof inside the same sign-in, never a separate Settings step:
the inline screen shows the known email and uses the emailed code, or a registered, user-verified
passkey. Until then the backend holds an encrypted pending association bound to the user UUID,
email, account operations version and Google subject, addressed by a ten-minute HttpOnly cookie
with a random secret; no token or subject reaches the web. The connection, proof consumption,
session and audit commit together, and an enrolled factor must pass first. An existing session
cannot stand in for that completion. Later sign-ins use the stored provider subject, never the
email as a key. Optional linking and disconnection remain in Security settings.

**Every sign-in.** Google's verified email must equal the product account's email, including after
linking; a mismatch rolls back authentication and returns to Continue with email. Email entry
reveals no account existence or enrolled methods. When a passkey is offered after email entry, the
WebAuthn challenge is bound to that email, the immutable user ID and the operations version, and
another account's credential is rejected; no credential IDs are returned from an unverified email.

**Leaving the flow.** Starting ordinary email sign-in, standalone passkey sign-in, invitation
verification or confirmation code issuance discards abandoned Google state, and every form transport
forwards the committed cookie deletion. The `googleConnection` and `continueSignIn` flags only say
which flow continues; they grant no identity authority. Invitations keep their own email proof and
consent. Capture and invitations use email codes directly.

The web owns presentation and native-form transport. OAuth callbacks, eligibility, proof storage,
factor policy and account linking stay in the API. Product copy speaks of creating an account or
signing in; linking is an implementation detail.

## Consequences

A genuinely new person creates an account with one deliberate tap. Attaching Google to an existing
account keeps the stricter first proof, so an old external-email Google claim cannot take over an
account. Expiry, cancellation, replay, revocation, concurrent registration, subject conflicts and
transaction failure fail closed, leaving no partial user, association or session. No extra Google
scopes are requested.

Reference: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
