import { parseActiveMatch, parseScheduledMatches, parseTeams } from "../storage";
import type { ExerciseBackupData, SavedExercise } from "../features/exercises/exerciseStorage";
import type { ActiveMatch, Formation, ScheduledMatch, Team } from "../types";

export const BACKUP_VERSION = 2;

export interface PeluutinBackup {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  teams: Team[];
  scheduledMatches: ScheduledMatch[];
  activeMatch: ActiveMatch | null;
  exercises: ExerciseBackupData;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function createBackup(
  teams: Team[],
  scheduledMatches: ScheduledMatch[],
  activeMatch: ActiveMatch | null,
  exercises: ExerciseBackupData = { drafts: {}, savedExercises: [] },
): PeluutinBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    teams,
    scheduledMatches,
    activeMatch,
    exercises,
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

  if (!isRecord(value) || ![1, BACKUP_VERSION].includes(value.version as number) || !Array.isArray(value.teams) || !Array.isArray(value.scheduledMatches)) {
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

  const exercisesValue = isRecord(value.exercises) ? value.exercises : {};
  const draftsValue = isRecord(exercisesValue.drafts) ? exercisesValue.drafts : {};
  const drafts = Object.fromEntries(Object.entries(draftsValue).filter(([, draft]) => isRecord(draft) && typeof draft.name === "string" && Array.isArray(draft.markers) && Array.isArray(draft.paths) && Array.isArray(draft.annotations))) as ExerciseBackupData["drafts"];
  const savedExercises = Array.isArray(exercisesValue.savedExercises)
    ? exercisesValue.savedExercises.filter((item): item is SavedExercise => isRecord(item) && typeof item.id === "string" && typeof item.teamId === "string" && typeof item.name === "string" && isRecord(item.draft) && Array.isArray(item.draft.markers) && Array.isArray(item.draft.paths) && Array.isArray(item.draft.annotations) && typeof item.createdAt === "string" && typeof item.updatedAt === "string")
    : [];

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : new Date().toISOString(),
    teams,
    scheduledMatches,
    activeMatch,
    exercises: { drafts, savedExercises },
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} t`;
  return `${(bytes / 1024).toLocaleString("fi-FI", { maximumFractionDigits: 1 })} kt`;
}

export function getBackupSizeBytes(backup: PeluutinBackup): number {
  return new Blob([serializeBackup(backup)]).size;
}
