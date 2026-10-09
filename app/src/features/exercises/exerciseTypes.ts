export type ExerciseView = "2d" | "3d";
export type ExerciseTool = "select" | "player-blue" | "player-red" | "ball" | "cone" | "tall-cone" | "bench" | "ladder" | "dummy" | "goal-small" | "goal-youth" | "goal-full" | "pass" | "run" | "dribble" | "shot" | "text" | "draw" | "line" | "arrow" | "rectangle" | "circle" | "erase";
export type ExercisePlayerRole = "goalkeeper" | "defender" | "midfielder" | "attacker";
export type ExerciseGoalSize = "small" | "youth" | "full";
export type ExercisePitchPreset = "training" | "full";
export type ExercisePitchOrientation = "landscape" | "portrait";
export type ExercisePitchStyle = "dark" | "grass" | "plain-grass";

export const EXERCISE_PITCH_DIMENSIONS: Record<ExercisePitchPreset, { length: number; width: number; groundLength: number; groundWidth: number }> = {
  training: { length: 11.5, width: 7.5, groundLength: 13, groundWidth: 8.8 },
  full: { length: 16, width: 10.4, groundLength: 17.2, groundWidth: 11.4 },
};

export const EXERCISE_ROLE_OPTIONS: Array<{ value: ExercisePlayerRole; label: string; shortLabel: string; color: string }> = [
  { value: "goalkeeper", label: "Maalivahti", shortLabel: "MV", color: "#e1a629" },
  { value: "defender", label: "Puolustaja", shortLabel: "P", color: "#3182ce" },
  { value: "midfielder", label: "Keskikenttä", shortLabel: "K", color: "#27a786" },
  { value: "attacker", label: "Hyökkääjä", shortLabel: "H", color: "#df6a50" },
];

export interface ExerciseMarker {
  id: string;
  kind: "player" | "ball" | "cone" | "tall-cone" | "bench" | "ladder" | "dummy" | "goal";
  team?: "blue" | "red";
  role?: ExercisePlayerRole | "field";
  color?: string;
  name: string;
  number?: number;
  x: number;
  z: number;
  /** Facing direction for directional equipment, in degrees. */
  rotation?: number;
  goalSize?: ExerciseGoalSize;
}

export interface ExercisePath {
  id: string;
  kind: "pass" | "run" | "dribble" | "shot";
  fromId: string;
  toId?: string;
  toPoint?: { x: number; z: number };
  startMs?: number;
  timelineLane?: number;
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
  from?: { x: number; z: number };
  to?: { x: number; z: number };
  naturalDurationMs?: number;
}

export interface ExerciseAnnotation {
  id: string;
  kind: "text" | "draw" | "line" | "arrow" | "rectangle" | "circle";
  color: string;
  width?: 1 | 2 | 3;
  text?: string;
  points: Array<{ x: number; z: number }>;
}

export function getExerciseAnnotationPoints(item: ExerciseAnnotation): Array<{ x: number; z: number }> {
  const first = item.points[0], last = item.points.at(-1);
  if (!first || !last) return [];
  if (item.kind === "arrow") {
    const dx = last.x - first.x, dz = last.z - first.z, length = Math.hypot(dx, dz);
    if (length < .0001) return [first, last];
    const ux = dx / length, uz = dz / length, head = Math.min(.4, length * .3);
    return [first, last,
      { x: last.x - ux * head - uz * head * .55, z: last.z - uz * head + ux * head * .55 },
      last,
      { x: last.x - ux * head + uz * head * .55, z: last.z - uz * head - ux * head * .55 }];
  }
  if (item.kind === "rectangle") return [first, { x: last.x, z: first.z }, last, { x: first.x, z: last.z }, first];
  if (item.kind === "circle") {
    const radiusX = Math.abs(last.x - first.x), radiusZ = Math.abs(last.z - first.z);
    return Array.from({ length: 97 }, (_, index) => {
      const angle = index / 96 * Math.PI * 2;
      return { x: first.x + Math.cos(angle) * radiusX, z: first.z + Math.sin(angle) * radiusZ };
    });
  }
  return item.points;
}

