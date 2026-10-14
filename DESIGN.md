---
name: "ntumie."
description: "Good links belong together: one cobalt brand, legible titles, visible structure."
colors:
  canvas: "oklch(1 0 0) / oklch(0.173 0.015 267)"
  surface: "oklch(0.971 0.01 273) / oklch(0.222 0.019 266)"
  ink: "oklch(0.212 0.058 271) / oklch(0.976 0.007 269)"
  muted: "oklch(0.445 0.054 273) / oklch(0.839 0.021 267)"
  border: "oklch(0.606 0.037 272) / oklch(0.616 0.029 266)"
  divider: "oklch(0.923 0.018 272) / oklch(0.305 0.023 267)"
  primary: "oklch(0.438 0.202 266) / oklch(0.529 0.217 267)"
  primary-hover: "oklch(0.4 0.183 266) / oklch(0.495 0.213 267)"
  primary-pressed: "oklch(0.367 0.155 266) / oklch(0.46 0.198 267)"
  primary-soft: "oklch(0.945 0.023 275) / oklch(0.295 0.053 269)"
  on-primary: "oklch(1 0 0)"
  on-primary-muted: "oklch(0.874 0.062 275) / oklch(0.942 0.028 275)"
  link: "oklch(0.438 0.202 266) / oklch(0.781 0.111 272)"
  focus: "oklch(0.438 0.202 266) / oklch(0.781 0.111 272)"
  annotation: "oklch(0.553 0.174 38) / oklch(0.758 0.159 56)"
  notice: "oklch(0.96 0.045 95) / oklch(0.28 0.035 90)"
  notice-ink: "oklch(0.42 0.08 75) / oklch(0.88 0.08 85)"
  danger: "oklch(0.48 0.17 25) / oklch(0.74 0.13 25)"
  danger-soft: "oklch(0.955 0.022 25) / oklch(0.27 0.04 25)"
  success: "oklch(0.485 0.102 160) / oklch(0.837 0.111 159)"
  success-soft: "oklch(0.955 0.018 161) / oklch(0.28 0.048 156)"
