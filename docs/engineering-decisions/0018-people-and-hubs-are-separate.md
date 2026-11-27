# ADR-0018: People and hubs are separate identities

**Status:** accepted  
**Date:** 2026-10-08  
**Amends:** ADR-0001 (a hub is optional; still one per person, owned by them, never transferred).

A hub comes only with the person's first collection ([ADR-0069](0069-hubs-come-with-the-first-collection.md));
the sign-in and sign-up entries are [ADR-0044](0044-separate-sign-in-and-sign-up.md)'s. This record first let a
person create a hub explicitly, from their profile or before an import; ADR-0069 replaced that so no hub
exists empty.

## Context

Every account was a hub: the hub's handle was the person's identity, so
commenters, contributors and invited viewers appeared as hubs, and someone
invited to read one collection got a hub they never asked for. Yet the hub is
the face that owns and publishes everything, while people act — comment,
contribute, are invited by email.

## Options considered

- Keep the account and the hub as one identity (the hub's handle is the
  person's).
- Separate them, as a Google account and a YouTube channel, a Substack reader
  and a publication, or a GitHub user and their repositories are separate.

## Decision

A **person** (the account) has an **@username** and a name; a **hub** is their
optional publishing space, with its own **name** and **@handle**. A person has
at most one hub, created only together with their first collection, owned by them and
never transferred; the hub owns their collections and its subscribers.
People act as themselves: they comment, contribute and are invited by email to
view or contribute, with or without a hub. Others **subscribe to hubs**; people
aren't followed. Hubs live at `/@handle` and people at `/username` — two
namespaces, so a person may give their hub their username or another handle;
top-level usernames never take the app's own route names. Display, routes and
data: [people-and-hubs.md](../design-docs/people-and-hubs.md).

## Rationale

- Readers and collaborators don't need a hub; publishing does.
- A hub can be named and branded on its own; a comment is clearly the person.
- One social graph (subscriptions) instead of two.
- Leaves room for GitHub-style organizations later as another kind of hub
  owner, without reshaping people (ADR-0017 stays rejected for now).

## Constraints to preserve

- At most one hub per person; hubs and collections are owned, people are never
  owned. Hubs aren't transferred; collections are.
- Usernames and handles are separate namespaces with their own addresses
  (`/username`, `/@handle`); reserved words protect app routes; durable
  references use ids (ADR-0002).
- Contributors and viewers are people, never hubs; access never comes from a
  username or handle.

## Links

- [people-and-hubs.md](../design-docs/people-and-hubs.md)
- [ADR-0001](0001-drive-tenancy-model.md), [ADR-0002](0002-immutable-identities.md),
  [ADR-0017](0017-hubs-are-entities-with-members.md)

## Public relationship amendment — 2026-10-08

The visibility preference controls the public relationship, not profile-name
visibility: `Hub.showOwner` defaults true. The hub owns this setting; no
visibility preference is stored on User, because disclosure describes the hub’s
public relationship (a user-level name preference came first). Opt-out suppresses the profile's
hub and the hub's owner reference/name in public responses. Self-service access
and authorization remain unchanged. Profiles always show the person's name
when set and username. Contributors remain ordinary contributors; deciding
whether to expose a collection's contributor list is deferred.


## Personal bio addition — 2026-10-08

People may describe themselves with an optional public 500-character plain-text
bio stored on User. It is edited in Profile settings, available without a hub,
and independent of hub description and ownership visibility. This gives people
their own introduction while preserving the separate identities above.


## Import and bookmark boundary amendment — 2026-10-09

The product owner clarified that saving (bookmarking) a collection belongs to
the person, not their hub. Reading, bookmarks, viewer/contributor invitations,
comments and contributions never create or require a personal hub.

Imports are owner management. A new-collection import creates the missing hub with its
collection, atomically, like any first collection (ADR-0069). An existing target requires
collection ownership, not merely contribution access, even when the contributor owns another
hub. A hubless person's `/hub` invites them to start a collection, and no read ever creates a
hub. Client guidance never replaces backend target and ownership checks.

## Related identity records

Hub handles stay editable ([ADR-0042](0042-editable-hub-handles.md)), with 30 days between changes and
retired spellings never reused ([ADR-0043](0043-deliberate-hub-handle-changes.md)); person username rules
are separate. Account email is fixed ([ADR-0041](0041-fixed-account-email.md)). Self-service lifecycle is
[ADR-0033](0033-self-service-account-lifecycle.md)'s, with contextual recovery under
[ADR-0040](0040-contextual-account-recovery.md).
