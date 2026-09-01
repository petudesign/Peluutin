import { parseActiveMatch, parseScheduledMatches, parseTeams } from "../storage";
import type { ActiveMatch, Formation, ScheduledMatch, Team } from "../types";

export const BACKUP_VERSION = 1;

export interface PeluutinBackup {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  teams: Team[];
  scheduledMatches: ScheduledMatch[];
  activeMatch: ActiveMatch | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function createBackup(
  teams: Team[],
  scheduledMatches: ScheduledMatch[],
  activeMatch: ActiveMatch | null,
): PeluutinBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    teams,
    scheduledMatches,
    activeMatch,
  };
}

export function serializeBackup(backup: PeluutinBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(raw: string, defaultFormations: Formation[]): PeluutinBackup {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Varmuuskopiotiedosto ei ole kelvollinen JSON-tiedosto.");
  }

  if (!isRecord(value) || value.version !== BACKUP_VERSION || !Array.isArray(value.teams) || !Array.isArray(value.scheduledMatches)) {
    throw new Error("Varmuuskopion versio tai rakenne ei ole tuettu.");
  }

  const teams = parseTeams(JSON.stringify(value.teams), defaultFormations);
  const scheduledMatches = parseScheduledMatches(JSON.stringify(value.scheduledMatches));
  const activeMatch = value.activeMatch === null || value.activeMatch === undefined
    ? null
    : parseActiveMatch(JSON.stringify(value.activeMatch));

  if (!teams.length || (value.activeMatch !== null && value.activeMatch !== undefined && !activeMatch)) {
    throw new Error("Varmuuskopiosta ei löytynyt palautettavia tietoja.");
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : new Date().toISOString(),
    teams,
    scheduledMatches,
    activeMatch,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} t`;
  return `${(bytes / 1024).toLocaleString("fi-FI", { maximumFractionDigits: 1 })} kt`;
}

export function getBackupSizeBytes(backup: PeluutinBackup): number {
  return new Blob([serializeBackup(backup)]).size;
}
