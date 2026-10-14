# ADR-0068: Partner hub credit

Status: Accepted
Date: 2026-10-14

Narrows [ADR-0017](0017-hubs-are-entities-with-members.md) (rejected): that
record's rejection of hub memberships, shared hub ownership and hub transfer
stands. It does not prevent one hub from crediting another on a collection,
which this record allows.

## Context

Hubs that make a collection together (a gardener and an orchard keeper, a
teacher and a library) want both names on it and the collection on both hub
pages. Today a collection shows only its owning hub, and the only cross-hub
relationship is inviting people as contributors. "Collaborators" already names a
collection's viewers and contributors, so this needs a separate name.

## Options considered

- **Partner hub credit (chosen).** One hub owns the collection; another hub is
  credited as a partner once its owner accepts. No access changes.
- **Shared ownership.** Two hubs co-own a collection with owner rights. Reverses
  ADR-0001 and ADR-0017 and the one-owner rule in `ARCHITECTURE.md`; rejected
  for the same reasons ADR-0017 gives.
- **Nothing.** Keeps the model simple but hides real joint work.

## Decision

- A collection keeps exactly one owning hub (`hubId`). Its owner may invite other
  hubs, by hub, to be **partner hubs** on that collection.
- The invited hub's owner accepts before any credit appears. Either the owning
  hub or the partner hub can end the partnership at any time.
- A partner credit is display only. It grants no read or write access, makes no
  hub a member of another, and never survives as a path to private content.
  People from a partner hub edit only when invited as contributors on the
  collection.
- Credit reads "Owner hub with Partner hub" on the collection and its cards. The
  collection appears on the partner hub's Collections tab only while it is
  readable by the viewer, and both hubs list each other under Partners.
- Contributors on a collection may come from any hub; contributor lists are
  unchanged.

## Rationale

Credit is what joint curators need; ownership and access stay exactly as the
architecture defines them, so the policy service, transfer and deletion rules
are untouched.

## Constraints

- Partner listings follow the collection's visibility: a private or
  unpublished collection never appears on a partner hub's public page or counts.
- Transferring a collection keeps its partner credits; the new owning hub may
  end them. Deleting a collection ends them.
- Partner invitations, acceptance and removal are audited like other sharing
  actions.

## Links

- Design: the Round 2 "Hubs" board (Partners tab,
  partner collection, Edit › Partner hubs); implementation joins the cobalt
  redesign's later slices in
  [implement-cobalt-redesign.md](../exec-plans/active/implement-cobalt-redesign.md).
