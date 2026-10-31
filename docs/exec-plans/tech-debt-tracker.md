# Technical Debt Tracker

Record accepted compromises with an impact and a condition for revisiting the
decision. `PRODUCT.md` §11 owns implementation order; the
[release runbook](../runbooks/release.md) owns public-release gates.
Items below are outstanding work, not claims of completed behavior.

| Area | Debt | Impact | Revisit When |
| --- | --- | --- | --- |
| PostgreSQL connection recovery | During the 12 October shared-service replacement, the existing API remained unready for PostgreSQL while DNS/TCP and a fresh authenticated SELECT 1 from the same container passed; Redis readiness recovered | A healthy replacement database alone does not restore an existing application process; ingress correctly excludes it | Before the next database maintenance or public launch: reproduce service-endpoint replacement, bound connection/query waits, and prove existing API/worker pools recover without process replacement |
| Cold web loading | Live check on 13 October 2026 (`ntumie.link`, one client location): documents are brotli and build assets gzip-compressed (shared framework chunks ~64–66KB, CSS ~15KB, compressed); build assets are Cloudflare cache HITs. Any uncached request (page or trivial unauthenticated API read) costs ~280–340ms after TLS versus ~160ms for a cache HIT, so the edge-to-origin hop dominates, not rendering. The identity-encoded benchmark overstates cold transfer | Each sequential browser-to-origin round trip costs ~130–150ms over an edge hit; signed-in live pages remain unmeasured. East African visitors reach the Cape Town edge; the owner accepts the European origin for now (13 October 2026) — relocating it needs no code change | Signed-out public pages are edge-cached (ADR-0066; live `MISS`→`HIT` verified 14 October 2026) and route code preloads on link intent (ADR-0064 amendment); measure signed-in journeys live (browser trace or the navigation benchmark against the deployed service) before further cold-load work; purge the edge copy on unpublish or distribution hold if the accepted ~2-minute staleness becomes a problem |
| Recovery-code download | Recovery codes are shown once on `/settings/security` and held only in component memory until dismissed; there is no download action (owner request, 14 October 2026) | People must copy codes by hand before dismissing them; lost codes raise lockout and support risk | With the next security-settings change: add a "Download codes" action that builds a plain-text file in the browser (never a URL parameter, server log or analytics event), keep the existing single-view rule, and cover it in the security-settings browser test |
| Design tokens ahead of code | `apps/web/src/app/globals.css` installs the locked cobalt tokens, pill buttons and 40 px controls (M1, 14 October 2026), but the screens keep their pre-redesign layouts until the later milestones | Docs and code disagree on colors, control sizes and shapes; audits against `DESIGN.md` will flag the shipped UI as drift | With the Track W3 implementation ExecPlan: migrate `globals.css` to the `DESIGN.md` `@theme` block, adapt home, About, collection, save and discussion to the Round 2 boards, then re-run the design audit and remove this row |
| Local migration history | The applied `people_and_hubs` checksum differs from the committed migration; the username column is restored to varchar(20) | `migrate dev` requests a reset even though new additive migrations deploy and fresh database verification passes | Before the next local schema generation: reconcile history with evidence or use a disposable database; never reset retained data implicitly |
| Export typography | PDF/Word renderers use library-default styling (Helvetica, default docx heading styles); no user-visible styling options | Exports are readable but plain; no branding or theme choices | Users ask for styled exports |
| Audit retention review | Verified self-service/admin deletion and 14-day cleanup are implemented; content audit and capture receipts have no scheduled expiry, while auth/service audit retain 90/365 days and delivery metadata 30 days | Retained identifiers outlive account/content deletion | Review retained evidence and receipt retry windows before public exposure; document any purge policy before implementing it |
| Audit strategy and experience | Bounded effects cover existing-collection publication, sharing and transfers (ADR-0021); other hub actions and older rows lack change detail; generic snapshots remain absent | Full audit strategy is deferred; History and attribution still depend on activity records | Dedicated audit milestone after fundamental operations; inventory remaining writers/atomicity and define investigative needs, evidence, access, integrity and retention ([ADR-0020](../engineering-decisions/0020-logging-after-core-operations.md)) |
| Wide event logging | Sanitized request telemetry exists; a strategy across domain operations and jobs is deferred | Operational questions, context and sampling are not yet designed across the system | Separate milestone once most operations are built; define query acceptance, privacy, outcomes, correlation and cost limits ([ADR-0020](../engineering-decisions/0020-logging-after-core-operations.md)) |
| Product email delivery events | Owner deferred Resend webhook setup on 12 October 2026. Existing signature/outcome/suppression code remains; no webhook secret is mounted in production. The new sender passed an authorized support-inbox delivery test. Share notifications remain sharing work | Provider acceptance is recorded, but asynchronous delivery/bounce/complaint outcomes are not integrated live | Separate product-email milestone: configure the signed endpoint, validate correlation/retries and suppression. Not a prerequisite for this shared-infra CI/CD setup |
| Observability rollout | API LogTape/Sentry boundary and local capture are implemented; browser/worker instrumentation and live Sentry/Alloy shipping are unverified | No claim of centralized operational visibility yet; sanitized stack frames omit source filenames | Live infrastructure milestone plus browser/worker slices; review source-map privacy before richer traces |
| Production launch acceptance | GitHub verification, image rehearsal/GHCR publication, exact migration and Dokploy promotion passed on 12 October 2026. Google production callback/full user journeys, off-host product restore, product monitoring and capacity remain unaccepted | Repeatable production delivery exists; full launch readiness and load/rolling-overlap capacity are not established | Before public launch: complete the remaining gates in docs/runbooks/release.md, including recovery and reviewed schema/image rollback compatibility |
| Auth throughput and budgets | Authenticated product and auth mutations use a shared transaction advisory lock; source and identity budgets are fixed | Simple cross-process correctness bounds throughput; NAT users share source capacity | Measure lock wait and real traffic before scoped-lock or adaptive-budget work |
| Link metadata growth | `link_metadata` keeps a row per address ever saved or previewed (Save a link previews store what they fetch); rows outlive removed items | The table only grows, slowly (previews are budgeted at 30/min per source) | Before public release: worker cleanup of rows no resource or unexpired import draft references and unchanged for 30 days, with an index on `resources.url` (a reviewed migration) |
| API per-request overhead | Measured 13 October 2026 through the full HTTP stack on a local disposable database. Every non-probe request first commits the PostgreSQL source-budget upsert (median ~1.1–1.3ms; ~0.24ms if UNLOGGED); the owner kept it durable on 13 October 2026 as not worth a sub-millisecond gain. Session resolution now costs 2 statements (ADR-0065 carries `account_state` on the better-auth user row). The policy's duplicate active-account read is removed for reads (one fewer statement per policy evaluation). Collection reads still re-read the row for availability and load tags as two relation queries | Each statement is a database round trip on every signed-in server-side read; small next to the live ~130–150ms edge-to-origin hop | Collection re-read/tag queries: with the next policy or Prisma relation-loading change |
| Read-path queries | Each referenced collection in a list runs its own access check; comments load replies per question (up to 100 each) and mutations re-read what they hold | ~5 queries per reference, ~40 per comment page, extra queries under the write lock | Measured traffic, or the comments/notifications slice: bulk policy resolve, windowed reply query, smaller reply preview |
| Write-lock opt-outs | Four ways to skip the global authority lock (method list, two metadata keys, a path regex) | A new POST under `/operations` silently runs unlocked | Next authority change: one `@Authority(mode)` metadata value set per controller |
| Forms route | One `/forms/[action]` handler with a growing action chain and per-action status-to-notice mappings | Inconsistent notices for the same status | Next new form action: action table or per-action route files, one notice helper |
| Capture drafts in cookies | Drafts (2 links + tags) live in one encrypted cookie; oversized tags are dropped | Rare silent tag loss on very long input | Server-side draft store (Redis) if users hit it |
| Keyboard-only focus rings | `FocusMode` hides rings after a pointer press until Tab/arrows/F6 (requested) | Screen-reader virtual cursors don't fire those keys, so rings stay hidden after a click | Accessibility review with assistive-technology testing |
| Tag suggestions | Per-link tags are typed by hand on Save a link | Implemented title/description/site-name metadata supplies no tag suggestions | A separately designed suggestion policy with user review |
| Generated client in build | `apps/api/src/generated/prisma` compiles inside the app build (`nest build` walks it) | Slower builds | Only if build times hurt |
| Type-aware lint coverage | Type-aware rules (`no-floating-promises`, `no-unsafe-*`) have no Biome equivalent | Async-safety lint classes (e.g. unhandled promises) are not caught at lint time; type *errors* are still caught by `tsc --noEmit` in `verify` | Revisit if a floating-promise/async bug ships, or if Biome gains type-aware rules |
| Browser mutation journeys | Shared Origin enforcement, reading, settings, capture, collection details, discussion and operations have browser proof; sharing, sections/reordering and protected authentication also have browser proof; reviewed imports now have JavaScript/native browser proof; preview cards, notes and export web journeys remain | Each new form still needs workflow-specific conflict, validation, expiry and download acceptance | With each complete web journey |
| Runtime configuration | API/worker keep existing server validation; web has separate server/browser exports and import/bundle checks | Shared server settings are not yet consolidated across API and web | Only when a real cross-runtime setting warrants consolidation |
| Browser-suite timing flakes | Under the full suite's load, a few journeys occasionally miss their 5 s waits and pass when run alone (29 October 2026: "loads Settings sections on demand…" draft restore, after the move to Bun 1.4.4; earlier "revalidates collection history…") | A full run can fail once without a real defect; reruns cost time Also "loads Settings sections on demand": autosave of "Direct hub entry" missed the poll once (31 Oct), passes alone. | If a journey fails twice in a row, or in CI: find its slow step (trace in `test-results/browser/`) and wait on the real signal instead of time |
| Settings sections without JavaScript on a cold server | Settings loads each section with `dynamic()` (`apps/web/src/components/profile-editor.tsx`). The first server render of a section after a restart suspends and streams it in, which only JavaScript can reveal, so the first no-JavaScript visitor per section sees "Loading settings…" (found 29 October 2026: "follows the device while signed out…" fails alone, passes in the full suite once warm) | Rare, but that visitor cannot change appearance or other settings without a reload | Next Settings change: render the requested section without suspending (preload the section modules on the server, or import the initially requested section statically) and run that test alone as proof |
| Controlled email identity change | Account email is fixed; old endpoints retired (ADR-0041). Future dedicated POST action needs lost-inbox identity proof, review authority, owner/operator notifications, invitation handling, Google/credential continuity, revocation and audit; keep the same UUID | Inbox loss has no email-change recovery path; a new account inherits no access | Revisit policy before implementation; never add email/user UUID to profile PUT/PATCH |

