# ADR-0063: Wordmark and account appearance

Status: Accepted
Date: 2026-10-13

Colour follows the cobalt visual system ([ADR-0067](0067-cobalt-visual-system.md)), interaction is
client-side ([ADR-0064](0064-client-navigation-and-interactive-forms.md)), and emails follow the
company's email standard ([transactional email](../design-docs/transactional-email.md)). This record
first also set a footer with an About ntumie. link and an About collection, replacing ADR-0056's
footer; the redesign removed the footer and the About collection, so the pages end without one.

## Context

Mobile review found that the wordmark was undersized and the header theme control consumed space.
The owner selected a quieter shell with appearance choices in account settings.

## Decision

- ntumie. is a typographic logo: 24 px on phones, 28 px from 640 px, weight 700 and tight
  tracking, in the product font (Schibsted Grotesk).
- No header theme controls. Signed-out pages always follow the device. Signed-in people choose
  System, Light or Dark under Settings → On this device, saved in the browser's `appearance`
  cookie, not an account record. Changing it requires a valid session and a same-origin POST, and
  signing out does not overwrite the saved choice.

## Consequences

The header has fewer controls and branding has a deliberate hierarchy. Signed-out visitors cannot
override their device theme; account appearance stays local to the browser.
