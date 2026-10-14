# ADR-0069: Hubs come with the first collection

Status: Accepted
Date: 2026-10-14

Partially supersedes [ADR-0044](0044-explicit-auth-entry-and-optional-hub.md)
(the optional **Start with a hub** on account creation) and the explicit
**Create hub** action in [people and hubs](../design-docs/people-and-hubs.md)
and [ADR-0018](0018-people-and-hubs-are-separate.md)'s "created explicitly".
Everything else in those records stays binding: hubs remain optional, at most
one per person, never transferred, with the same handle rules.

## Context

A hub exists to keep collections. Today a person can create one at sign-up or
with Create hub and never add anything, which leaves empty public pages with a
claimed @handle and nothing to read. The owner wants no empty hubs.

## Options considered

- **Keep explicit creation.** Simple, but empty hubs keep accumulating.
- **Create the hub with the first collection (chosen).** Every new hub starts
  with something in it.
- **Hide empty hubs.** Avoids dead pages but still claims handles and adds a
  hidden state to every listing.

## Decision

- A hub is created only together with the person's first collection: starting a
  collection, a first saved link, accepting a collection transfer, or an import
  that creates a collection. Each is atomic: the hub and the collection are
  created together or not at all.
- Account creation (email or Google) no longer offers a hub. The API stops
  accepting a hub name at sign-up.
- There is no standalone Create hub action on `/hub`, the profile or Settings.
  Places that offered it invite the person to **start a collection** instead and
  say that their hub comes with it.
- The generated hub name and handle follow the existing rules (initial handle
  from the username, editable immediately).
- When the last collection leaves the hub (deleted or transferred away), the hub
  is **hidden**, never deleted. Its name, description, @handle and subscribers
  are kept. The next collection the person creates, by any path, uses the same
  hub and makes it visible again.
- Hidden is a hub status kept in step with the collections in the same
  transaction as the write that empties or refills the hub, so it can never
  disagree with the data.
- A hidden hub: visitors get the ordinary not-found response at `/@handle` and
  `/h/<id>`; it is left out of Discover, search, counts and profile bylines; its
  @handle stays reserved; subscribers keep their subscription, shown as
  "Currently unavailable" like a dormant save, and notifications resume with its
  next published collection. The owner sees the same Start a collection prompt,
  worded "your hub, @handle, comes back with it".

## Rationale

Tying the hub to its first collection removes empty hubs at the source, keeps
handles for people who use them, and turns every "create your hub" moment into
the product's real first step.

## Constraints

- Existing empty hubs are hidden by the same rule when it ships; no migration
  deletes a hub.
- Imports that create a collection also create the missing hub, replacing
  "imports never create a hub" in `PRODUCT.md` §5 (owner decision,
  14 October 2026).
- A hub is public only while it has at least one published collection (owner
  decision, 14 October 2026). With collections that are all private or
  link-shared, it behaves as hidden to everyone but its owner: not-found page,
  absent from Discover, search, counts and profile bylines. Shared collections
  stay reachable at their own addresses; only the hub page is withheld. The owner
  always sees their own hub.
- At most one hub per person; creation stays idempotent under concurrency.

## Links

- Design: Round 2 "Profiles" board (own profile: Start your first
  collection) and "Sign in and sign up" (confirm the new account, no hub).
- Implementation: [implement-cobalt-redesign.md](../exec-plans/active/implement-cobalt-redesign.md).
