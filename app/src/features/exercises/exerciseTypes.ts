export type ExerciseView = "2d" | "3d";
export type ExerciseTool = "select" | "player-blue" | "player-red" | "ball" | "cone" | "dummy" | "pass" | "run" | "text" | "draw" | "line" | "rectangle" | "circle" | "erase";
export type ExercisePlayerRole = "goalkeeper" | "defender" | "midfielder" | "attacker";
export type ExerciseGoalSize = "small" | "youth" | "full";

export const EXERCISE_ROLE_OPTIONS: Array<{ value: ExercisePlayerRole; label: string; shortLabel: string; color: string }> = [
  { value: "goalkeeper", label: "Maalivahti", shortLabel: "MV", color: "#e1a629" },
  { value: "defender", label: "Puolustaja", shortLabel: "P", color: "#3182ce" },
  { value: "midfielder", label: "Keskikenttä", shortLabel: "K", color: "#27a786" },
  { value: "attacker", label: "Hyökkääjä", shortLabel: "H", color: "#df6a50" },
];
export const EXERCISE_LIGHT_CONTRAST_OUTLINE = "#0b1d22";

export interface ExerciseMarker {
  id: string;
  kind: "player" | "ball" | "cone" | "dummy";
  team?: "blue" | "red";
  role?: ExercisePlayerRole | "field";
  name: string;
  number?: number;
  x: number;
  z: number;
  /** Facing direction for directional equipment, in degrees. */
  rotation?: number;
}

export interface ExercisePath {
  id: string;
  kind: "pass" | "run";
  fromId: string;
  toId?: string;
  toPoint?: { x: number; z: number };
  startMs?: number;
  /** Optional playback duration override. Route geometry stays unchanged. */
  durationMs?: number;
  /** Legacy value kept only for migrating older locally saved drafts. */
  phase?: number;
  curve?: number;
}

export interface ExerciseTimelineEntry {
  pathId: string;
  startMs: number;
  durationMs: number;
}

export interface ExerciseAnnotation {
  id: string;
  kind: "text" | "draw" | "line" | "rectangle" | "circle";
  color: string;
  text?: string;
  points: Array<{ x: number; z: number }>;
}

export interface ExerciseDraft {
  name: string;
  notes: string;
  markers: ExerciseMarker[];
  paths: ExercisePath[];
  annotations: ExerciseAnnotation[];
  goalSize: ExerciseGoalSize;
  updatedAt: string;
}

export function normalizeExercisePlayerRole(role: ExerciseMarker["role"]): ExercisePlayerRole {
  return EXERCISE_ROLE_OPTIONS.some(option => option.value === role) ? role as ExercisePlayerRole : "midfielder";
}

export function getExerciseMarkerColor(marker: ExerciseMarker, theme: "light" | "dark" = "dark") {
  if (marker.kind === "ball") return "#f3aa2b";
  if (marker.kind === "cone") return "#f28a2e";
  if (marker.kind === "dummy") return "#bfd632";
  if (marker.team === "red") return theme === "light" ? "#545f65" : "#747f85";
  if (theme === "light") return ({ goalkeeper: "#a66800", defender: "#075fba", midfielder: "#087856", attacker: "#b44731" } as const)[normalizeExercisePlayerRole(marker.role)];
  return EXERCISE_ROLE_OPTIONS.find(option => option.value === normalizeExercisePlayerRole(marker.role))!.color;
}

export function getExercisePathColor(kind: ExercisePath["kind"], theme: "light" | "dark") {
  if (kind === "pass") return theme === "light" ? "#8a4e00" : "#ffb21c";
  return theme === "light" ? "#004f9e" : "#75d7ff";
}

export function canPassBetween(from: ExerciseMarker, to: ExerciseMarker) {
  if (!["player", "ball"].includes(from.kind) || !["player", "ball"].includes(to.kind)) return false;
  return from.kind === "ball" || to.kind === "ball" || from.team === to.team;
}

export function keepSingleBall(markers: ExerciseMarker[]) {
  let hasBall = false;
  return markers.filter((marker) => marker.kind !== "ball" || (!hasBall && (hasBall = true)));
}

