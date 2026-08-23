# Peluutin analytics

See also the current [data inventory](data-inventory.md) and the Finnish
[privacy notice draft](privacy-notice-draft-fi.md). The data inventory is the
source of truth for what is implemented versus only planned.

## Purpose

Analytics should help improve Peluutin's user experience without identifying
players, teams or individual visitors. The first phase establishes a privacy-
conscious traffic baseline before product interaction events are designed.

## Phase 1: traffic baseline

Vercel Web Analytics records anonymous, cookie-free aggregate traffic data such
as page views, visitors, referrers, countries, browsers, operating systems and
device categories. The React integration is mounted once at the application
root so onboarding, matches and exercises use the same measurement setup.

This baseline can help answer:

- How much of Peluutin's usage happens on mobile, tablet and desktop?
- Do visitors return after first discovering the product?
- Which routes and entry sources bring people to Peluutin?
- Does usage change after a product release or usability improvement?

It cannot explain why a user abandons a workflow. That requires separately
designed product events and, where useful, voluntary user research.

## Privacy guardrails

- Never send player, team or opponent names to analytics.
- Never send free-text input or rejected field values.
- Record validation categories instead of input contents.
- Keep product analytics separate from saved match data.
- Do not add session replay without a separate privacy review and explicit
  masking of all user-entered content.

## Future phase: product learning

Before adding custom events, define the first-use funnel and a small event
taxonomy. Likely candidates include anonymous events for creating a team,
starting a match, starting the clock, completing a substitution and finishing
a match. Validation failures should contain only the screen, field identifier
and predefined reason category.

The primary learning goals are activation, time to first successful match and
returning for another match. Event names and properties should be documented
here before implementation so the case study can connect each measurement to a
product decision.