Email codes, passkeys, Google and optional TOTP/recovery codes are implemented. The [integration contract](../design-docs/auth-delivery-integration.md)
defines proof/session binding, account recovery and durable delivery intent.

Contract checks cover web reads and safe error envelopes. Keep expanding
HTTP/mapper coverage per slice; DTOs/Swagger/shared types remain handwritten.
Local Markdown links are enforced; the guide pin still checks committed trees
only, so sweep it during review and pin after the reviewed commit exists.

## Feature discoveries (fake doors)

Designed controls whose features are not built yet ship as fake doors (owner,
15 October 2026): using one records a `feature_interest` row (feature key and,
signed in, the person) and says the feature is on the way. Read demand with
`SELECT feature, count(*) FROM feature_interest GROUP BY feature`. Each needs
its own slice:

- `search`: text search across hubs and collections (matching hubs first,
  matched words marked, tags as removable filters, a no-results state). The
  Discover band's search box posts to the fake door until then.
- `subscriptions`: Subscribe on hubs and hub cards, per-hub bells, the owner's
  Subscriptions tab and feed, subscriber counts (hidden until then), the
  profile's Subscriptions switch, and "Most subscribed" ordering (Discover's
  hub list orders by recent collection saves meanwhile).
- `communities`: Join a community, the hub's Communities tab, the owner's
  Communities tab and the profile switch (ADR-0050, paid curators).
