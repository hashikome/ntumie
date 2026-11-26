# ADR-0042: Editable hub handles with stable hub identity

Status: accepted (2026-10-10). Retired spellings and the rename cadence are
[ADR-0043](0043-deliberate-hub-handle-changes.md). Replaces the permanent hub claim first
chosen in ADR-0033 and restores the mutable-handle direction of ADR-0002.

## Context

A person's hub may begin as an engineering toolkit and change purpose over the
years. Its name and handle should follow that purpose. Stable identity and shared
references already use the immutable hub UUID; permanent claiming unnecessarily
restricts expression without improving those references.

## Decision

Owners may change hub names and handles repeatedly through the validated profile
endpoint. Handles retain existing normalization, format, reserved-word and
uniqueness checks. No permanent claim state or confirmation is needed. Remove
`handleClaimedAt`, `confirmHandle`, claim errors, checkbox/claim UI and the SQL
permanence check. The migration drops obsolete claim metadata and replaces only
the reservation trigger function; IDs, content and grants remain untouched.

Shared hub links use `/h/<hubId>` and collection links use `/c/<collectionId>`,
so they survive renames. Which spellings stay retired is ADR-0043's.

Settings always offers an editable Handle field, availability feedback and an
explicit Save handle button, which avoids reserving intermediate text while someone
types. Save handle submits only the handle through its own native form; other
profile fields keep autosave and their no-JavaScript Save changes form, so a draft
handle is never saved implicitly and never blocks other edits. A pending handle save
locks that field until its confirmed value and cooldown arrive. Existing account email remains fixed (ADR-0041),
and immutable user/hub UUIDs remain outside generic mutation payloads.

## Verification

API tests cover repeated rename, unchanged UUID routes, no-op
audit behavior, collision races and cross-hub reservation protection including
after deletion. Migration acceptance upgrades a previously claimed hub and checks
schema parity. Browser checks exercise repeated changes and other hub edits with
and without JavaScript at mobile/desktop widths.
