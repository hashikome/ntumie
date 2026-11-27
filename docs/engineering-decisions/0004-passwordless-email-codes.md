# ADR-0004: Passwordless sign-in with email codes; better-auth owns credentials

**Status:** accepted  
**Date:** 2026-10-07

Passkeys, Google and optional TOTP and recovery are [ADR-0035](0035-passwordless-account-security.md)'s;
Google account creation is [ADR-0039](0039-google-sign-in-and-account-creation.md)'s; the sign-in and sign-up
entries are [ADR-0044](0044-separate-sign-in-and-sign-up.md)'s.

## Context

Passwords add reset flows, breach exposure and support load for a product that
already relies on email.

## Options considered

- Passwords + email verification
- Magic links
- Email codes

## Decision

Sign-in is a six-digit email code, Better Auth's default. better-auth owns credentials, sessions and
verification primitives; the product owns identity, onboarding and
authorization. Session resolution goes through `resolveSessionUser`; services
see `AuthUser`, never better-auth types. Sign-up onboarding lives in an
app-owned service callable from any auth path.

## Rationale

- No passwords to store or reset.
- Codes work across devices (a magic link opens wherever the mail is read).
- Six digits are shorter to type. That cuts the guessing space from 100 million to
  one million, so it relies on the attempt limits below, which tests guard. This
  record first chose eight digits without a reason for eight over six; product
  review chose the shorter entry (ADR-0057, folded in here, 12 October 2026).
- The future ns-series SSO can call the same onboarding service.

## Constraints to preserve

- Codes are six plain digits, single-use and valid for five minutes, with three
  wrong attempts per proof, resend rotation and cooldown, and at most five issues
  and fifteen verification attempts per identity per ten minutes, plus shared
  source budgets. Replacing a code never resets the identity's budget.
- Better Auth generates, hashes, compares and consumes codes; there is no
  `otpLength` override. Tests assert six-digit generation and budgets that persist
  across resends, so a dependency upgrade cannot silently change the contract.
- Authenticator-app and recovery codes keep their own contracts.
- The better-auth handler is mounted before body parsers.

## Links

- [auth-delivery-integration.md](../design-docs/auth-delivery-integration.md)
- [identity-sso.md](../design-docs/identity-sso.md)
