# Implement the cobalt redesign (Track W3, phase 1)

This ExecPlan is a living document. Maintain it according to `PLANS.md`.
Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and
`Outcomes & Retrospective` current as work proceeds.

## Purpose / Big Picture

After this plan, a signed-out visitor can land on the redesigned home page,
press **Start a collection**, name one idea, paste its first link, confirm their
email once and arrive in a live collection that tells them what to do next. The
same visitor can sign in or create an account on redesigned screens, read any
collection in the new reader, save further links through one dialog, and edit
their collection in one workspace. Light and dark both use the locked cobalt
tokens in `DESIGN.md` ([ADR-0067](../../engineering-decisions/0067-cobalt-visual-system.md)).

Observe it by running the app locally (`docs/runbooks/local-development.md`),
walking home → Start a collection → code → landed collection → Edit, in both
appearances and at 375 px and 1440 px wide.

Phase 2, a separate plan written once this one ships, carries the same system
to every surface not redesigned here: the avatar account menu, Share and
invitations, notifications, Settings and account, Support and Manage.

Designed in final state but built after this plan, each as its own slice:
Discover search (hubs and collections) and popular-tag filters (`PRODUCT.md`
§6.6), Discover sections and tabs (Everything, Popular this month by saves and
subscriptions over 30 days, Newest, Hubs with hub cards and Subscribe), hub search,
subscriptions with per-hub bells and the Subscriptions tab, hub subscriber and
collection-save counts, saving collections (Save on a collection and the Saved
tab; the API exists), Shared with me (API exists), Join a community and the Communities tab
(ADR-0050, paid curators), partner hub credit and the hub Partners tab
([ADR-0068](../../engineering-decisions/0068-partner-hub-credit.md)), hub
Communities and Contributors tabs, public profile tabs for saves, subscriptions and
communities (opt-in), and private-collection allowances (monetization).

## Progress

- [x] (2026-10-14 21:30Z) Locked the visual system: ADR-0067, `DESIGN.md`
  tokens and contrast evidence (commit `57c934d`); design-audit lock passed with
  no P0–P2 findings.
- [x] (2026-10-14 21:30Z) Approved the Round 2 boards and the three Start a
  collection product changes (owner, 14 October 2026); recorded in `PRODUCT.md`
  §6.1 with this plan.
- [ ] M1 Tokens and shared primitives (completed 2026-10-14: `@theme` from
  DESIGN.md with legacy `--text-row`/`--radius-tag` aliases, blue text moved to
  `link`, pill buttons at 40 px with 32 px text buttons and 44 px coarse,
  fields with 12 px radius and focus glow, shared elevation (the 80rem shell waits for M3/M4),
  header with Discover, About, Sign in and Start a collection (to `/capture`
  until M5); remaining: segmented filter, radio cards and Component-states
  coverage, applied as each screen is rebuilt).
- [x] (2026-10-14 22:40Z) Designed Discover (browse, search results, no
  results), the hub homepage for visitors and owners (Your home tabs, Saved,
  Subscriptions, no hub) and the person profile, in final state.
- [x] (2026-10-15) M3b first pass (`fe5c251`): Discover cards, hub band and
  rows, profiles with contribution summaries, Start a collection prompt, API
  hub mark, footer removed.
- [x] (2026-10-15) M3b completion (owner, 15 October 2026: ship the full screens; build
  small gaps now, fake-door big ones). Build now: save counts on cards and the
  hub's collection saves; Discover tabs (Everything, Popular, Newest, Hubs),
  Popular this month (saves over 30 days), Hubs worth subscribing to (hub
  listing API), See all links; popular tags and tag filtering; hub
  Contributors tab; owner Shared with me and Saved tabs; profile Saved tab by
  choice with its Show what you follow toggle. Fake doors (record interest in
  `feature_interest`, say it is on the way): search, Subscribe, Join a
  community, hub Communities and Partners tabs, owner Subscriptions and
  Communities tabs, the Subscriptions and Communities toggles. Subscriber
  counts stay hidden until subscriptions exist.