export function exerciseAnnotationIntersectsBox(item: ExerciseAnnotation, box: { left: number; right: number; top: number; bottom: number }): boolean {
  const points = getExerciseAnnotationPoints(item);
  if (points.some(point => point.x >= box.left && point.x <= box.right && point.z >= box.top && point.z <= box.bottom)) return true;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1], end = points[index];
    let min = 0, max = 1;
    for (const [origin, delta, low, high] of [[start.x, end.x - start.x, box.left, box.right], [start.z, end.z - start.z, box.top, box.bottom]]) {
      if (Math.abs(delta) < 1e-10) { if (origin < low || origin > high) { max = -1; break; } }
      else { const a = (low - origin) / delta, b = (high - origin) / delta; min = Math.max(min, Math.min(a, b)); max = Math.min(max, Math.max(a, b)); }
    }
    if (min <= max) return true;
  }
  return false;
}

export interface ExerciseDraft {
  name: string;
  notes: string;
  exerciseTheme?: string;
  coachingPoints?: string;
  keyQuestions?: string;
  markers: ExerciseMarker[];
  paths: ExercisePath[];
  annotations: ExerciseAnnotation[];
  goalSize: ExerciseGoalSize;
  pitchPreset: ExercisePitchPreset;
  pitchOrientation: ExercisePitchOrientation;
  pitchStyle: ExercisePitchStyle;
  updatedAt: string;
}

export type ExerciseLayerKind = "marker" | "path" | "annotation";

export function removeExerciseLayer(draft: ExerciseDraft, kind: ExerciseLayerKind, id: string): ExerciseDraft {
  if (kind === "marker") {
    if (!draft.markers.some(marker => marker.id === id)) return draft;
    return { ...draft, markers: draft.markers.filter(marker => marker.id !== id), paths: draft.paths.filter(path => path.fromId !== id && path.toId !== id) };
  }
  if (kind === "path") return draft.paths.some(path => path.id === id) ? { ...draft, paths: draft.paths.filter(path => path.id !== id) } : draft;
  return draft.annotations.some(item => item.id === id) ? { ...draft, annotations: draft.annotations.filter(item => item.id !== id) } : draft;
}

export function resizeExerciseDraftContent(draft: ExerciseDraft, nextPreset: ExercisePitchPreset): ExerciseDraft {
  if (draft.pitchPreset === nextPreset) return draft;
  const current = EXERCISE_PITCH_DIMENSIONS[draft.pitchPreset], next = EXERCISE_PITCH_DIMENSIONS[nextPreset];
  const scalePoint = ({ x, z }: { x: number; z: number }) => ({ x: x * next.length / current.length, z: z * next.width / current.width });
  return {
    ...draft,
    pitchPreset: nextPreset,
    markers: draft.markers.map(marker => ({ ...marker, ...scalePoint(marker) })),
    paths: draft.paths.map(path => path.toPoint ? { ...path, toPoint: scalePoint(path.toPoint) } : path),
    annotations: draft.annotations.map(annotation => ({ ...annotation, points: annotation.points.map(scalePoint) })),
  };
}

export function moveExerciseMarkerSelection(markers: ExerciseMarker[], selectedIds: string[], anchorId: string, x: number, z: number, preset: ExercisePitchPreset) {
  const selected = markers.filter(marker => selectedIds.includes(marker.id));
  const anchor = selected.find(marker => marker.id === anchorId);
  if (!anchor || !selected.length) return markers;
  const dimensions = EXERCISE_PITCH_DIMENSIONS[preset], limitX = dimensions.length / 2 - .25, limitZ = dimensions.width / 2 - .25;
  const requestedX = x - anchor.x, requestedZ = z - anchor.z;
  const deltaX = Math.max(-limitX - Math.min(...selected.map(marker => marker.x)), Math.min(requestedX, limitX - Math.max(...selected.map(marker => marker.x))));
  const deltaZ = Math.max(-limitZ - Math.min(...selected.map(marker => marker.z)), Math.min(requestedZ, limitZ - Math.max(...selected.map(marker => marker.z))));
  const ids = new Set(selectedIds);
  return markers.map(marker => ids.has(marker.id) ? { ...marker, x: marker.x + deltaX, z: marker.z + deltaZ } : marker);
}

export function normalizeExercisePlayerRole(role: ExerciseMarker["role"]): ExercisePlayerRole {
  return EXERCISE_ROLE_OPTIONS.some(option => option.value === role) ? role as ExercisePlayerRole : "midfielder";
}