- `partners`: the hub's Partners tab and partner credit
  ([ADR-0068](../engineering-decisions/0068-partner-hub-credit.md)).

Popular tags count tags on published collections active in the last 90 days;
private content never contributes. Date-range filtering needs a concrete
discovery use case.

## Sharing and hub engagement

Revisit in the home/subscriptions and web-sharing slices in `PRODUCT.md` §11.
Profiles, hubs, collections and the site use one contextual Share page with
Copy link. Social destinations and footer social links remain deferred; the
collection sidebar presents Contributors above Discussion.

- Extend the common Share page with social destinations only when requested;
  keep site sharing in the footer.
- Keep durable ID links and distinguish public addresses from explicit access
  links; never leak an access token through a social action or reference.
- Implement hub subscriptions and subscriber counts from authoritative data.
- Prioritize saving/bookmarking whole collections and total collection saves as
  the engagement signal; settle Bookmark/Bookmarked and Bookmarks terminology
  in that slice. Define aggregation and public visibility rules before counts ship.
- Keep individual Add to my collection copies separate from collection bookmarks;
  owner permission and source credit remain required by ADR-0019.
- Review all these controls as one coherent experience, with real data and
  accessible interactions, rather than adding provisional widgets in isolation.

## Collection contributor visibility

Open product decision: whether collection owners may hide the contributor list.
Do not couple this to the implemented public profile/hub connection preference;
existing contributor display and authorship remain unchanged until settled.

## Page performance investigation

The [production baseline](completed/preserve-early-input-and-measure-production.md)
now records matched cold/warm browser journeys, API counts and resource timings.
Immutable static-asset caching removes repeated downloads; request-scoped profile
reuse removes duplicate capture/Settings reads. Cold-load work remains in the
row above. The [internals plan](active/final-pass-internals.md) may extend query
batching with fresh evidence while preserving authorization and visible behavior.
No production-versus-development timing comparison or deployed-user baseline has
been established.

## Deferred audit redesign investigation

When the ADR-0020 milestone resumes, start with the investigative questions an
owner or operator needs answered: who did what to which entity, when, and what
changed. Inventory current writers and transaction boundaries against the
current unified audit model. Keep the
primary target distinct from surrounding collection/hub context.

Decide which evidence may be retained, distinguish current display labels from
event-time values, and address renames, deletion, access, integrity and retention
before designing the table. Historical rows cannot acquire changes that were
never captured. General content snapshots require an explicit revision of the
current bounded-evidence contract. Preserve existing recording and attribution
while this work is deferred; do not suppress reads merely to make the UI quieter.

## Same-host pull-request previews

Owner-selected direction, not deployed: local development and production are the
only permanent environments. Prepare temporary previews of the multi-service
Stack on the same Dokploy host when capacity allows. Preserve GitHub verification/
image builds and immutable promotion. Require isolated preview database roles/data,
queue namespaces/ACLs, capture-only mail, restricted secrets, a bounded preview
count and teardown on PR closure. Built-in GitHub Application previews are not
proof that raw Stack previews work. Production setup does not wait for this work.
