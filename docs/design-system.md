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