export function getExerciseMarkerColor(marker: ExerciseMarker, _theme: "light" | "dark" = "dark") {
  if (marker.color) return marker.color;
  if (marker.kind === "ball") return "#f3aa2b";
  if (marker.kind === "cone") return "#f28a2e";
  if (marker.kind === "tall-cone") return "#f06d24";
  if (marker.kind === "bench") return "#8aa0aa";
  if (marker.kind === "ladder") return "#f3c43c";
  if (marker.kind === "dummy") return "#bfd632";
  if (marker.kind === "goal") return "#e4ebed";
  if (marker.team === "red") return "#545f65";
  return ({ goalkeeper: "#a66800", defender: "#075fba", midfielder: "#087856", attacker: "#b44731" } as const)[normalizeExercisePlayerRole(marker.role)];
}

export function getExercisePathColor(kind: ExercisePath["kind"], _theme: "light" | "dark") {
  if (kind === "pass") return "#ffb21c";
  if (kind === "run") return "#75d7ff";
  if (kind === "dribble") return "#65e2b1";
  return "#ff766c";
}

export function isExerciseBallPath(kind: ExercisePath["kind"]) {
  return kind === "pass" || kind === "dribble" || kind === "shot";
}

export function canTargetExercisePath(kind: ExercisePath["kind"], from: ExerciseMarker, to: ExerciseMarker) {
  if (kind === "pass") return canPassBetween(from, to);
  if (kind === "shot") return (from.kind === "player" || from.kind === "ball") && to.kind === "goal";
  return (from.kind === "player" || from.kind === "ball") && (to.kind === "player" || to.kind === "ball");
}

export function canPassBetween(from: ExerciseMarker, to: ExerciseMarker) {
  if (!["player", "ball"].includes(from.kind) || !["player", "ball"].includes(to.kind)) return false;
  return true;
}

export function createExerciseMarkerCopy(markers: ExerciseMarker[], source: ExerciseMarker, sequence: number, id: string) {
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
  if (!from || (from.kind !== "player" && from.kind !== "ball")) return false;
  if (path.toId) {
    const to = markers.find((marker) => marker.id === path.toId);
    return Boolean(to && canTargetExercisePath(path.kind, from, to));
  }
  return Number.isFinite(path.toPoint?.x) && Number.isFinite(path.toPoint?.z);
}

const FIELD_METERS_PER_UNIT = 8.75;
export const EXERCISE_MIN_DURATION_MS = 300;
export const EXERCISE_MAX_DURATION_MS = 5000;
export const EXERCISE_NATURAL_SPEEDS = { passKmh: 54, runKmh: 18, dribbleKmh: 12, shotKmh: 75 } as const;

function pathPhase(path: ExercisePath, index: number) {
  return Number.isInteger(path.phase) && (path.phase ?? -1) >= 0 ? path.phase! : index;
}

export function getExercisePathNaturalDurationMs(path: ExercisePath, markers: ExerciseMarker[]) {
  const from = markers.find(marker => marker.id === path.fromId);
  const to = path.toId ? markers.find(marker => marker.id === path.toId) : path.toPoint;
  if (!from || !to) return 0;
  const distanceMeters = Math.hypot(to.x - from.x, to.z - from.z) * FIELD_METERS_PER_UNIT * (1 + Math.abs(path.curve ?? 0) * .18);
  const metersPerSecond = ({ pass: EXERCISE_NATURAL_SPEEDS.passKmh, run: EXERCISE_NATURAL_SPEEDS.runKmh, dribble: EXERCISE_NATURAL_SPEEDS.dribbleKmh, shot: EXERCISE_NATURAL_SPEEDS.shotKmh } as const)[path.kind] / 3.6;
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

export function getExerciseMovementPosition(from: { x: number; z: number }, to: { x: number; z: number }, curve: number, progress: number) {
  const t = Math.min(1, Math.max(0, progress)), dx = to.x - from.x, dz = to.z - from.z;
  const bend = Math.abs(curve) < .01 ? 0 : 2 * (1 - t) * t * curve * .38;
  return { x: from.x + dx * t - dz * bend, z: from.z + dz * t + dx * bend };
}

export function getExerciseMarkerPositionAt(marker: ExerciseMarker, paths: ExercisePath[], entries: ExerciseTimelineEntry[], positionMs: number) {
  let latest: ExerciseTimelineEntry | undefined, movement: ExercisePath | undefined;
  for (const entry of entries) {
    if (entry.startMs > positionMs || !entry.from || !entry.to) continue;
    const path = paths.find(item => item.id === entry.pathId);
    if (!path || path.fromId !== marker.id || (path.kind !== "run" && path.kind !== "dribble")) continue;
    if (!latest || entry.startMs >= latest.startMs) { latest = entry; movement = path; }
  }
  if (!latest?.from || !latest.to || !movement) return { x: marker.x, z: marker.z };
  return getExerciseMovementPosition(latest.from, latest.to, movement.curve ?? 0, (positionMs - latest.startMs) / Math.max(1, latest.durationMs));
}

export function buildExerciseTimeline(paths: ExercisePath[], markers: ExerciseMarker[]) {
  const normalized = normalizeExerciseTimeline(paths, markers);
  const chronological = [...normalized].sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0));
  const resolved: ExerciseTimelineEntry[] = [];
  chronological.forEach(path => {
    const startMs = path.startMs ?? 0;
    const source = markers.find(marker => marker.id === path.fromId);
    const target = path.toId ? markers.find(marker => marker.id === path.toId) : undefined;
    const from = source ? getExerciseMarkerPositionAt(source, normalized, resolved, startMs) : undefined;
    const to = target ? getExerciseMarkerPositionAt(target, normalized, resolved, startMs) : path.toPoint;
    const positionedMarkers = markers.map(marker => marker.id === source?.id && from ? { ...marker, ...from } : marker.id === target?.id && to ? { ...marker, ...to } : marker);
    const positionedPath = path.toId ? path : { ...path, toPoint: to };
    const naturalDurationMs = getExercisePathNaturalDurationMs(positionedPath, positionedMarkers);
    resolved.push({ pathId: path.id, startMs, durationMs: getExercisePathDurationMs(positionedPath, positionedMarkers), from, to, naturalDurationMs });
  });
  const byId = new Map(resolved.map(entry => [entry.pathId, entry]));
  const entries = normalized.map(path => byId.get(path.id)!);
  return { entries, totalMs: Math.max(1, ...entries.map(entry => entry.startMs + entry.durationMs)) };
}

