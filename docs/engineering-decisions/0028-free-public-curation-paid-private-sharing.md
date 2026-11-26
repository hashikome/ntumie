# ADR-0028: Free public curation and paid private sharing

**Status:** accepted; published creation defaults implemented, billing and entitlements pending

**Date:** 2026-10-10

## Context

The product owner wants more useful collections on the platform and fewer obstacles
to bringing existing libraries across. He explicitly confirmed free bookmarks/CSV
imports, paid AI curation and DOCX import, public collections by default, limited
free private storage and paid private sharing. This replaces the exploratory
packaging captured earlier in the founder conversation.

## Decision

- Public collections are free, public by default on creation, and have no
  collection-count paywall. Public link sharing and contributor invitations are free.
- People can explicitly choose private collections within a free allowance of
  three (`FREE_PRIVATE_COLLECTIONS`); larger paid allowances remain to be set.
- Free private collections are owner-only. Both private access links and direct
  invitations require the collection owner's paid entitlement, for viewers and
  contributors alike. A contributor invitation cannot bypass the private-sharing gate.
- When the owner pays for private sharing, viewers and contributors can be invited
  without buying plans themselves. Their existing collection permissions still apply;
  contributors cannot manage the hub, import, publish or manage access.
- Browser bookmarks and CSV import remain free. AI curation and DOCX document import
  are paid convenience features. A Google Doc exported as `.docx` is a DOCX input;
  this does not commit to a Google account connector. DOCX import is paid even if
  extraction uses no AI; AI organization is paid even when its input is free CSV.
- Paid link-health monitoring, including owner-approved redirect updates, is
  added by [ADR-0029](0029-link-health-and-approved-redirects.md).
- AI proposes reviewable drafts. People approve the actual import. Drafts are not
  public collections; new committed collections default to public with the visibility
  choice clearly shown before submission. Importing into an existing collection
  preserves that collection's visibility.

This replaced ADR-0016, which kept everyday private sharing free and framed paid
features as a professional "Curator account"; the owner chose to charge for private
sharing and conveniences instead, so public curation stays free for everyone. It also
replaced the private-by-default creation direction in earlier capture and import
designs, including ADR-0012's import-destination default. These changes are
prospective: no existing private collection is automatically published.

## Constraints kept from ADR-0016

- Nothing free today moves behind payment without a new decision.
- Payment never changes the access model: members-only or paid access goes through
  the collection policy like every other grant.
- Analytics count in aggregate and never track individual readers.
- API access acts as the account through the same authorization; keys are scoped and
  revocable, never a privileged path. Higher rate limits are a plan setting, never an
  exemption from them.
- AI curation proposes; people decide. Its results arrive as a reviewable draft
  (ADR-0012) and never rewrite titles (ADR-0007).

## Backend consequences

Entitlements are additional prerequisites, never access grants or extra roles.
The backend enforces private quotas and owner entitlements on every client path.
Public-to-private changes must check both quota and any existing invitations or
link grants atomically: a free owner cannot invite contributors while public and
then retain their private access after switching visibility. The same rule applies
to transfers, invitation acceptance, link use and entitlement expiry. Read policy
must not leave a stale grant as a way around the paid private-sharing boundary.

Specify grant suspension/revocation, grace periods and over-limit behavior before
shipping billing. Preserve owner reading, export and deletion; never force public
visibility or delete content because a plan expires. Public creation and sharing
still obey independent abuse, request and operational limits; “unlimited public
collections” is not unbounded infrastructure access.

## Rationale and remaining decisions

Free collection creation, ordinary imports and public collaboration encourage
people to build and share guides. Paid document processing and AI save additional
manual work; paid private sharing supports a distinct ongoing use. Charging the
owner keeps invited participants from becoming a second purchase barrier.

Prices, billing cadence, paid allowance counts, processing budgets, provider,
downgrade/grace rules and final paid-plan naming remain open. Selling readers
access to a curator's content is a separate uncommitted marketplace idea, not
what “paid private sharing” means here.

## References

- [Monetization design](../design-docs/monetization.md)
- [Bulk import](../design-docs/bulk-import.md)
- [Delivery plan](../exec-plans/active/evaluate-curation-and-paid-services.md)