export function createExerciseMarkerCopy(markers: ExerciseMarker[], source: ExerciseMarker, sequence: number, id: string) {
  if (source.kind === "ball" && markers.some(marker => marker.kind === "ball")) return null;
  if (source.kind === "player" && source.team && !canAddTeamPlayer(markers, source.team)) return null;
  const offset = Math.max(1, sequence) * .32;
  return {
    ...source,
    id,
    x: Math.max(-5.5, Math.min(5.5, source.x + offset)),
    z: Math.max(-3.5, Math.min(3.5, source.z + offset)),
  };
}

export function canAddTeamPlayer(markers: ExerciseMarker[], team: "blue" | "red") {
  return markers.filter((marker) => marker.kind === "player" && marker.team === team).length < 11;
}

export function formatRouteCount(count: number) {
  return `${count} ${count === 1 ? "reitti" : "reittiä"}`;
}

export function isExercisePathValid(path: ExercisePath, markers: ExerciseMarker[]) {
  const from = markers.find((marker) => marker.id === path.fromId);
  if (!from) return false;
  if (path.toId) {
    const to = markers.find((marker) => marker.id === path.toId);
    return Boolean(to && (path.kind === "run" || canPassBetween(from, to)));
  }
  return path.kind === "run" && Number.isFinite(path.toPoint?.x) && Number.isFinite(path.toPoint?.z);
}

const FIELD_METERS_PER_UNIT = 8.75;
export const EXERCISE_MIN_DURATION_MS = 300;
export const EXERCISE_MAX_DURATION_MS = 5000;
export const EXERCISE_NATURAL_SPEEDS = { passKmh: 54, runKmh: 18 } as const;

function pathPhase(path: ExercisePath, index: number) {
  return Number.isInteger(path.phase) && (path.phase ?? -1) >= 0 ? path.phase! : index;
}

export function getExercisePathNaturalDurationMs(path: ExercisePath, markers: ExerciseMarker[]) {
  const from = markers.find(marker => marker.id === path.fromId);
  const to = path.toId ? markers.find(marker => marker.id === path.toId) : path.toPoint;
  if (!from || !to) return 0;
  const distanceMeters = Math.hypot(to.x - from.x, to.z - from.z) * FIELD_METERS_PER_UNIT * (1 + Math.abs(path.curve ?? 0) * .18);
  const metersPerSecond = (path.kind === "pass" ? EXERCISE_NATURAL_SPEEDS.passKmh : EXERCISE_NATURAL_SPEEDS.runKmh) / 3.6;
  return Math.max(EXERCISE_MIN_DURATION_MS, distanceMeters / metersPerSecond * 1000);
}

export function getExercisePathDurationMs(path: ExercisePath, markers: ExerciseMarker[]) {
  const naturalDuration = getExercisePathNaturalDurationMs(path, markers);
  if (!naturalDuration) return 0;
  const duration = Number.isFinite(path.durationMs) ? path.durationMs! : naturalDuration;
  return Math.min(EXERCISE_MAX_DURATION_MS, Math.max(EXERCISE_MIN_DURATION_MS, duration));
}

export function normalizeExerciseTimeline(paths: ExercisePath[], markers: ExerciseMarker[]) {
  if (paths.every(path => Number.isFinite(path.startMs) && (path.startMs ?? -1) >= 0)) {
    return paths.map(path => ({ ...path, startMs: Math.round(path.startMs!), phase: undefined }));
  }
  const starts = new Map<number, number>();
  let startMs = 0;
  const phases = [...new Set(paths.map(pathPhase))].sort((a, b) => a - b);
  phases.forEach(phase => {
    starts.set(phase, startMs);
    const phasePaths = paths.filter((path, index) => pathPhase(path, index) === phase);
    startMs += Math.max(1, ...phasePaths.map(path => getExercisePathDurationMs(path, markers)));
  });
  return paths.map((path, index) => ({ ...path, startMs: Math.round(starts.get(pathPhase(path, index)) ?? 0), phase: undefined }));
}

export function buildExerciseTimeline(paths: ExercisePath[], markers: ExerciseMarker[]) {
  const normalized = normalizeExerciseTimeline(paths, markers);
  const entries = normalized.map(path => ({ pathId: path.id, startMs: path.startMs ?? 0, durationMs: getExercisePathDurationMs(path, markers) }));
  return { entries, totalMs: Math.max(1, ...entries.map(entry => entry.startMs + entry.durationMs)) };
}

export function getNextExercisePathStartMs(paths: ExercisePath[], markers: ExerciseMarker[]) {
  return paths.length ? Math.ceil(buildExerciseTimeline(paths, markers).totalMs / 100) * 100 : 0;
}