- [x] (2026-10-15) M2 Backend contracts: link notes (create, edit, clear;
  links only; 280), comment `sectionId`/`itemId` with scope refs on reads and a
  2,000-character limit (matching the DB CHECK), `newCollectionPublished` on the
  account and session (capture defaults to it and remembers explicit choices),
  trigger-maintained hub `collection_count`/`published_collection_count`, public
  hub pages and profile bylines only with a published collection (owner
  excepted), and imports creating the missing hub. Migrations
  `20261014220000_redesign_notes_comment_scope_hub_counts` and
  `20261014221000_hub_updated_at_ignores_counts`; spec
  `apps/api/test/redesign-contracts.e2e.spec.ts`.
- [x] (2026-10-15) M3 Home and About: cobalt band pages with the header
  joining the band (`body:has(.brand-page)`), the route diagram (wide and
  phone), "How to read a collection" from the real preview with numbered
  annotation markers, the three ideas, Guides worth following from Discover,
  About's saved-and-forgotten visual, steps and help cards; the kitchen-garden
  fixture (8 verified links, descriptions from page metadata) replaces Ada's and
  the About collection; the typing questions are gone. Browser tests updated.
- [ ] To document in the docs-cleanup pass (owner: implement first, document
  later): home/About copy and structure (supersedes parts of ADR-0063 and
  `web-product-experience.md` landing text), removal of the About collection and
  its `/about?item=` links, landing questions removed, header About link and
  Start a collection; the Guides worth following ranking (completeness, then
  saves, then latest update; owner decision 15 October 2026) in `PRODUCT.md`
  Discover requirements; the footer removal (supersedes ADR-0063's footer
  link); the API hub mark (DESIGN.md palette and an ADR); Discover, hub and
  profile layouts (`web-product-experience.md`, PRODUCT.md §6.6). From M5:
  the registration contract (`email-registration/confirm` and
  `google-connection/register` take an optional `name`, no longer `hubName`;
  the Google preview returns `name`) in the auth design docs and ADR-0069's
  follow-up; `/start` (and `/start/<id>` drafts) as the first-collection route
  with `/capture` forwarding signed-out visitors; docs that still describe
  "Start with a hub" at sign-up or "Save your first link"; the code screen's
  "It works for five minutes" (the boards say 10; codes expire after 300 s).
- [x] (2026-10-22) M4 Collection reader (desktop and phone), to the "Collection",
  "Discussion: comment states" and phone boards: full-width page with the hub
  tree sidebar (sections follow the reading position; Search this hub is a fake
  door), cobalt band (crumb on phones, tags then "+N more", contributor stack,
  "Updated · N sections · N resources", Share and Edit), sections that read
  straight through (no folding; sticky chips on phones), open items with the
  note card, "Added by … on …", Copy link and Discuss, the Next in hub card and
  "Made with ntumie.", and a sticky Discussion with All / Answered, a one-line
  prompt that opens in place, avatars, "On <section>", About (follows the
  section in view), the attached item and a counter near 2,000. Backend: one
  `GET /collections/:id/outline` read (hub, collections in order with
  sections, next; visitors see published ones plus the current), discussion
  `total` / `answered` counts and `?answered=true`, collection section and
  resource counts. Fixed the copied-item reload that sometimes landed closed:
  `replaceState` now passes null state so Next.js keeps its router in sync.
