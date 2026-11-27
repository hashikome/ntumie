# ADR-0012: Bulk import through reviewed drafts

**Status:** accepted  
**Date:** 2026-10-08

Destination visibility follows [ADR-0028](0028-free-public-curation-paid-private-sharing.md); hubs
follow [ADR-0069](0069-hubs-come-with-the-first-collection.md). Journey, statuses, folder mapping and
limits are the [bulk import design](../design-docs/bulk-import.md)'s.

## Context

Imports wrote every parsed row straight into one collection and reported
failures afterwards, keeping whatever title the file carried. That contradicted
resolved titles (ADR-0007), gave people no chance to fix or drop bad rows before
they landed, and forced a whole bookmarks tree into a single collection.

## Options considered

- One-shot import with a per-row report (the previous behaviour).
- Client-side preview that submits only the rows that pass.
- A server-side import draft, reviewed and then committed in steps.

## Decision

Bulk import is Save a link at scale. Imported links are staged in a server-side
draft owned by the account, checked by the same rules as any save, with titles
resolved in the background. Nothing is written straight into a collection from a
file.

- **Owner management.** Importing requires management authority over the
  destination, including when committing; contributors cannot import. A
  new-collection import creates the person's missing hub with it (ADR-0069).
- **Formats.** Browser bookmark HTML; CSV with exactly the columns
  `collection,section,url,tags`, which only creates new collections in the order
  written and never matches, appends to or updates existing content; and plain
  text with one URL per line. There is no inline paste.
- **Bookmark structure.** Browser wrapper folders are ignored. Meaningful roots
  and branching folders become collections with their own names, leaf folders
  become flat sections, and parent collections reference their children under
  [ADR-0047](0047-owner-scoped-collection-references.md), without nested sections or
  inherited permissions. A folder whose only content would be one child reference
  is skipped. Loose links need a named collection.
- **Collection drafts.** An upload produces one draft per collection. Its review
  repairs or removes rows; Import queues every ready link of that collection, and
  the worker saves them in batches, while rows that need attention wait for repair.
  A queued or running draft cannot be edited. Each new collection draft has a
  Published choice, on by default (ADR-0028); existing collections keep their
  publishing state.

## What it replaced

Imports first wrote every row straight into one collection. Along the way this
record also tried a generic `url,tags,folder` CSV, a section-description column,
a two-mode bookmark arrangement, a recursive collection graph and file-level row
selection; each gave way to the simpler rule above, most from the owner's own
1,115-bookmark Chrome export.

## Rationale

- One rule for every link that enters the product, whether one or a thousand.
- Mistakes are fixed before they reach a collection, not cleaned up after.
- Folder structure carries over as guides (sections) or splits into
  collections, so one browser export serves any arrangement.
- Network-bound title lookups never run inside the write lock or a request.

## Constraints to preserve

- No import path accepts a title; titles always come from the page.
- Nothing reaches a collection before the person chooses to import.
- Drafts are private to their account and expire; they hold only what the rows
  need (addresses, tags, folder paths, statuses), never page content.
- Destination writes go through the normal collection policy and write lock;
  importing is idempotent per row.

## Links

- [bulk-import.md](../design-docs/bulk-import.md)
- [ADR-0007](0007-resolved-titles-read-only-items.md), [ADR-0047](0047-owner-scoped-collection-references.md)
