# ADR-0072: The audit log leaves routine reads out by default

Status: Accepted
Date: 2026-11-13
Supersedes: ADR-0021's API default ("existing API callers without a view
continue to receive all events") and its Include read events checkbox.

## Context

ADR-0021 kept recorded reads one checkbox away on the Manage page, and let API
callers that named no view receive every event. In practice read events are
mostly noise: the log is for actions that change something. HashiNet settled
the same question (its ADR-0012) with an opt-in named `include=reads`, and the
owner chose that name for ntumie. as well, as `view=all` does not say what it
adds.

## Decision

- Reads are still recorded. The API leaves successful routine reads out unless
  a request asks with `include=reads`; denials stay in.
- The Manage page never asks, and has no switch for reads.
- An explicit read-action filter still finds those reads.
- The filter runs before pagination and is part of the cursor scope, as before.
- `view` is removed outright (ntumie. has no users; Pre-Deployment
  Compatibility).

## Consequences

A read is reached through the API for an investigation or an export, not from
the page. One parameter name now works across ntumie. and HashiNet.
