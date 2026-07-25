# Peluutin

Peluutin is a Finnish, browser-based tool for tracking junior football lineups, substitutions, playing time and match history. The current version is a local-first PWA: team and match data stays in the browser unless the user explicitly shares or exports it.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
npm run check
```

`npm run check` runs strict TypeScript checking, unit tests and a production build.

## Structure

- `src/components/` contains shared UI components.
- `src/features/match/` contains match-specific views.
- `src/features/teams/` contains team and settings views.
- `src/data/` is the persistence boundary. UI code does not need to know the browser storage keys.
- `src/types.ts` is the shared domain model.
- `src/storage.ts` validates untrusted data read from browser storage.
- `src/export.ts` creates Excel match reports.

See [Architecture](../docs/architecture.md) and [Data model](../docs/data-model.md) for more detail.

## Persistence and privacy

Data is stored locally in the current browser profile. It is not synchronized between devices and there is no user account or server database yet. Clearing site data or removing the browser profile can delete locally stored data.