- [x] (2026-10-28) M5 Start a collection, sign in and sign up, to the "Start a
  collection", "Landed in the new collection", "Sign in and create an account"
  and phone journey boards. `/start` keeps the draft (name, first link with its
  title preview, note, Published/Private radio cards) in the encrypted draft
  cookie across the three steps, with the step bar and an editable summary;
  signed in it creates straight away. The code screen has six boxes over one
  real input, "Resend in m:ss" and the board's mismatch error. The new
  collection lands with "Collection created", the live panel, "+ Add a
  description", owner meta (published state, no "0 sections"), the owner's empty
  discussion text, "Add a note" on the item, and "Keep building it" until three
  links or a section. Auth screens use one 400 px column under the cobalt header
  (520 px for Start). Sign-up asks for an optional name and never creates a hub;
  the API rejects `hubName`. Deviations the owner has not yet ruled on: the
  Private card omits "[N] private collections" (no data source); "five minutes"
  instead of 10; sign-up keeps a "Confirm your email / Send code" step and the
  passkey step shows for every address (it cannot know which have passkeys
  without revealing accounts); the owner's item keeps Discuss beside "Add a
  note" and the passkey step keeps "Use a different email" (the boards omit
  both). `start` is now a reserved username and top-level path.
- [x] (2026-10-28) M5b Free private allowance (owner decision: 3), backend and
  screens together. `FREE_PRIVATE_COLLECTIONS` (default 3; test runners raise
  it) is enforced in one place (`private-allowance.ts`, hub row lock) on create,
  Start and Save a link, edit/unpublish to private, transfer (recipient) and
  queued private imports; existing over-limit collections are kept; nothing is
  ever published or deleted to make room. `GET /collections/private-allowance`
  (signed out: the limit). Screens: Start's Private card ("Free accounts
  include 3 private collections." / "N of 3 left" / at the limit disabled with
  "Make one public" and a "More private collections" fake door,
  `private_collections`), Save a link, the unpublish confirmation and import
  review; every path maps `private_allowance_reached` to a plain message.
- [x] (2026-10-28) Board fidelity pass (design-audit, then design-build): boards
  now kept locally in `ref/boards/` (rendered light/dark). Fixed: an opened item
  no longer scrolls the page past the title when it already starts near the
  top; "+ Add a description" semibold 40 px with space before the person row;
  item titles read across the column (no balanced wrapping); comment avatars at
  their size (the base `flex` basis overrode it) so answer heads stay on one
  line, with the answer's time kept for screen readers only; recent adds read
  "just now"; phone "Keep building it" is two full-width buttons and the live
  panel stacks; Discover and the reader leave out a zero section count. Found
  by the tests: Discuss on a second link kept the first link's section in
  "About" (the select now remounts per attached item).
- [ ] Passkeys in email autofill (owner decision): WebAuthn conditional UI on
  the sign-in email field plus a "Sign in with a passkey" link; after the email,
  straight to the code (drop the per-address passkey step and sign-up's extra
  "Confirm your email" step). Passkeys are already discoverable
  (`residentKey: required`); the unbound (no email) authentication path needs
  its own security review and tests.
- [ ] Search plan (own milestone): the Discover search results board (hubs and
  collections for a query, tag filters, best match, no-results state) has no
  backend; write the ExecPlan before building.
- [ ] M6 Save a link dialog and the Edit workspace.
- [ ] M7 Audit, browser acceptance, docs and release (push only here).

## Surprises & Discoveries

- Observation: link notes are designed in every save and item view but are not
  built (`PRODUCT.md` §6.4 "preview cards and notes Planned").
  Evidence: §11 Delivery row "6.4 Preview cards, notes — Planned".
- Observation: private-collection quotas do not exist yet; the boards' "[N] of
  [N] free private collections left" has no data source.
  Evidence: `docs/design-docs/monetization.md` "Billing, entitlements and
  private quotas are not yet implemented."
- Observation: the browser test "reader polish keeps tags, hierarchy and touch
  controls usable without JavaScript too" fails before any redesign change: at
  390 px with touch, `.comment-compose > summary` is "not visible" when tapped.
  Resolved in M4 (`dd25e6e`): the rebuilt discussion opens in place, Cancel
  closes it, and touch targets are 44 px on coarse pointers.
  Evidence: fails identically on commit `f893576` with the M1 web changes
  stashed (`bun tooling/verify-browser.ts --test-name-pattern 'reader polish keeps'`).
