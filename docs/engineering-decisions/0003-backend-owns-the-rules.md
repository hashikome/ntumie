# ADR-0003: The backend owns the rules

**Status:** accepted  
**Date:** 2026-10-07

Web interaction is [ADR-0064](0064-client-navigation-and-interactive-forms.md)'s. This record first
also required every journey to work as a native form without JavaScript; ADR-0064 made JavaScript the
supported experience, with native forms kept only as fallbacks.

## Context

The web and the planned browser extension are delivery surfaces. Duplicating
rules in clients drifts.

## Options considered

- Client-side validation as the authority
- Backend-owned rules, with clients as delivery surfaces

## Decision

The API owns validation, authorization and derived state. Clients are
replaceable delivery surfaces whose checks give early feedback only. Web commands
go through the same-origin `/forms` boundary; the mechanics are in
[ARCHITECTURE.md](../../ARCHITECTURE.md) (Runtime Architecture) and the
[interface system](../design-docs/web-interface-system.md).

## Rationale

- One source of truth for rules; clients stay replaceable.

## Constraints to preserve

- UI hiding is never a security rule.
- Form posts accept only same-origin, URL-encoded bodies.
- Clients never import Prisma or API internals; raw `fetch` lives only in `lib/http.ts`.

## Links

- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [web-interface-system.md](../design-docs/web-interface-system.md)

## Shared request contracts (2026-10-09)

The existing web client consumes exported request types as well as response
shapes and backend-provided capabilities. Constructed payloads use shared input
types; decorated API DTOs implement them. Exact typecheck assertions cover DTO
keys and types, including optional fields, to catch drift such as commentsEnabled
being accepted by the backend but missing from UpdateCollectionRequest.

This shares the wire vocabulary, not business logic. API DTOs/services still own
runtime validation, authorization and transitions. Form state and untrusted
transport input are not wire contracts; keep adaptation explicit and never use a
type assertion to pretend optional share-open metadata has already been validated.
No generated client or shared runtime domain engine is introduced.
