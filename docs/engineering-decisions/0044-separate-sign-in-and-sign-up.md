# ADR-0044: Separate sign-in and sign-up entries

**Status:** accepted  
**Date:** 2026-10-10  
**Amends:** ADR-0004 email onboarding and ADR-0018 hub creation. Their credential, identity,
same-email linking and invitation boundaries remain accepted. Google's part is
[ADR-0039](0039-google-sign-in-and-account-creation.md). This record first also offered an optional
hub on account creation; [ADR-0069](0069-hubs-come-with-the-first-collection.md) removed it, so a
hub now comes only with a first collection.

## Context

A single sign-in-or-create journey becomes ambiguous with Google: selecting the wrong identity must
not silently create an unwanted account.

## Decision

`/sign-in` and `/sign-up` express different intentions and share the authentication
implementation. Each offers email and Google, and points to the other ("New here? Create an
account", "Already have an account? Sign in"). Layout and wording are the
[web interface](../design-docs/web-interface-system.md)'s.

Account existence is disclosed only after identity proof. An existing user signs in with enrolled
protection whichever entry they used. A verified missing identity sees its email and an explicit
Create account confirmation; sign-in also offers Use a different email. Neither email verification
nor a Google callback silently creates an account in these flows, and creation reuses the proof
already given rather than sending another email code. Account creation offers no hub.

First-link capture and invitation acceptance keep their focused email-code flows and explicit task
intent, without detouring through sign-up. Capture can pass explicit `createAccount` consent when
verifying its code; invitation verification keeps its independent proof and onboarding transaction.
Creation consent grants no service role. Validated return destinations survive switching entry,
switching email, creation, factors and cancellation.

## Backend mechanism

Better Auth still consumes OTPs atomically and enforces expiry and attempt limits. For a missing
ordinary email identity, signup is disabled in the scoped adapter; after successful proof a random
HttpOnly ten-minute cookie addresses an encrypted verification record. The implementation depends
on Better Auth consuming the OTP before `findUserByEmail`; regression tests guard that ordering and
invalid proof. `GET /email-registration` previews only browser-bound proof.
`POST /email-registration/confirm` requires `confirm: true`, takes an optional `name`, and requires
continued account absence under the authority lock; it consumes proof and creates the verified account and session through Better Auth
and app-owned onboarding. Cancellation and new independent authentication discard old creation
proof. Replay, expiry, a racing account or a failed transaction cannot produce a partial account or
session. The web owns presentation and sealed return and entry intent, never identity decisions.

## Consequences

Separate entry routes add clarity without duplicating credential workflows, and a new account always
ends with a deliberate creation action. Existing accounts keep passkey, TOTP and recovery behaviour;
capture and invitations keep their shorter journeys.
