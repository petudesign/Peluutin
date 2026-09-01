import type { ExerciseDraft } from "./exerciseTypes";

export const EXERCISE_DRAFT_STORAGE_KEY = "peluutin-exercise-draft-v1";
export const EXERCISE_LIBRARY_STORAGE_KEY = "peluutin-exercise-library-v1";

export interface SavedExercise {
  id: string;
  teamId: string;
  name: string;
  draft: ExerciseDraft;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseBackupData {
  drafts: Record<string, ExerciseDraft>;
  savedExercises: SavedExercise[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function isDraft(value: unknown): value is ExerciseDraft {
  return isRecord(value)
    && typeof value.name === "string"
    && typeof value.notes === "string"
    && Array.isArray(value.markers)
    && Array.isArray(value.paths)
    && Array.isArray(value.annotations)
    && typeof value.goalSize === "string"
    && typeof value.pitchPreset === "string"
    && typeof value.pitchOrientation === "string"
    && typeof value.pitchStyle === "string";
}

function isSavedExercise(value: unknown): value is SavedExercise {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.teamId === "string"
    && typeof value.name === "string"
    && isDraft(value.draft)
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}

export function readStoredExerciseDraft(teamId: string): ExerciseDraft | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`${EXERCISE_DRAFT_STORAGE_KEY}-${teamId}`) || "null");
    return isDraft(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredExerciseDraft(teamId: string, draft: ExerciseDraft): void {
  localStorage.setItem(`${EXERCISE_DRAFT_STORAGE_KEY}-${teamId}`, JSON.stringify(draft));
}

export function loadSavedExercises(): SavedExercise[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(EXERCISE_LIBRARY_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(isSavedExercise) : [];
  } catch {
    return [];
  }
}

export function saveSavedExercises(exercises: SavedExercise[]): void {
  localStorage.setItem(EXERCISE_LIBRARY_STORAGE_KEY, JSON.stringify(exercises));
}

export function exerciseDraftContentKey(draft: ExerciseDraft): string {
  return JSON.stringify({
    name: draft.name,
    notes: draft.notes,
    exerciseTheme: draft.exerciseTheme || "",
    coachingPoints: draft.coachingPoints || "",
    keyQuestions: draft.keyQuestions || "",
    markers: draft.markers,
    paths: draft.paths,
    annotations: draft.annotations,
    goalSize: draft.goalSize,
    pitchPreset: draft.pitchPreset,
    pitchOrientation: draft.pitchOrientation,
    pitchStyle: draft.pitchStyle,
  });
}

export function collectExerciseBackup(teamIds: string[]): ExerciseBackupData {
  const drafts: Record<string, ExerciseDraft> = {};
  teamIds.forEach(teamId => {
    const draft = readStoredExerciseDraft(teamId);
    if (draft) drafts[teamId] = draft;
  });
  return { drafts, savedExercises: loadSavedExercises() };
}

export function restoreExerciseBackup(data: ExerciseBackupData): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(`${EXERCISE_DRAFT_STORAGE_KEY}-`)) localStorage.removeItem(key);
  }
  Object.entries(data.drafts).forEach(([teamId, draft]) => writeStoredExerciseDraft(teamId, draft));
  saveSavedExercises(data.savedExercises);
}
