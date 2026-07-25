# Peluutin data model

The canonical TypeScript definitions live in `app/src/types.ts`.

## Team

A team owns its players, formations and completed match history.

## Player

A player has a stable ID, display name and shirt number. Playing time and goals belong to a match, not to the player profile.

## Formation

A formation contains an ID, display name and ordered field slots. Each slot defines a Finnish role abbreviation and relative coordinates on the pitch.

## ActiveMatch

The recoverable live-match snapshot contains the selected team, opponent, home/away status, participating players, formation, lineup, timer, score, player seconds and player goals.

## MatchRecord

A completed record is an immutable snapshot used by history and Excel export. Ending without saving deliberately discards the active snapshot instead of creating a record.

## Storage

- `vaihtopeli-teams`: team profiles and completed history.
- `peluutin-active-match`: one recoverable active match.

Both values currently live in `localStorage`. `storage.ts` treats them as untrusted input and validates them before use. A backend should use server-generated identifiers, authentication and authorization rather than accepting these client-side structures as trusted records.
