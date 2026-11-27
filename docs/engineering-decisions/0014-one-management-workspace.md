# ADR-0014: One management workspace, scoped by role

**Status:** accepted
**Date:** 2026-10-08

Collections are one capability-scoped table ([ADR-0023](0023-account-lifecycle-and-unified-collection-actions.md))
and Audit is one log ([ADR-0024](0024-one-audit-log.md)); the current contract is
[Manage](../design-docs/manage-workspace.md). This record first kept owner and service workspaces
apart, then briefly kept `/ops` as the service console; the owner chose one workspace, because a
person who holds both authorities should not switch areas to do a task.

## Context

A person can own a hub and also administer or operate the service. Separate
workspaces make navigation depend on switching roles rather than the task.
Shared navigation must not collapse the authority boundary: service operators
cannot read private collections or manage someone else's hub.

## Decision

Use one **Manage** entry and route family at `/manage`. Sections and actions
follow the authenticated person's capabilities. Accounts concerns service-wide
accounts; People concerns current access to the owner's collections. Team lists
admins/operators; Invitations sends and tracks invitations in the applicable
context. Collections and Audit show what each capability allows in one view, with
no My hub / Service switch. Owner and service API contracts remain separate. The
owner-facing section is labelled **Access** (route `/manage/people`): it manages
granted access, while Accounts is the service-wide identity section.

Manage uses a shared desktop sidebar and a native collapsible menu on narrow
screens. A section with children (Import → New import, Review) expands without
navigating, and its children are the links; sections without children are direct
links, and the current section starts expanded. The working area holds one view,
headed by its title, with status filters kept with the table.

## Rationale

- One place for management, with consistent tables, actions and audit patterns.
- A person sees the union of capabilities they hold, without duplicate accounts.
- Hub owners manage their own content; service authority stays operational.

## Constraints to preserve

- The API authorizes every read and action; navigation is never a permission.
- Service sections never expose private titles or content (ADR-0009).
- Owner scope is derived from the authenticated user, never a requested hub ID.
- Only implemented capabilities appear. Owner invitation delivery, subscriptions,
  blocking and cross-collection moderation remain planned until their full
  authorized journeys are implemented.

## Links

- [Manage](../design-docs/manage-workspace.md)
- [ADR-0009](0009-operator-authority.md)
- [ADR-0013](0013-permission-roles-and-display-labels.md)