- Observation: "opens items beyond the first page at the ID address, preserves
  access and toggles inline (true)" fails intermittently before any M3 change:
  after `page.reload()` on a copied `?item=…#item-…` address, the item's details
  stay closed. Resolved in M4 (`dd25e6e`): `history.replaceState` passed Next.js
  its own state back, so its router kept (and later restored) the address
  without `?item=`; passing `null` lets it sync. 6/6 repeats green after.
  Evidence: 15 October 2026, six repeats each: 2/6 failed with the M3 web
  changes, 1/6 failed with them stashed, all at the same step and with the same
  error (`.item-context` "hidden").
- Observation: M1's first full browser run found four regressions, all fixed:
  the 80rem shell broke the landing/footer alignment test (shell width moved to
  the screen milestones), pill buttons overflowed at 200% zoom (labels now wrap
  except in the header), and the contrast test still expected `primary` as
  text (now checks `link` on canvas and `on-primary` on `primary`).
  Evidence: 107/114 pass, then 4/5 of the failing five pass after the fixes.
- Observation: comments accept 2,000 characters in three places: the API DTOs,
  the web form and a database CHECK.
  Evidence: `apps/api/src/modules/comments/dto/comment.dto.ts` `@MaxLength(2000)`;
  `apps/web/src/components/comments.tsx` `maxLength={2000}`;
  `0_init` migration `collection_comments_body_check` (≤ 2000).
- Observation: capture already accepts a collection name and a `new`
  destination; the `first` destination refuses accounts that already own
  collections (`capture_destination_required`).
  Evidence: `apps/api/src/modules/collections/capture.service.ts`.

## Decision Log

- Decision (owner, 15 October 2026): a hub's picture is a generated mark
  only: four tiles from a fixed palette, seeded by the hub's immutable ID,
  served by the API at `GET /api/v1/hubs/:hubId/avatar` like person avatars,
  so no client reimplements it and no media is stored. Gravatar stays for
  people: most owners have one email, and Gravatar pictures people, not hubs.
  Pasted image URLs and fetched favicons are out (visitor IP leaks, breakage,
  caching third-party media).
- Decision (owner, 15 October 2026): no site footer. No board has one and
  About now sits in the header, so the footer's single About / Join link
  (ADR-0063) is removed.

