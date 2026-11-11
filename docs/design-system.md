# Peluutin design system

This document describes the design decisions already used in Peluutin and the direction for future components. It is intentionally small: the code remains the source of truth for token values.

## Product principles

- Playing time is the primary operational information during a match.
- Controls must be usable quickly, one-handed and in bright outdoor light.
- Destructive or data-losing actions require confirmation.
- Colour supports meaning but never carries it alone.
- Interactive targets should be at least 44 × 44 CSS pixels on touch layouts.
- Match controls should stay visually stable when their labels or states change.

## Token layers

Foundation values are raw palette colours. Components should use semantic tokens instead of raw values.

Current semantic groups:

- `--surface-page`, `--surface-panel`, `--surface-subtle`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-default`
- `--primary`, `--primary-hover`, `--primary-soft`, `--primary-ring`
- `--playtime-behind`, `--playtime-balanced`, `--playtime-ahead`

Below the semantic tokens sits a foundation palette (`--ink-*`, `--blue-*`, `--amber-*`) drawn from the exercise planner, together with `--font-display`, `--font-body` and `--radius-*`. New components should build on these; the older parts of the stylesheet still use raw values and move over as they are redesigned.

Theme overrides belong under `[data-theme="dark"]`. A component should not need separate light- and dark-theme selectors unless its physical context requires one. The pitch player cards are deliberately light in both themes because they must remain the clearest layer on a green field.

## Colour and contrast

- Normal text targets WCAG AA contrast of at least 4.5:1.
- Large text and non-text controls target at least 3:1.
- Focus indication must remain visible against both the component and its surroundings.
- Status colours require a word, icon or directional symbol as a second signal.
- Muted text must not be created with opacity alone on an unknown background.

## Playing time

Playing-time numerals use tabular figures so values do not jump horizontally as the clock changes.

Hierarchy:

1. Selected-player playing time.
2. Playing time on field and bench cards.
3. Player name.
4. Position, shirt number and supporting status.

The experimental comparison uses the average of active players:

- `behind`: more than 30 seconds below the average
- `balanced`: within 30 seconds of the average
- `ahead`: more than 30 seconds above the average

The UI always includes an arrow or approximation symbol and explanatory text. This is not yet a playing-time target and should be validated with coaches before becoming a permanent metric.

## Pitch

The pitch is an SVG background, while player cards remain semantic HTML buttons. This keeps the field sharp and lightweight without sacrificing keyboard, screen-reader or touch interaction.

## Controls

Shared control styles live in one layer at the end of `styles.css`, built on the control and material tokens (`--action-*`, `--control-*`, `--tint-*`, `--danger-*`, `--segmented-track`, `--float-*`, `--scrim`, `--sheet-*`).

- Actions: primary (`.button-primary`, `.create-match-button`), secondary (`.secondary`, `.button-secondary`, `.close-button`), tinted (`.button-add`, `.schedule-match-button`), quiet danger (`.danger`, `.button-danger-quiet`, `.confirm-tertiary`) and filled danger (`.danger-confirm`, `.danger.destructive-filled`). All are at least 44 px tall and scale to .97 while pressed.
- Filled danger is reserved for the confirming step of a destructive action; list rows use quiet danger.
- Segmented controls (`.formation-switch`, `.venue-switch`, `.onboarding-sport-switch`) use the exercise planner's track and blue thumb.
- Navigation, menus and the exercise toolbars share the floating glass material.
- Dialogs are centred cards on wide screens and sheets rising from the bottom edge below 700 px; confirmations stay centred.

## Match header and layout

- The header is one block in `styles.css`. Desktop shows each team name beside its score; tablets and phones put the names above the − score + controls. On phones the header is a seven-column grid with the sport button in the first cell and the clock in the middle column.
- Score buttons are drawn at 36–40 px and extend their hit area to at least 44 px.
- The clock's main action is primary, Tauko is secondary and Lopeta is quiet danger; the filled red step comes in the confirmation.
- Tablets (721–1200 px) use one menu button for Pelit, Joukkueet and Asetukset.
- In portrait on a tablet the pitch spans the width and the bench and player panels sit side by side below it, sized so the whole bench stays visible with the pitch.

## Exercises across devices

- Phones (up to 720 px wide, or under 500 px tall in landscape) view and play exercises but do not edit them. Harjoitteet opens a list of the team's saved exercises and the unsaved draft; each opens in the same read-only viewer as a shared link. Viewing never writes over the stored draft.
- Tablets in either orientation and larger screens get the full editor. Keyboard and mouse hints are hidden on touch screens.
- The phone navigation has five items: Joukkueet, Pelit, Uusi peli in the centre, Harjoitteet and Asetukset.

## Sports and metrics

- Every sport is described once in `src/sports.ts`: name, team noun, image, offered formats, default format, whether it rotates field units and whether the lineup sits in the own half. Screens read these values instead of comparing sport ids. Adding a sport means adding it to the `Sport` type, adding its definition and giving `.pitch-<id>` a pitch background.
- Team analytics live in `src/features/match/matchStats.ts`. The summary cards render from `TEAM_METRICS`, so a new metric is one entry with a label and a value function.

## Player cards

A card is the `Jersey` component (an SVG shirt carrying the number) above a plate with the name and playing time.

- Kit colours come from the `--jersey-*` tokens. A state changes only those variables: selected is blue, a valid substitution target is amber and the keeper (`MV`) wears a dark shirt.
- Card, jersey and text sizes follow the pitch width through container query units, so 11v11 on a small phone scales down instead of overlapping. Browsers without container units get fixed sizes.
- Names up to 16 characters are shown whole and may wrap onto two lines. Longer names keep the first name and shorten the rest to an initial (`Venla-Maria K.`, `Aleksanteri-J.`). The full name is always in the button's accessible label and the selected-player panel.
- Layouts are checked with long names in 5v5, 8v8 and 11v11 from 375 × 667 upwards; cards must not overlap or leave the pitch.

## Themes

The current light/dark switch is experimental and stored locally in the browser. Before production, theme selection should move into settings with three choices:

- system default
- light
- dark

The settings experience and every component state must be reviewed in both themes before the dark theme is considered complete.

## Component checklist

Each new component should document or demonstrate:

- purpose and allowed variants
- default, hover, focus, pressed and disabled states
- semantic tokens used
- keyboard and screen-reader behaviour
- touch target size
- behaviour at mobile, tablet and desktop breakpoints
- behaviour in both themes
