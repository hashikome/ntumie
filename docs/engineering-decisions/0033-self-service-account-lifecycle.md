# ADR-0033: Self-service account lifecycle

Status: accepted (2026-10-10). Recovery presentation is refined by
[ADR-0040](0040-contextual-account-recovery.md); hub handles are
[ADR-0042](0042-editable-hub-handles.md) and [ADR-0043](0043-deliberate-hub-handle-changes.md).
Amends ADR-0023's operator-only lifecycle. Username rules in ADR-0026 remain unchanged.
This record first also made hub handles permanent once claimed; ADR-0042 replaced that
with editable handles, because the immutable hub ID already keeps references stable.

## Context

Deactivating an account must not misleadingly mean deleting its data, and a person
should be able to leave, pause and return without an operator.

## Decision

Self-deactivation is indefinite and reversible. It hides the profile and owned
collections, including from collaborators, and revokes sessions, service grants,
pending invitations and auth proofs. Data and collection sharing settings remain.
Self-reactivation restores content availability, never revoked sessions/grants.
Normal sign-in does not implicitly reactivate accounts.

Self-deletion is a separate command, confirmed by email code, with the existing
14-day grace period. Access stops immediately. Cancellation before the deadline
keeps data and leaves the account inactive; reactivation is another explicit action.
Final cleanup uses existing cascades and anonymization, preserving handle reservations.
Export and transfer advice precedes deletion; automatic whole-account export remains
future work. Administrators must relinquish their service role through existing
administration before self-deactivation/deletion.

An explicit `self_deactivated` marker distinguishes recoverable owner choices
from operator restrictions. Operator lifecycle changes clear it and invalidate
pending recovery through the operations version. Self-service cannot unsuspend
accounts, cancel operator-scheduled deletion, or cross the deletion deadline.

Web confirmations also bind the rendered form to its sealed flow ID and action;
a newer flow in another tab cannot silently replace the confirmed action.

All account codes use better-auth proof primitives, isolated from ordinary sign-in
and invitations, bound to action/account/version and the initiating session for
active-account actions. Wrong-code attempts commit. Successful verification and
mutation share one transaction and authority lock. Any temporary session created
by verification is revoked and never returned; recovery ends with fresh sign-in.

## Consequences

A person can pause or leave without help, and nothing an operator imposed can be undone
through self-service. Stable UUID-based links and authorization are unaffected.
