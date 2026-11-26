# ADR-0059: ntumie. product name and chosen domain

Status: Accepted
Date: 2026-10-12

## Context

The GoodLinks discovery clarified the product's emphasis on maintained guides,
but [ADR-0058](0058-curated-guides-positioning.md) left its final name open. Paul found a name in the everyday Swahili
request “nitumie link,” often written “ntumie link” in his conversations.
The domain `ntumie.link` carries that phrase into the address of a collection.

## Decision

The product name is **ntumie.**: lowercase, with the trailing dot, including in plain text. Keep
**“Good links belong together.”** as the slogan, and `ntumie.link` as the domain (Paul chose only
`.link`, though `.com` was also free).

The name applies everywhere: the app, emails, API display metadata, maintained documentation, and
`ntumie` for repository, checkout and package identifiers, including `@ntumie/*`. README and the
handbook introduce it as “formerly LinkHub”. The portfolio project lives in `ntumie.md` at
`/w/ntumie/`, with `/w/nslinkhub/` redirected; handbook chapters use `ntumie/` with redirects from
their former addresses.

This record first kept the `linkhub` repository and deferred branding, and ADR-0060 then applied
the name throughout; that record is folded in here.

## Consequences

Historical accounts keep LinkHub where it was the working name, and their chronology is not
rewritten; explain any legacy reference that remains in a record, a redirect or recorded narration,
and never manufacture a new recording by editing its transcript. Branding never changes origins,
credentials, schema, API fields, immutable IDs or durable collection addresses.

See [product positioning](../design-docs/product-positioning.md) for the naming story and the
collection's defining value.