function intervalsOverlap(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB && startA + durationA > startB;
}

export function setExercisePathStartMs(paths: ExercisePath[], pathId: string, requestedStartMs: number, markers: ExerciseMarker[]) {
  const normalized = normalizeExerciseTimeline(paths, markers), selected = normalized.find(path => path.id === pathId);
  if (!selected) return normalized;
  const duration = getExercisePathDurationMs(selected, markers);
  let startMs = Math.max(0, Math.round(requestedStartMs / 50) * 50);
  if (selected.kind === "pass") {
    const others = normalized.filter(path => path.id !== pathId && path.kind === "pass")
      .map(path => ({ start: path.startMs ?? 0, duration: getExercisePathDurationMs(path, markers) }))
      .sort((a, b) => a.start - b.start);
    for (let attempt = 0; attempt <= others.length; attempt += 1) {
      const overlap = others.find(other => intervalsOverlap(startMs, duration, other.start, other.duration));
      if (!overlap) break;
      const before = overlap.start - duration;
      const after = overlap.start + overlap.duration;
      startMs = before >= 0 && Math.abs(startMs - before) <= Math.abs(after - startMs) ? before : after;
    }
  }
  return normalized.map(path => path.id === pathId ? { ...path, startMs: Math.max(0, Math.round(startMs)) } : path);
}

export function setExercisePathDurationMs(paths: ExercisePath[], pathId: string, requestedDurationMs: number, markers: ExerciseMarker[]) {
  const normalized = normalizeExerciseTimeline(paths, markers), selected = normalized.find(path => path.id === pathId);
  if (!selected) return normalized;
  let durationMs = Math.min(EXERCISE_MAX_DURATION_MS, Math.max(EXERCISE_MIN_DURATION_MS, Math.round(requestedDurationMs / 50) * 50));
  if (selected.kind === "pass") {
    const nextPass = normalized.filter(path => path.id !== pathId && path.kind === "pass" && (path.startMs ?? 0) > (selected.startMs ?? 0))
      .sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0))[0];
    if (nextPass) durationMs = Math.min(durationMs, Math.max(EXERCISE_MIN_DURATION_MS, (nextPass.startMs ?? 0) - (selected.startMs ?? 0)));
  }
  return normalized.map(path => path.id === pathId ? { ...path, durationMs } : path);
}

export function resetExercisePathDuration(paths: ExercisePath[], pathId: string, markers: ExerciseMarker[]) {
  let normalized = normalizeExerciseTimeline(paths, markers).map(path => path.id === pathId ? { ...path, durationMs: undefined } : path);
  const selected = normalized.find(path => path.id === pathId);
  if (selected?.kind !== "pass") return normalized;
  const passes = normalized.filter(path => path.kind === "pass").sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0));
  const selectedIndex = passes.findIndex(path => path.id === pathId);
  for (let index = Math.max(1, selectedIndex + 1); index < passes.length; index += 1) {
    const previous = passes[index - 1], current = passes[index];
    const earliestStart = (previous.startMs ?? 0) + getExercisePathDurationMs(previous, markers);
    if ((current.startMs ?? 0) < earliestStart) current.startMs = Math.round(earliestStart);
  }
  const starts = new Map(passes.map(path => [path.id, path.startMs]));
  normalized = normalized.map(path => starts.has(path.id) ? { ...path, startMs: starts.get(path.id)! } : path);
  return normalized;
}

export function getExerciseTimelineProgressAt(positionMs: number, entry: ExerciseTimelineEntry, totalMs: number) {
  const position = Math.min(Math.max(1, totalMs), Math.max(0, positionMs));
  const active = position >= entry.startMs && position < entry.startMs + entry.durationMs;
  return { active, progress: active ? (position - entry.startMs) / Math.max(1, entry.durationMs) : 0 };
}

export function getExerciseTimelineProgress(elapsedMs: number, speed: number, entry: ExerciseTimelineEntry, totalMs: number) {
  return getExerciseTimelineProgressAt(Math.max(0, elapsedMs) * Math.max(.1, speed), entry, totalMs);
}

export function getExercise2dFitZoom(width: number, height: number) {
  const usableWidth = Math.max(width - 180, 360);
  const usableHeight = Math.max(height - 160, 360);
  return Math.min(usableWidth / 12.8, usableHeight / 8.8);
}