export function getNextExercisePathStartMs(paths: ExercisePath[], markers: ExerciseMarker[]) {
  return paths.length ? Math.ceil(buildExerciseTimeline(paths, markers).totalMs / 100) * 100 : 0;
}

export function setExercisePathStartMs(paths: ExercisePath[], pathId: string, requestedStartMs: number, markers: ExerciseMarker[]) {
  const normalized = normalizeExerciseTimeline(paths, markers);
  const startMs = Math.max(0, Math.round(requestedStartMs / 50) * 50);
  return normalized.map(path => path.id === pathId ? { ...path, startMs } : path);
}

export function setExercisePathDurationMs(paths: ExercisePath[], pathId: string, requestedDurationMs: number, markers: ExerciseMarker[]) {
  const normalized = normalizeExerciseTimeline(paths, markers), selected = normalized.find(path => path.id === pathId);
  if (!selected) return normalized;
  let durationMs = Math.min(EXERCISE_MAX_DURATION_MS, Math.max(EXERCISE_MIN_DURATION_MS, Math.round(requestedDurationMs / 50) * 50));
  return normalized.map(path => path.id === pathId ? { ...path, durationMs } : path);
}

export function resetExercisePathDuration(paths: ExercisePath[], pathId: string, markers: ExerciseMarker[]) {
  return normalizeExerciseTimeline(paths, markers).map(path => path.id === pathId ? { ...path, durationMs: undefined } : path);
}

export function getExerciseTimelineProgressAt(positionMs: number, entry: ExerciseTimelineEntry, totalMs: number) {
  const position = Math.min(Math.max(1, totalMs), Math.max(0, positionMs));
  const active = position >= entry.startMs && position < entry.startMs + entry.durationMs;
  return { active, progress: active ? (position - entry.startMs) / Math.max(1, entry.durationMs) : 0 };
}

export function getExerciseTimelineProgress(elapsedMs: number, speed: number, entry: ExerciseTimelineEntry, totalMs: number) {
  return getExerciseTimelineProgressAt(Math.max(0, elapsedMs) * Math.max(.1, speed), entry, totalMs);
}

export function getExercise2dFitZoom(width: number, height: number, preset: ExercisePitchPreset = "training", orientation: ExercisePitchOrientation = "landscape") {
  const pitch = EXERCISE_PITCH_DIMENSIONS[preset];
  const renderedWidth = orientation === "landscape" ? pitch.groundLength : pitch.groundWidth;
  const renderedHeight = orientation === "landscape" ? pitch.groundWidth : pitch.groundLength;
  const usableWidth = Math.max(width - 180, 360);
  const usableHeight = Math.max(height - 160, 360);
  return Math.min(usableWidth / renderedWidth, usableHeight / renderedHeight);
}