typography:
  family: "Schibsted Grotesk (self-hosted, variable), system sans fallback"
  meta: { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: 400 }
  ui: { fontSize: "0.9375rem", lineHeight: "1.375rem", fontWeight: 500 }
  body: { fontSize: "1rem", lineHeight: "1.5rem", fontWeight: 400 }
  title: { fontSize: "1.125rem", lineHeight: "1.5rem", fontWeight: 600 }
  section: { fontSize: "1.25rem", lineHeight: "1.75rem", fontWeight: 700, letterSpacing: "-0.015em" }
  reader-section: { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }
  page: { fontSize: "2.25rem", lineHeight: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em" }
  collection: { fontSize: "2.75rem", lineHeight: "3rem", fontWeight: 700, letterSpacing: "-0.035em" }
  display: { fontSize: "clamp(3rem, 1.5rem + 4.5vw, 5.25rem)", lineHeight: 0.95, fontWeight: 700, letterSpacing: "-0.04em" }
rounded:
  control: "0.5rem"
  field: "0.75rem"
  panel: "1rem"
  dialog: "1.25rem"
  pill: "999px"
spacing:
  unit: "0.25rem"
  button-sm: "2rem (2.75rem on coarse pointers)"
  control: "2.5rem (2.75rem on coarse pointers; 3rem for sheet actions)"
  cta: "3.125rem"
  shell-max: "80rem"
  reader-max: "48rem"
---

# Design System: ntumie.

The product name is **ntumie.**, lowercase with a mandatory trailing dot in
both text and the wordmark. The chosen domain is `ntumie.link`; machine names
use `ntumie`. See [ADR-0060](docs/engineering-decisions/0060-ntumie-repository-and-branding.md).

> **Status (14 October 2026).** The tokens below are the locked Track W3
> redesign ([ADR-0067](docs/engineering-decisions/0067-cobalt-visual-system.md)).
> `apps/web/src/app/globals.css` still installs the 2026-10-07 palette until the
> W3 implementation migrates it; until then this document is ahead of the code
> (see the tech-debt tracker). Component and screen descriptions further down
> describe what ships today.

## Overview

**Creative north star: "Good links belong together."** A collection gathers the
resources that explain one idea, in the order they make sense. Reading gets the
most space; nothing is invented to fill a page — no counts, decorative covers,
recommendations or social proof.

**Key characteristics:**

- One cobalt hue (~266) across both themes. Brand surfaces (home, About and the
  collection header) carry it as a full-bleed band; app surfaces stay quiet,
  with accent below roughly ten percent of the page.
- Each theme has one **fill** blue (bands, filled buttons, selected options;
  always white text) and a separate **link** role for blue text. In light both
  are the same cobalt; in dark the link role is a lighter tint of the same hue.
- Neutrals tint toward the brand hue so canvas, ink and accent read as one family.
- Orange (`annotation`) appears only in annotated explanations such as "How to
  read a collection"; it never marks actions or state.
- Light, Dark and System appearances from one set of semantic OKLCH tokens; no
  dim theme.
- One self-hosted sans (Schibsted Grotesk): fixed rem type in the product, a
  fluid display size on brand pages.
- Pill-shaped buttons, tags, chips and filters; fields and panels use soft
  corners. Grouping comes from surface changes and separators, not shadows.
- The lowercase wordmark `ntumie.` alone is the logo — no icon.
- UX over compactness; copy in short, scannable paragraphs (see the
  [interface system](docs/design-docs/web-interface-system.md) principles).

This document owns every concrete theme value. Layouts, components and states
are in the [interface system](docs/design-docs/web-interface-system.md); journeys
and copy in the [product experience](docs/design-docs/web-product-experience.md).
`apps/web/src/app/globals.css` installs these tokens.

## Colors

The web's global stylesheet exposes semantic Tailwind theme variables for
canvas, surface, ink, muted text, border, accent, link, focus and feedback.
Components consume those roles rather than raw palette numbers. All color values
use OKLCH. Light, Dark and System themes are available in Settings → On this
device. System follows `prefers-color-scheme`; a validated theme cookie selects
explicit light/dark server-side without a client flash. Account data is never
stored in it.

Strategy: **Committed** on brand surfaces (the cobalt band carries home, About
and the collection header) and **Restrained** inside the product (tinted
neutrals plus one accent). `primary` fills the band, primary buttons, selected
radio options and the "next guide" card, always under `on-primary` text; band
secondary text uses `on-primary-muted`, and tags or cards on the band sit on
`band-overlay`. Blue text — inline links, the Contributor role, a selected
filter's label — uses `link`. Titles, navigation and metadata stay ink or muted.
The pale notice color is reserved for meaningful warnings, not decoration.

### Canonical color and type variables

For Tailwind's CSS theme namespace, the following block is installed in the
global stylesheet. Theme colors create semantic utilities such as `bg-canvas`
and `text-ink`; custom type roles create `text-page` and `text-body`.
See the official [theme variable reference](https://tailwindcss.com/docs/theme).
Do not copy a second palette into components or email templates.

```css
@theme {
  --color-canvas: light-dark(oklch(1 0 0), oklch(0.173 0.015 267));
  --color-surface: light-dark(oklch(0.971 0.01 273), oklch(0.222 0.019 266));
  --color-ink: light-dark(oklch(0.212 0.058 271), oklch(0.976 0.007 269));
  --color-muted: light-dark(oklch(0.445 0.054 273), oklch(0.839 0.021 267));
  --color-border: light-dark(oklch(0.606 0.037 272), oklch(0.616 0.029 266));
  --color-divider: light-dark(oklch(0.923 0.018 272), oklch(0.305 0.023 267));
  --color-primary: light-dark(oklch(0.438 0.202 266), oklch(0.529 0.217 267));
  --color-primary-hover: light-dark(oklch(0.4 0.183 266), oklch(0.495 0.213 267));
  --color-primary-pressed: light-dark(oklch(0.367 0.155 266), oklch(0.46 0.198 267));
  --color-primary-soft: light-dark(oklch(0.945 0.023 275), oklch(0.295 0.053 269));
  --color-on-primary: oklch(1 0 0);
  --color-on-primary-muted: light-dark(oklch(0.874 0.062 275), oklch(0.942 0.028 275));
  --color-band-overlay: oklch(0.17 0.05 270 / 0.22);
  --color-link: light-dark(oklch(0.438 0.202 266), oklch(0.781 0.111 272));
  --color-focus: light-dark(oklch(0.438 0.202 266), oklch(0.781 0.111 272));
  --color-annotation: light-dark(oklch(0.553 0.174 38), oklch(0.758 0.159 56));
  --color-scrim: light-dark(oklch(0.21 0.06 271 / 0.45), oklch(0 0 0 / 0.6));
  --color-notice: light-dark(oklch(0.96 0.045 95), oklch(0.28 0.035 90));
  --color-notice-ink: light-dark(oklch(0.42 0.08 75), oklch(0.88 0.08 85));
  --color-danger: light-dark(oklch(0.48 0.17 25), oklch(0.74 0.13 25));
  --color-danger-soft: light-dark(oklch(0.955 0.022 25), oklch(0.27 0.04 25));
  --color-success: light-dark(oklch(0.485 0.102 160), oklch(0.837 0.111 159));
  --color-success-soft: light-dark(oklch(0.955 0.018 161), oklch(0.28 0.048 156));
  --font-sans:
    var(--font-brand), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --text-meta: 0.875rem;
  --text-meta--line-height: 1.25rem;
  --text-ui: 0.9375rem;
  --text-ui--line-height: 1.375rem;
  --text-body: 1rem;
  --text-body--line-height: 1.5rem;
  --text-title: 1.125rem;
  --text-title--line-height: 1.5rem;
  --text-section: 1.25rem;
  --text-section--line-height: 1.75rem;
  --text-reader-section: 1.5rem;
  --text-reader-section--line-height: 2rem;
  --text-page: 2.25rem;
  --text-page--line-height: 2.5rem;
  --text-page--letter-spacing: -0.03em;
  --text-collection: 2.75rem;
  --text-collection--line-height: 3rem;
  --text-collection--letter-spacing: -0.035em;
  --text-brand-body: 1.0625rem;
  --text-brand-body--line-height: 1.6;
  --text-lead: 1.3125rem;
  --text-lead--line-height: 1.55;
  --text-brand-heading: 2.5rem;
  --text-brand-heading--line-height: 1.05;
  --text-brand-heading--letter-spacing: -0.035em;
  --text-display: clamp(3rem, 1.5rem + 4.5vw, 5.25rem);
  --text-display--line-height: 0.95;
  --text-display--letter-spacing: -0.04em;
  --spacing: 0.25rem;
  --radius-control: 0.5rem;
  --radius-field: 0.75rem;
  --radius-panel: 1rem;
  --radius-dialog: 1.25rem;
  --radius-pill: 999px;
  --shadow-elevation: 0 1px 2px oklch(0.21 0.06 271 / 0.08), 0 20px 50px oklch(0.21 0.06 271 / 0.14);
  --ease-feedback: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Use `divider` only for decorative list separation. Inputs, secondary buttons
and other boundaries needed to identify a control use `border`, on every surface
including `surface` and `primary-soft`. Body, placeholder and disabled-control
text use `ink` or `muted`, never a lighter unverified gray. Do not dim whole
controls with opacity: a disabled control keeps its label on a `divider` fill
with `muted` text and a disabled attribute. Pending controls preserve their
label, add a progress glyph and announce progress. Hover and pressed go one step
darker in both themes (`primary-hover`, `primary-pressed`; `surface` then
`divider` behind neutral and text buttons), so white labels keep their contrast.
Selection uses `primary-soft` with `link` text, or a `primary` outline and radio
dot. Status labels use the matching soft background and foreground. Focus uses a
2px `focus` outline with a 3px canvas gap, including around primary-filled
controls; text fields also turn their border `primary` with a 3px `primary-soft`
glow.

### Contrast evidence

Recalculated 2026-10-14 by the design-audit lock from the sRGB values the OKLCH
tokens convert to (light / dark hex in brackets), using relative luminance
`0.2126 R + 0.7152 G + 0.0722 B` and `(lighter + 0.05) / (darker + 0.05)`.
Text pairs need 4.5:1; boundaries and focus rings 3:1. Recheck screenshots and
computed styles when changing rendered combinations, including hover, focus and
band variants.

| Foreground / background | Light | Dark |
| --- | --- | --- |
| ink [#0f1633 / #f5f7fc] / canvas [#ffffff / #0d1017] | 17.75:1 | 17.75:1 |
| ink / surface [#f3f5fc / #171b24] | 16.30:1 | 16.08:1 |
| ink / primary-soft [#e8ecfd / #222b47] | 15.09:1 | 13.02:1 |
| muted [#4a5272 / #c4cad8] / canvas | 7.66:1 | 11.59:1 |
| muted / surface | 7.03:1 | 10.49:1 |
| muted / primary-soft | 6.51:1 | 8.50:1 |
| muted / divider (disabled) [#e1e5f2 / #2a2f3b] | 6.09:1 | 8.15:1 |
| link [#1f3fbf / #9fb3ff] / canvas | 8.33:1 | 9.39:1 |
| link / surface | 7.65:1 | 8.51:1 |
| link / primary-soft | 7.08:1 | 6.89:1 |
| on-primary / primary [#1f3fbf / #3559e6] | 8.33:1 | 5.64:1 |
| on-primary / primary-hover [#1a37a8 / #2c4fd8] | 9.74:1 | 6.53:1 |
| on-primary / primary-pressed [#18338f / #2647c4] | 11.00:1 | 7.55:1 |
| on-primary-muted [#c9d3ff / #e6ebff] / primary | 5.65:1 | 4.75:1 |
| on-primary / band-overlay on primary | 10.35:1 | 7.62:1 |
| on-primary-muted / band-overlay on primary | 7.02:1 | 6.42:1 |
| annotation [#c2410c / #fb923c] / canvas | 5.18:1 | 8.41:1 |
| annotation / surface | 4.75:1 | 7.61:1 |
| success [#16704a / #86e0b0] / success-soft | 5.37:1 | 9.06:1 |
| danger [#a92227 / #f28881] / danger-soft | 6.22:1 | 6.28:1 |
| danger / canvas | 7.13:1 | 7.81:1 |
| border [#7a8199 / #7d8597] / canvas (boundary) | 3.87:1 | 5.14:1 |
| border / surface (boundary) | 3.55:1 | 4.66:1 |
| border / primary-soft (boundary) | 3.29:1 | 3.77:1 |
| focus [#1f3fbf / #9fb3ff] / canvas (ring) | 8.33:1 | 9.39:1 |
| focus / surface (ring) | 7.65:1 | 8.51:1 |
| primary / canvas (radio dot, selected outline) | 8.33:1 | 3.37:1 |
| primary / surface (radio dot, selected outline) | 7.65:1 | 3.05:1 |

Notice tokens carry over unchanged from the 2026-10-07 pass (10.15:1 dark,
7.66:1 light).

### Dark mode

Dark mode keeps the same roles on a near-black canvas tinted toward cobalt, with
a brighter fill blue so white labels and the band stay readable at a glance, and
a lighter link tint for blue text. Components inherit these tokens, including
error, success, focus, hover and native control colors. Motion respects
reduced-motion preferences.

Appearance lives in Settings → On this device for signed-in users, with explicit
System, Light and Dark choices. System is the default. The choice is saved in
this browser and applies only with a valid session; signed-out pages always follow
the device preference. The header has no theme control. Existing reader appearance
cookies are ignored. Appearance applies immediately, saves in the background and
rolls back with inline feedback if persistence fails.

## Typography, spacing and shape

| Role | Value |
| --- | --- |
| Sans family | Schibsted Grotesk variable (OFL-1.1), self-hosted from `apps/web/src/fonts/` via `next/font/local`; system sans as metric-adjusted fallback |
| Metadata (`meta`) | `0.875rem / 1.25rem`; regular. The floor for any text, including tags, hostnames, timestamps and hints |
| UI (`ui`) | `0.9375rem / 1.375rem`; sidebar rows, buttons, comment bodies; medium for controls |
| Body | `1rem / 1.5rem` in the product (`1.6` for descriptions and discussion); brand pages use `1.0625rem / 1.6` |
| Resource title (`title`) | `1.125rem / 1.5rem`; weight 600–700, ink (not accent) |
| Section heading (`section`) | `1.25rem / 1.75rem`; weight 700, `-0.015em` |
| Reader section heading | `1.5rem / 2rem`; weight 700, `-0.02em`; section descriptions are body ink, maximum `60ch` |
| Page heading (`page`) | `2.25rem / 2.5rem`; weight 700, `-0.03em`; phone collection title |
| Collection title (`collection`) | `2.75rem / 3rem`; weight 700, `-0.035em`; on the cobalt band from 900 px |
| Brand lead / heading / display | Lead `1.3125rem`; h2 `2.5rem` (`2rem` below 900 px), `-0.035em`; display `clamp(3rem, …, 5.25rem)`, line height `0.95`, `-0.04em` |
| Wordmark | The text `ntumie.` alone is the logo (no icon): 24 px on phones, 28 px from 640 px, weight 700, tight tracking ([ADR-0063](docs/engineering-decisions/0063-wordmark-footer-and-appearance.md)) |
| Spacing | `0.25rem` unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64 px; 2 px only for optical nudges |
| Page gutters | 16 px below 640 px; 32 px above; brand bands 40 px from 900 px |
| Shell maximum | `80rem` (brand bands and the collection layout); reader column `48rem` |
| Buttons | Pills. Primary: `primary` fill, `on-primary` label. Secondary: `border` outline on canvas. Text: no boundary, `muted` label. Heights: `2.5rem` (`control`) for primary and secondary; `2rem` (`button-sm`) for text buttons and segmented filters; both at least `2.75rem` on coarse pointers, `3rem` for sheet actions; brand calls to action `3.125rem` |
| Fields | `2.5rem` (`2.75rem` coarse); `field` radius; 1.5 px `border`; labels stay visible above |
| Radii | `control` 8 px (text buttons, sidebar rows) · `field` 12 px (fields, expanded items, banners) · `panel` 16 px (cards, discussion) · `dialog` 20 px (dialogs, sheets) · `pill` (buttons, tags, chips, filters) · circles for avatars |
| Tags | Pills on `surface` with `muted` `meta` text; on the band, `band-overlay` with `on-primary` text. Tags are labels, not filters |
| Border | `1px` dividers; `1.5px` control boundaries; no decorative accent side-stripes |
| Focus | `2px` solid `focus` outline with `3px` offset; fields also get a `primary` border and a 3 px `primary-soft` glow |
| Elevation | One `shadow-elevation` for surfaces that float above content (dialogs, the account menu, the About guide card); never for grouping |
| Breakpoints | 520 px compact header; 640 px gutters; 900 px single column and sidebar collapse; 1024 px Manage sidebar |
| Motion | `160ms`, `cubic-bezier(0.22, 1, 0.36, 1)`; immediate for reduced motion |
| Layers | content 0, sticky 10, dropdown 20, modal backdrop 30, modal 40, toast 50, tooltip 60 |

Product pages use fixed rem typography; brand pages (home, About) use the fluid
display size. Headings wrap balanced, prose wraps normally, and user content uses
`overflow-wrap: anywhere`. Controls and focus outlines remain visible at zoom.
Off-scale values (6/10/14/18 px gaps, 10/14/18/22 px radii, one-off font sizes)
are drift: map them to the nearest token.

Exact timestamps use the account's selected timezone, or the device in Automatic
mode, without a timezone suffix. Explicit account choices render on the server;
Automatic waits for browser formatting rather than showing UTC before hydration.
With JavaScript disabled, Automatic uses a labelled UTC fallback; operator tables
label that fallback once. Saved explicit choices still apply without JavaScript.
Relative ages retain exact timestamps in the same timezone on hover. Profile
Settings offers a labelled Timezone select with Automatic first, using the ordinary
autosave/native Save changes flow.

## Components

The header separates the left wordmark from Discover and the avatar-only account menu on the right. The menu groups Profile, Hub (when owned),
Notifications (with an unread count), Settings and role-gated Manage above
Sign out. The wordmark is the logo: 24 px on phones and 28 px from 640 px,
weight 700, with tight tracking and a 1.25 line height. Product footers contain
one right-aligned About ntumie. link, at 18 px and weight 500. On About, signed-out
visitors see Join ntumie. linking to `/sign-up`; signed-in visitors see no footer
link. There is no footer tagline, year, repeated wordmark or divider. Links retain
44 px touch targets and shared hover/focus feedback. The footer follows long
content and sits at the bottom of short pages, including the empty About variant.
Site sharing, Support and the maker's portfolio live on `/about`; legal links
join the collection when those pages exist. See [ADR-0063](docs/engineering-decisions/0063-wordmark-footer-and-appearance.md).

About's useful links use the same `CollectionPreview`, section disclosures,
resource rows, tags, expanded context and item-link controls as the homepage
example and collection reader. Like Ada's homepage example, it is a self-contained
visual fixture: a complete typed collection/resource snapshot, simulated hub and
activity, and namestarlit as its displayed contributor. It has no account, hub or
API-record dependency. The metadata row uses `CollectionMeta`; expanded resources
use shared attribution and timestamp rendering. Dates and UUID-shaped identities
are fixed fixture values. About item links use `/about?item=<id>#item-<id>` and
reopen the selected item; no simulated identity links into real record routes.
The destinations themselves are real: Support stays on the current installation
and the maker link opens the portfolio. Neither embedded collection has a visible Example badge; the homepage retains
its accessible Example collection label.

Homepage and About share the existing hero composition. Home says “Good links
deserve a place to belong.”; About says “Good links belong together.” The homepage retains
Save your first link; About uses Share ntumie. and three follow-up questions.
Their embedded collections use a 32 px title, 24 px section headings, 18 px resource
titles and 16 px body-ink section descriptions. Semantic levels start at h2 under
the hero h1. About's links are real destinations within a simulated collection.

Generated geometric
SVGs come from the API, seeded by immutable user UUID. The approved avatar palette
and grid geometry stay fixed in both themes; no external provider is involved.

The account-menu trigger shows only the avatar, and Notifications sits directly
below Profile inside the popup.

Buttons, fields, tags, toasts, the verification screens and every other
component are specified in the
[interface system](docs/design-docs/web-interface-system.md).

## Do's and Don'ts

**Do:** consume semantic roles (`bg-canvas`, `text-ink`), never raw palette
numbers; keep accent for actions, inline links, focus and selection; use
`primary` for fills and `link` for blue text; keep labels visible and controls at
the shared height; show fewer items rather than crowd a layout.

**Don't:** copy a second palette into components or email templates; add
decorative shadows, accent side-stripes or icons beside the wordmark; dim whole
controls with opacity; use the pale notice color as decoration; use blue for
headings or titles; use orange anywhere but annotation; put text under 14 px.

## Authentication entry

Sign-in and signup share a roughly 400px column, horizontally centered and slightly
above the viewport midpoint. Keep the same anchor across proof/creation screens.
Sign-in heading: Sign in to ntumie. Signup heading: Create your account.
Email label/input precedes the full-width primary Continue with email; quiet or
and full-width secondary Continue with Google follow. Footer links switch intent.
No image or extra marketing copy is needed. Optional hub creation is progressively
revealed after proof, with a visible hub-name label. See
[ADR-0044](docs/engineering-decisions/0044-explicit-auth-entry-and-optional-hub.md).

### Management workspace navigation

Manage sections use a shared 11rem desktop sidebar, separated from the content
by spacing and a divider. Below 1024px a native Manage disclosure replaces it.
The selected view uses a surface fill and stronger text. Subsections are indented
under the current section; headings start the working area, with filters beside
their content. The global site header stays unchanged. Management content
can use an 88rem shell to preserve room for tables beside the sidebar.

Navigation sections with children use native expand/collapse controls; expanding
Import never navigates. New import and Review are the navigation links. Sections
without children remain direct links. The current section starts expanded.

Home and About use the shared collection preview, built from the reader heading,
sections, rows and inline details. At desktop sizes the hero and preview fit the
space between navigation and the bottom-right footer link; lengthy resource content
scrolls inside the panel. Smaller or short viewports retain document scrolling.
