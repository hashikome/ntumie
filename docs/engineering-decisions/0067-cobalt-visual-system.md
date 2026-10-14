# ADR-0067: Cobalt visual system

Status: Accepted
Date: 2026-10-14

Partially supersedes [ADR-0063](0063-wordmark-footer-and-appearance.md): its
"keep the existing font and color tokens" clause no longer covers color. The
font (Schibsted Grotesk), the wordmark sizes and the rest of ADR-0063 remain
binding.

## Context

The Track W3 redesign compared ten directions for home, a collection and About,
then combined the owner's picks into one Round 2 design (desktop, phone, save,
discussion and component-state boards). Review found that the 2026-10-07 palette
(library-ink blue at hue 255, a pale blue primary in dark mode) read as two
different blues when the theme changed, and that a quiet palette did not carry
the brand on home and About. The design-audit lock passed the Round 2 boards with
no P0–P2 findings in light and dark on 14 October 2026.

## Options considered

- **Keep the 2026-10-07 tokens.** No migration, but dark mode keeps a second,
  pale primary and the brand stays faint.
- **Signal: cobalt plus an orange highlight across pages.** Strong in the
  annotated "how to read a collection" figure, but the two hues clashed on
  collection and About pages.
- **Cobalt with one blue per theme (chosen).** One saturated cobalt carries
  brand bands and filled controls; orange is limited to annotation.

## Decision

- Cobalt (hue ~266) is the only brand hue. Neutrals tint toward it.
- Each theme has one fill blue for brand bands and filled controls, always with
  white text. Blue text (links, roles, selected filters) is a separate `link`
  role: the fill blue in light, a lighter tint of the same hue in dark. Focus
  rings follow the `link` role.
- Home, About and the collection header use a cobalt band (a Committed color
  strategy on brand surfaces); app surfaces stay Restrained.
- Orange is reserved for annotation figures and never marks actions or state.
- Buttons, tags, chips and filters are pills; controls grow to 40 px (fine
  pointers) and at least 44 px on touch; metadata never drops below 14 px.
- Light and dark only; there is no dim theme.
- `DESIGN.md` owns every value and its contrast evidence. Later audits treat
  those tokens as the standard; any other value is drift.

## Rationale

A single hue across themes keeps the product recognisable when the appearance
changes. Splitting fill and text roles lets dark mode keep a saturated fill
(white text 5.64:1) while blue text stays legible on dark surfaces (≥ 6.89:1),
which one shared token could not do. Larger controls and the 14 px floor follow
the audit's touch-target and phone-legibility findings.

## Constraints

- Every text/background role pair meets 4.5:1 and every control boundary or
  focus ring 3:1 in both themes; recheck when a token changes.
- Components consume semantic roles, never raw values or a second palette.
- Accent stays reserved for actions, links, focus and selection; titles stay ink.

## Links

- [DESIGN.md](../../DESIGN.md) — locked tokens and contrast evidence.
- [Web interface system](../design-docs/web-interface-system.md) — components and states.
- Implementation: the Track W3 implementation ExecPlan (not yet created) migrates
  `apps/web/src/app/globals.css` and the screens; see the tech-debt tracker.