- Decision: Start a collection replaces Save your first link. The visitor names
  the collection; a blank name falls back to the dated default ("Saved links,
  7 Oct"). Starting always creates a new collection, for new and existing
  accounts alike. The flow takes one first link, plus an optional note and the
  visibility choice (Published by default).
  Rationale: the button promises a new collection, naming the idea is the
  product's core habit, and one link keeps the first step short.
  Date/Author: 2026-10-14 / owner (Paul John), recorded by Claude
- Decision: Implement the model screens before any push; the docs-only commits
  `57c934d` and `9881514` ride with the first implementation push.
  Rationale: avoids shipping docs that disagree with production.
  Date/Author: 2026-10-14 / owner
- Decision: Boards show the final product with every planned feature (search,
  tag filters, subscriptions and bells, hub counts, collection saves, Join a
  community, private allowances). Build order is chosen per milestone; a
  feature's controls ship only with the feature, never as dead UI.
  Rationale: owner direction (14 October 2026): design once for the target and
  avoid redesign rounds; shipping partial controls would still mislead.
  Date/Author: 2026-10-14 / owner, recorded by Claude
- Decision: Comments stay at 2,000 characters for new and edited comments, the
  same as the database CHECK; the composer shows its counter only past about 80%.
  Rationale: owner choice (15 October 2026) after comparing uses: answers in the
  question-and-answer thread need room for a few steps or a short snippet, and
  there is no separate answer field. Supersedes the 14 October choice of 1,000.
  Date/Author: 2026-10-15 / owner, recorded by Claude
- Decision: Person profiles get opt-in tabs for Saved collections,
  Subscriptions and Communities joined, each off by default and switched in
  Settings → Profile; Contributions always show. Your home adds a Communities tab
  (memberships and pending requests). This supersedes "saved collections stay
  private" in `docs/design-docs/people-and-hubs.md` only for people who opt in;
  update that doc and `PRODUCT.md` §6.11 when the slice is built. Dormant saves
  and private collections never appear publicly.
  Rationale: owner direction (14 October 2026): a profile should be useful before
  someone curates. Defaults stay private, so nobody's reading habits are exposed
  without their choice.
  Date/Author: 2026-10-14 / owner, recorded by Claude
- Decision: Hubs that make a collection together use partner credit (ADR-0068):
  one owning hub, partner hubs credited after acceptance, no access granted.
  The hub page gains Collections, Communities, Contributors and Partners tabs.
  Rationale: owner choice (14 October 2026) over shared ownership, which would
  reverse ADR-0001/0017.
  Date/Author: 2026-10-14 / owner, recorded by Claude
- Decision: No empty hubs (ADR-0069). A hub is created only with the first
  collection; sign-up drops Start with a hub, and Create hub on `/hub`, the
  profile and Settings becomes "Start a collection; your hub comes with it".
  When the last collection leaves, the hub is hidden (status kept in step with
  its collections), not deleted; the next collection brings it back. Imports
  that create a collection create the hub too. A hub is public only while it
  has at least one published collection; otherwise only its owner sees it.
  Rationale: owner direction (14 October 2026): hubs exist to keep collections.
  Date/Author: 2026-10-14 / owner, recorded by Claude
- Decision: Hub counts are maintained by a database trigger on collections
  (insert, delete, hub or publication change), and hub `updated_at` ignores
  count-only updates through a dedicated `set_hub_updated_at` trigger.
  Rationale: every write path (capture, create, import, transfer, deletion)
  stays correct without each remembering to update the hub; counts are derived
  data, not hub edits.
  Date/Author: 2026-10-15 / Claude
- Decision: The public hub page is not found unless the hub has an available
  published collection, except for its signed-in owner; imports create the hub
  when a draft is created (hidden until a collection is committed).
  Rationale: ADR-0069; a draft is tied to a hub, and a hidden empty hub is
  reused by the person's next collection.
  Date/Author: 2026-10-15 / Claude
- Decision: Local migration history was not reset; the new migrations applied
  with `migrate deploy`, keeping local data (the old checksum mismatch remains in
  the tech-debt tracker).
  Date/Author: 2026-10-15 / Claude
- Decision: Implement phase 1 before designing the remaining surfaces. Discover,
  the hub homepage (visitor and owner) and the person profile were designed in
  final state on 14 October 2026 and join phase 1.
  Rationale: the core journey is fully designed; the other surfaces mostly reuse
  built components; building first tests the tokens on real data.
  Date/Author: 2026-10-14 / Claude (recommended; owner to confirm)

## Outcomes & Retrospective

Not started.

## Context And Orientation

Terms:

- **Round 2 boards**: the approved mockups on the private design canvas
  (`https://claude.ai/artifact/UQxnRkDfyWGvgew6br21d4`, page "Round 2"). They
  are reference only; this plan and `DESIGN.md` are authoritative. Boards:
  Home, About, Collection, Collection phone, Save a link (desktop and phone),
  Discussion comment states (desktop and phone), Component states, Start a
  collection, Start a collection landed, Sign in and sign up, Journey phone,
  Edit collection, Discover, Hubs, Profiles, Component states and Design tokens; the page is arranged in seven journeys, desktop above phone.
- **Band**: the full-width cobalt (`primary`) block carrying the header and
  hero on home and About, and the title area of a collection.
- **Fill vs link**: `primary` colors filled surfaces with `on-primary` text;
  `link` colors blue text. They are equal in light and differ in dark.

Current system:

- Tokens live in `apps/web/src/app/globals.css` (2026-10-07 palette). `DESIGN.md`
  now holds the target `@theme` block. The tech-debt row "Design tokens ahead of
  code" tracks the gap.
- Shared UI: `apps/web/src/components/primitives.tsx` (buttons, fields),
  `app-navigation.tsx` and `session-nav.tsx` (header), `account-menu.tsx`,
  `site-footer.tsx`, `toast.tsx`, `feedback.tsx`.
- Home and About: `apps/web/src/app/page.tsx`, `landing-hero.tsx`,
  `landing-questions.tsx`, `collection-example.tsx` (fictional fixture with real
  links), `about-collection.tsx`, `collection-preview.tsx`.
- Reader: `apps/web/src/app/c/[id]/page.tsx`, `collection-reader.tsx`,
  `collection-heading.tsx`, `collection-sidebar.tsx`, `resource-sections.tsx`,
  `item-details.tsx`, `item-disclosure.tsx`, `comments.tsx`,
  `collection-contributors.tsx`.
- Saving: `/capture` (`capture-form.tsx`, `capture-links.tsx`) and the API
  `apps/api/src/modules/collections/capture.service.ts`.
- Sign-in and sign-up: `apps/web/src/app/sign-in/*`, `sign-up/*`,
  `auth-entry.tsx`, `verification.tsx`, `resend-code.tsx`, `passkey-button.tsx`,
  `google-sign-in.tsx`, `signup-hub.tsx`, `apps/web/src/lib/verification.ts`, and
  the form router `apps/web/src/app/forms/[action]/route.ts` (purpose
  `first-link`).
- Editing: `/c/[id]/edit` (`collection-editor.tsx`), `/sections`
  (`section-editor.tsx`), `/reorder` (`reorder-items.tsx`), `/actions`
  (publish, transfer, delete).
- Comments API: `apps/api/src/modules/comments/`.

Rules that bind this work: `AGENTS.md` invariants (backend owns rules, `hubId`
not handles, clients never import Prisma), `docs/runbooks/migrations.md`
(create-only migrations), `docs/design-docs/web-interface-system.md` (states,
focus, toasts use the page surface), and `docs/SECURITY.md`.

## Plan Of Work

**M1 Tokens and shared primitives.** Replace the `@theme` block in
`globals.css` with the one in `DESIGN.md`, keeping utility names that already
exist (`canvas`, `surface`, `ink`, `muted`, `border`, `divider`, `primary*`,
`focus`, feedback) and adding `link`, `on-primary-muted`, `band-overlay`,
`annotation`, `scrim`, new type roles and radii. Move every blue text use from
`primary` to `link`. Rebuild buttons as pills (primary, secondary, text) with
hover, pressed, focus, disabled and pending states from the Component states
board; fields at 40 px (44 px coarse) with the focus glow; segmented filter;
radio cards. Header: signed out shows Discover, About, Sign in and **Start a
collection** (inside the band on home and About); signed in shows Discover,
About, **Save a link** and the avatar. Below 520 px the signed-out header drops
Start a collection. Footer unchanged. Remove the `light-dark()` pale-primary
assumptions in components. Update the interface-system doc where it states
shipped sizes.

**M2 Backend contracts.** All create-only Prisma migrations with review.
(a) Notes: an optional `note` (≤ 280 characters) on collection items, written by
owners and contributors on capture and edit, returned on item reads; history
records note changes. Update `PRODUCT.md` §6.4 status. (b) Section-tied
comments: an optional `sectionId` on top-level comments (replies inherit their
parent's), validated to belong to the same collection; an optional `itemId`
attachment, validated likewise. Filtering "Answered" uses the existing answer
mark. `CreateCommentDto` and `UpdateCommentDto` use the shared `maxCommentLength`
(2,000) and the web `maxLength` matches, with an API e2e case for 2,001
characters. (c) Remembered visibility: store the last explicit new-collection
visibility choice on the account; the save dialog and Start a collection
default to it, falling back to Published. (d) Named first collection: Start a
collection sends `destination: new` with a name for every account; a blank name
uses `defaultTitle`. Retire the `first` destination only after the web stops
using it, keeping replay of completed receipts. Add API e2e coverage for each.

**M3 Home and About.** Rebuild the home hero (band, headline "Good links belong
together.", Start a collection and Read a guide, route visual with a vertical
phone version), "How to read a collection" as real HTML (the
`CollectionPreview` of the kitchen-garden fixture with four annotation callouts
in `annotation` orange; numbered key on phones), the three ideas (ink
headings), and "Guides worth following" as cards from Discover data. Rebuild
`collection-example.tsx` as the "Starting a kitchen garden" fixture using the
eight verified links listed in Artifacts. About: band hero "A guide is more
than a pile of links.", the saved-and-forgotten visual, three steps, Support
and maker cards. Update `web-product-experience.md` landing copy.

**M3b Discover, hub homepage and person profile.** Restyle `/discover`
(band with title, newest-collection cards with tags, hub, section/resource
counts, Show more collections), the public hub at `/@handle` and `/h/<id>`
(band with hub avatar, name, "@handle by Owner", description, Share,
Published collections cards), the owner's hub (same band plus View as a
visitor and Hub settings; My collections rows with Published/Private/Link
sharing pills and contributor avatars), `/hub` with no hub (Start a collection prompt, no Create hub), and the
person profile at `/username` (avatar, name, "username of Hub", bio, Public
contributions rows with the hub and what they did, own-profile Start your first
collection prompt). Remove the explicit hub-creation endpoint's web callers
(ADR-0069). Use
`public-hub.tsx`, `owned-hub.tsx`, `person-profile.tsx` and
`app/discover/page.tsx`. Controls for unbuilt features stay out until their
slice lands.

**M4 Collection reader.** Band title area (crumb, title, description, up to
three tags then +N, contributor avatars, stats, Share and Edit for editors),
sidebar with hub row and collection tree (no search box yet), sections with
descriptions, one expanded item at a time (description, then note with the
adder's avatar and username, "Added by … on …", Copy link to this item,
Discuss), Discussion panel (All / Answered filter, Ask field, avatar headers,
"On <section>" links), next-guide card, "Made with ntumie." line. Phone: band,
section chips, full-width actions, 44 px targets. Keep existing URL contracts
(`?item=`, anchors) and pagination behavior.

**M5 Start a collection, sign in and sign up.** Replace the home first-link form
with the three-step Start a collection flow (collection → email → code) that
keeps the draft visible with Edit, then lands on the new collection with the
"Collection created" toast, the "It is live at …" panel and "Keep building it"
(Save the next link, Add a section, Share) until the collection has three links
or a section. Restyle sign-in, code, passkey, second factor, create account (no hub
option, per ADR-0069; the API stops accepting `hubName` at sign-up), no-account
and Google-confirmation screens to the boards
without changing their behavior or copy rules in `PRODUCT.md` §6.11.

**M6 Save a link and Edit.** One Save a link dialog (desktop) and full-height
sheet (phone): link with title preview, collection picker with "New
collection…" first, section, tags, note; a new collection adds name and
visibility. Edit workspace at `/c/<id>/edit`: details panel (Save changes), links
and sections list (drag plus Move up/down, "Start a section here", inline
section form, per-item menu: edit note, remove), side panels (Who can see it,
Sharing, Transfer, Delete). Contributors see only links and sections.
`/sections`, `/reorder` and `/actions` stay as no-JavaScript fallbacks and
redirect targets until removed in a later change.

**M7 Audit and release.** Run design-audit `audit` on every changed route in
light and dark at 375 and 1280 px; fix P0–P2. Update browser tests for changed
journeys. Update `CHANGELOG.md`, `PRODUCT.md` §11, the interface and experience
design docs, remove the tech-debt row, move this plan to `completed/`, then
push (with `57c934d`, `9881514`).

## Concrete Steps

From the repository root:

    bun install
    bun run infra:up                  # PostgreSQL, Redis, mail capture
    cd apps/api && bunx prisma migrate dev --create-only --name <name>   # M2, then review SQL
    cd ../.. && bun run verify        # after every milestone; expect exit 0
    bun run api:test:e2e              # M2 onward; new specs pass
    bun run test:browser              # M3 onward; updated journeys pass
    node ~/.claude/skills/design-audit/scripts/detect.mjs --json <saved page html>   # M7

Expected: `bun run verify` ends with the web typecheck "Exited with code 0";
browser tests report no failures.

## Validation And Acceptance

- A signed-out visitor completes Start a collection in three steps and lands in
  a published collection named as typed, containing the link and note; leaving
  the name blank yields the dated default; an existing account gets a new
  collection, never a destination prompt. Covered by API e2e and a browser test.
- Sign-in, sign-up, passkey, second-factor, no-account and Google-confirmation
  journeys behave exactly as before (existing browser tests pass unchanged in
  intent).
- Notes (≤ 280) save and render; section-tied comments show "On <section>" and
  filter by Answered; the last visibility choice is preselected next time.
- Every text/background pair in both themes meets 4.5:1 and every control
  boundary and focus ring 3:1 (computed in the browser); no horizontal scroll at
  360 px; touch targets ≥ 44 px on coarse pointers; no text under 14 px.
- design-audit reports no P0–P2 on changed routes; off-token values are drift.

## Idempotence And Recovery

Front-end milestones are safe to repeat. Migrations are additive (nullable
columns, new preference column) and created with `--create-only`; never accept
an auto-generated diff that drops `app_uuid_v7()`, triggers, CHECKs or partial
indexes. If a milestone is half done, the previous screens keep working because
routes and API contracts are only extended until M6/M7 retire them. The
`first` capture destination stays readable for receipt replay.

## Artifacts And Notes

Verified kitchen-garden links for the home and About fixture (checked
14 October 2026; each loaded without redirect and matched its title):

- Choosing a spot: [Positioning vegetables](https://www.rhs.org.uk/advice/beginners-guide/vegetable-basics/seed-sowing-techniques/positioning-vegetables) (rhs.org.uk);
  [Soil Texture Analysis "The Jar Test"](https://hgic.clemson.edu/factsheet/soil-texture-analysis-the-jar-test/) (hgic.clemson.edu)
- Preparing beds: [Tips on Building Raised Bed Gardens](https://blogs.ifas.ufl.edu/leonco/2022/11/17/tips-on-building-raised-bed-gardens) (blogs.ifas.ufl.edu);
  [Composting](https://www.rhs.org.uk/soil-composts-mulches/composting) (rhs.org.uk)
- Planting: [Sowing vegetable seeds](https://www.rhs.org.uk/vegetables/seeds-sowing) (rhs.org.uk);
  [Hardening Off Vegetable Seedlings for the Home Garden](https://extension.umd.edu/resource/hardening-vegetable-seedlings) (extension.umd.edu)
- Caring and harvesting: [Watering Wisely](https://wilkes.ces.ncsu.edu/2025/06/watering-wisely-how-much-your-summer-vegetable-garden-really-needs) (wilkes.ces.ncsu.edu);
  [Harvesting Vegetables](https://extension.illinois.edu/blogs/good-growing/2024-06-28-harvesting-vegetables-when-and-how-pick-your-vegetables-best-quality) (extension.illinois.edu)

Fixture descriptions come from each page's own metadata, not invented text.

## Interfaces And Dependencies

- API (`/api/v1`) stays the authority; web changes consume only DTOs from
  `packages/` contracts, never Prisma types.
- Capture DTO: `destination` (`new` | collection UUID), `name`, `published`,
  `note` (new). Comment DTO: `sectionId`, `itemId` (new, optional).
- Account preference: last new-collection visibility (new field, owner-only).
- Schibsted Grotesk stays self-hosted via `next/font/local`; no new runtime
  dependencies are expected.
