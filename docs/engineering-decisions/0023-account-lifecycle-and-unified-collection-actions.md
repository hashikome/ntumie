# ADR-0023: Account lifecycle and unified collection actions

- Status: Accepted
- Date: 2026-10-09
- Amends: ADR-0014's separate collection contexts and the original service-operations no-deletion boundary.

## Context

The user requested compact account and collection tables with actions determined
by the viewer's role, admin account deletion, and one Collections view instead of
My hub / Service. The PRD already specifies a 14-day account deletion grace period.

## Decision

The backend advertises available account actions. Operators deactivate, suspend
or reactivate ordinary accounts; admins may also schedule/cancel deletion of
non-admin accounts. Admin accounts and self-restriction/deletion remain protected.
Inactive means deliberately deactivated, not signed out. Disabling access revokes
sessions, grants and pending authorization proofs. Cancellation leaves the account
inactive; reactivation never restores revoked sessions or grants.

Admin deletion disables access immediately and schedules permanent removal after
14 days. Bounded maintenance rechecks the deadline under the same authority lock
as cancellation, removes owned data through existing cascades, anonymizes retained
contributions through SetNull relations, and records completion atomically.
Self-service lifecycle is [ADR-0033](0033-self-service-account-lifecycle.md)'s.

One paginated Collections projection combines owned and shared collections with
publicly readable collections and active holds for service operators. Search by
ID or collection URL is constrained by the same authority. Held private rows
contain moderation metadata only, never private titles or content. Owner actions
use existing collection policy; holding distribution remains a service capability.
A service grant never implies permission to edit, delete, publish or share access.

Clicking a collection row or its name opens a native modal action dialog; there is no
Action column. Each choice carries its final destination: View, Edit, History, Add a link,
Share and moderation detail navigate directly, and only publish, unpublish, transfer and
delete go through the collection action route's consequence forms. `/manage/collections`
replaced the former held-only list and link resolver. Owner controls use existing APIs with
explicit consequences before mutation. Collection readers get Share in the toolbar; copying a
URL does not grant access.

Clicking an account row opens its detail; the name is a plain-text native form button for
keyboard access, with no anchor, Select or Action column, toolbar or chooser dialog. Copy-ID
controls do not navigate. Detail shows the permitted action buttons at the bottom, and their
consequence and reason forms remain authoritative for mutations. (Row selection and an account
action dialog came first; the owner chose direct navigation.)

## Consequences

The tables become smaller without moving authorization into the client. Permanent
account cleanup is irreversible after the grace period and is covered by tests.
Collections retain their independent access model; no global private-content list
or operator ownership bypass is introduced. Bulk operations remain outside scope.
