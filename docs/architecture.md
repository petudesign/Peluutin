# Peluutin architecture

Peluutin is a React 19 and TypeScript PWA built with Vite.

## Boundaries

`App.tsx` coordinates the current team and match. It delegates rendering to feature components and persists through `matchRepository`.

- Shared UI: reusable dialogs, navigation, onboarding and match header.
- Match feature: field, bench, player details and new-match flow.
- Teams feature: team, player, formation and history settings.
- Data: local persistence adapter.
- Domain: TypeScript types and pure formation logic.

The repository boundary is intentionally small. A future authenticated backend can implement the same load/save responsibilities without coupling API requests to UI components.

## State and data flow

The app keeps the live match in React state. A paused or running match is continuously serialized locally, so refreshing the page restores it. Completed match records are stored under their team. User-entered data is validated when it crosses back from browser storage into the application.

## Current constraints

- No accounts, cloud synchronization or multi-user collaboration.
- Local browser data is the source of truth.
- One device cannot see another device's match without explicit export or sharing.
- Schema migrations should be added before persisted data structures change incompatibly.
