import { getExerciseCourt, getExerciseHoops, getExercisePitchDimensions, type ExerciseCourtId, type ExercisePace, type ExercisePitchDimensions } from "./exerciseCourts.ts";

export type ExerciseView = "2d" | "3d";
export type ExerciseTool = "select" | "player-blue" | "player-red" | "ball" | "cone" | "tall-cone" | "bench" | "ladder" | "dummy" | "goal-small" | "goal-youth" | "goal-full" | "pass" | "run" | "dribble" | "shot" | "text" | "draw" | "line" | "arrow" | "rectangle" | "circle" | "erase";
export type ExercisePlayerRole = "goalkeeper" | "defender" | "midfielder" | "attacker";
export type ExerciseGoalSize = "small" | "youth" | "full";
export type ExercisePitchPreset = "training" | "half" | "full";
export type ExercisePitchOrientation = "landscape" | "portrait";
export type ExercisePitchStyle = "dark" | "grass" | "plain-grass" | "wood";

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
  /** How a pass travels; a missing value is a direct pass. */
  passStyle?: ExercisePassStyle;
  /** How a shot at the basket is taken; a missing value is a jump shot. */
  shotStyle?: ExerciseShotStyle;
}

/** A jump shot from where the player stands, a lay-up gliding in off one foot, or a dunk at the rim. */
export type ExerciseShotStyle = "jump" | "layup" | "dunk";

/**
 * How a lay-up and a dunk are taken: the take-off before the release, how long the ball is in the air after it, and
 * how far the player glides towards the basket (stopping short of it by `stopMeters`, never further than `maxGlideMeters`).
 */
export const EXERCISE_DRIVE_SHOTS = {
  layup: { takeoffMs: 420, flightMs: 650, stopMeters: .7, maxGlideMeters: 1.6 },
  // A dunker takes off close enough to reach over the front of the rim with straight arms.
  dunk: { takeoffMs: 480, flightMs: 380, stopMeters: .2, maxGlideMeters: 1.8 },
} as const;

/** The lay-up or dunk settings for a shot, or nothing for a jump shot. */
export function getExerciseDriveShot(path: ExercisePath) {
  return path.kind === "shot" && (path.shotStyle === "layup" || path.shotStyle === "dunk") ? EXERCISE_DRIVE_SHOTS[path.shotStyle] : undefined;
}

/** A direct pass flies straight (or along the ground), a lob loops high over defenders and a bounce pass hits the floor once. */
export type ExercisePassStyle = "direct" | "lob" | "bounce";

// A lob floats and a bounce pass loses pace off the floor, so both take longer than a direct pass over the same distance.
const PASS_STYLE_SPEED: Record<ExercisePassStyle, number> = { direct: 1, lob: .55, bounce: .8 };

export interface ExerciseTimelineEntry {
  pathId: string;
  startMs: number;
  durationMs: number;
  from?: { x: number; z: number };
  to?: { x: number; z: number };
  naturalDurationMs?: number;
  /** For a lay-up or dunk, the take-off: the shooter glides from `from` to `to` before releasing the ball. */
  glide?: { startMs: number; durationMs: number; from: { x: number; z: number }; to: { x: number; z: number } };
  /** A lob that the receiver catches in the air and finishes with a lay-up or dunk in the same jump. */
  alleyOop?: boolean;
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
  /** The court the exercise is drawn on. Missing on drafts saved before exercises had a court, which were all football. */
  court?: ExerciseCourtId;
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

function scaleExerciseDraftContent(draft: ExerciseDraft, current: ExercisePitchDimensions, next: ExercisePitchDimensions): ExerciseDraft {
  const scalePoint = ({ x, z }: { x: number; z: number }) => ({ x: x * next.length / current.length, z: z * next.width / current.width });
  return {
    ...draft,
    markers: draft.markers.map(marker => ({ ...marker, ...scalePoint(marker) })),
    paths: draft.paths.map(path => path.toPoint ? { ...path, toPoint: scalePoint(path.toPoint) } : path),
    annotations: draft.annotations.map(annotation => ({ ...annotation, points: annotation.points.map(scalePoint) })),
  };
}

export function resizeExerciseDraftContent(draft: ExerciseDraft, nextPreset: ExercisePitchPreset): ExerciseDraft {
  if (draft.pitchPreset === nextPreset) return draft;
  const scaled = scaleExerciseDraftContent(draft, getExercisePitchDimensions(draft.court, draft.pitchPreset), getExercisePitchDimensions(draft.court, nextPreset));
  return { ...scaled, pitchPreset: nextPreset };
}

/** Moves the exercise onto another court, keeping everything in the same place relative to the field. */
export function changeExerciseCourt(draft: ExerciseDraft, nextCourt: ExerciseCourtId): ExerciseDraft {
  const current = getExerciseCourt(draft.court), next = getExerciseCourt(nextCourt);
  if (current.id === next.id) return draft;
  const scaled = scaleExerciseDraftContent(draft, getExercisePitchDimensions(current.id, draft.pitchPreset), next.presets[0].dimensions);
  // A pass kind the new sport does not have, such as a bounce pass on a football pitch, becomes its default pass.
  const paths = scaled.paths.map(path => {
    const passStyle = path.passStyle && !next.passStyles.some(style => style.id === path.passStyle) ? undefined : path.passStyle;
    const shotStyle = path.shotStyle && !next.shotStyles.some(style => style.id === path.shotStyle) ? undefined : path.shotStyle;
    return passStyle === path.passStyle && shotStyle === path.shotStyle ? path : { ...path, passStyle, shotStyle };
  });
  return { ...scaled, paths, court: next.id, pitchPreset: next.presets[0].id, pitchStyle: next.defaultStyle };
}

/** On a court with baskets every shot goes into the basket nearest to where it was aimed. Returns the same draft when nothing moves. */
export function snapExerciseShotsToHoops(draft: ExerciseDraft): ExerciseDraft {
  const hoops = getExerciseHoops(draft.court, draft.pitchPreset);
  if (!hoops.length) return draft;
  let changed = false;
  const paths = draft.paths.map(path => {
    if (path.kind !== "shot" || !path.toPoint) return path;
    const target = path.toPoint, hoop = hoops.reduce((best, item) => Math.hypot(item.x - target.x, item.z - target.z) < Math.hypot(best.x - target.x, best.z - target.z) ? item : best);
    if (hoop.x === target.x && hoop.z === target.z) return path;
    changed = true;
    return { ...path, toPoint: { ...hoop } };
  });
  return changed ? { ...draft, paths } : draft;
}

export function moveExerciseMarkerSelection(markers: ExerciseMarker[], selectedIds: string[], anchorId: string, x: number, z: number, dimensions: ExercisePitchDimensions) {
  const selected = markers.filter(marker => selectedIds.includes(marker.id));
  const anchor = selected.find(marker => marker.id === anchorId);
  if (!anchor || !selected.length) return markers;
  const limitX = dimensions.length / 2 - .25, limitZ = dimensions.width / 2 - .25;
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

export function createExerciseMarkerCopy(markers: ExerciseMarker[], source: ExerciseMarker, sequence: number, id: string, maxPlayersPerTeam: number) {
  if (source.kind === "player" && source.team && !canAddTeamPlayer(markers, source.team, maxPlayersPerTeam)) return null;
  const offset = Math.max(1, sequence) * .32;
  return {
    ...source,
    id,
    x: Math.max(-5.5, Math.min(5.5, source.x + offset)),
    z: Math.max(-3.5, Math.min(3.5, source.z + offset)),
  };
}

export function canAddTeamPlayer(markers: ExerciseMarker[], team: "blue" | "red", maxPlayersPerTeam: number) {
  return markers.filter((marker) => marker.kind === "player" && marker.team === team).length < maxPlayersPerTeam;
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

const FOOTBALL_PACE = getExerciseCourt("football").pace;
export const EXERCISE_MIN_DURATION_MS = 300;
export const EXERCISE_MAX_DURATION_MS = 5000;
export const EXERCISE_NATURAL_SPEEDS = { passKmh: 54, runKmh: 18, dribbleKmh: 12, shotKmh: 75 } as const;

function pathPhase(path: ExercisePath, index: number) {
  return Number.isInteger(path.phase) && (path.phase ?? -1) >= 0 ? path.phase! : index;
}

export function getExercisePathNaturalDurationMs(path: ExercisePath, markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  // A lay-up or dunk is released at the basket, so its flight is short whatever the distance the player started from.
  const drive = getExerciseDriveShot(path);
  if (drive) return drive.flightMs;
  const from = markers.find(marker => marker.id === path.fromId);
  const to = path.toId ? markers.find(marker => marker.id === path.toId) : path.toPoint;
  if (!from || !to) return 0;
  const distanceMeters = Math.hypot(to.x - from.x, to.z - from.z) * pace.metersPerUnit * (1 + Math.abs(path.curve ?? 0) * .18);
  const metersPerSecond = ({ pass: EXERCISE_NATURAL_SPEEDS.passKmh * PASS_STYLE_SPEED[path.passStyle ?? "direct"], run: EXERCISE_NATURAL_SPEEDS.runKmh, dribble: EXERCISE_NATURAL_SPEEDS.dribbleKmh, shot: pace.shotKmh } as const)[path.kind] / 3.6;
  return Math.max(EXERCISE_MIN_DURATION_MS, distanceMeters / metersPerSecond * 1000);
}

export function getExercisePathDurationMs(path: ExercisePath, markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  const naturalDuration = getExercisePathNaturalDurationMs(path, markers, pace);
  if (!naturalDuration) return 0;
  const duration = Number.isFinite(path.durationMs) ? path.durationMs! : naturalDuration;
  return Math.min(EXERCISE_MAX_DURATION_MS, Math.max(EXERCISE_MIN_DURATION_MS, duration));
}

export function normalizeExerciseTimeline(paths: ExercisePath[], markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  if (paths.every(path => Number.isFinite(path.startMs) && (path.startMs ?? -1) >= 0)) {
    return paths.map(path => ({ ...path, startMs: Math.round(path.startMs!), phase: undefined }));
  }
  const starts = new Map<number, number>();
  let startMs = 0;
  const phases = [...new Set(paths.map(pathPhase))].sort((a, b) => a - b);
  phases.forEach(phase => {
    starts.set(phase, startMs);
    const phasePaths = paths.filter((path, index) => pathPhase(path, index) === phase);
    startMs += Math.max(1, ...phasePaths.map(path => getExercisePathDurationMs(path, markers, pace)));
  });
  return paths.map((path, index) => ({ ...path, startMs: Math.round(starts.get(pathPhase(path, index)) ?? 0), phase: undefined }));
}

export function getExerciseMovementPosition(from: { x: number; z: number }, to: { x: number; z: number }, curve: number, progress: number) {
  const t = Math.min(1, Math.max(0, progress)), dx = to.x - from.x, dz = to.z - from.z;
  const bend = Math.abs(curve) < .01 ? 0 : 2 * (1 - t) * t * curve * .38;
  return { x: from.x + dx * t - dz * bend, z: from.z + dz * t + dx * bend };
}

export function getExerciseMarkerPositionAt(marker: ExerciseMarker, paths: ExercisePath[], entries: ExerciseTimelineEntry[], positionMs: number) {
  // The latest movement that has begun decides where the marker is: a run, a dribble, or the take-off glide of a lay-up or dunk.
  let latest: { startMs: number; durationMs: number; from: { x: number; z: number }; to: { x: number; z: number }; curve: number } | undefined;
  for (const entry of entries) {
    const path = paths.find(item => item.id === entry.pathId);
    if (!path || path.fromId !== marker.id) continue;
    const movement = (path.kind === "run" || path.kind === "dribble") && entry.from && entry.to ? { startMs: entry.startMs, durationMs: entry.durationMs, from: entry.from, to: entry.to, curve: path.curve ?? 0 }
      : entry.glide ? { ...entry.glide, curve: 0 } : undefined;
    if (!movement || movement.startMs > positionMs) continue;
    if (!latest || movement.startMs >= latest.startMs) latest = movement;
  }
  if (!latest) return { x: marker.x, z: marker.z };
  return getExerciseMovementPosition(latest.from, latest.to, latest.curve, (positionMs - latest.startMs) / Math.max(1, latest.durationMs));
}

// A lay-up or dunk that begins within half a second after a lob arrives finishes it in the same jump: an alley-oop.
// One that begins before the ball has arrived would shoot without it, so it is not one.
const ALLEY_OOP_WINDOW_MS = 500;
const isAlleyOopFinish = (afterArrivalMs: number) => afterArrivalMs >= 0 && afterArrivalMs <= ALLEY_OOP_WINDOW_MS;

export function buildExerciseTimeline(paths: ExercisePath[], markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  const normalized = normalizeExerciseTimeline(paths, markers, pace);
  const chronological = [...normalized].sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0));
  const resolved: ExerciseTimelineEntry[] = [];
  chronological.forEach(path => {
    const startMs = path.startMs ?? 0;
    const source = markers.find(marker => marker.id === path.fromId);
    const target = path.toId ? markers.find(marker => marker.id === path.toId) : undefined;
    const from = source ? getExerciseMarkerPositionAt(source, normalized, resolved, startMs) : undefined;
    const position = (to: { x: number; z: number } | undefined) => ({
      markers: markers.map(marker => marker.id === source?.id && from ? { ...marker, ...from } : marker.id === target?.id && to ? { ...marker, ...to } : marker),
      path: path.toId ? path : { ...path, toPoint: to },
    });
    let to = target ? getExerciseMarkerPositionAt(target, normalized, resolved, startMs) : path.toPoint;
    // A pass leads a moving receiver: it goes to where they will be when the ball arrives. The flight time depends on the
    // distance, so the meeting point is found in a few rounds of flight time, then position at that moment.
    if (path.kind === "pass" && target) {
      for (let round = 0; round < 4; round += 1) {
        const flight = position(to), durationMs = getExercisePathDurationMs(flight.path, flight.markers, pace);
        to = getExerciseMarkerPositionAt(target, normalized, resolved, startMs + durationMs);
      }
    }
    const { markers: positionedMarkers, path: positionedPath } = position(to);
    const naturalDurationMs = getExercisePathNaturalDurationMs(positionedPath, positionedMarkers, pace);
    // A lay-up or dunk takes off before the release and glides towards the basket; the ball leaves the hands where the glide ends.
    const drive = getExerciseDriveShot(path);
    let glide: ExerciseTimelineEntry["glide"], release = from;
    if (drive && source && to) {
      const takeoffMs = Math.max(0, startMs - drive.takeoffMs), takeoff = getExerciseMarkerPositionAt(source, normalized, resolved, takeoffMs);
      const dx = to.x - takeoff.x, dz = to.z - takeoff.z, distance = Math.hypot(dx, dz);
      const length = Math.min(drive.maxGlideMeters / pace.metersPerUnit, Math.max(0, distance - drive.stopMeters / pace.metersPerUnit));
      release = distance > 0 ? { x: takeoff.x + dx / distance * length, z: takeoff.z + dz / distance * length } : takeoff;
      glide = { startMs: takeoffMs, durationMs: startMs - takeoffMs, from: takeoff, to: release };
    }
    resolved.push({ pathId: path.id, startMs, durationMs: getExercisePathDurationMs(positionedPath, positionedMarkers, pace), from: release, to, naturalDurationMs, glide });
  });
  // A lob that arrives just as its receiver takes off for a lay-up or dunk is an alley-oop: the receiver catches it in the
  // air, so the lob is aimed at where they are mid-glide, which is only known once their shot is resolved.
  resolved.forEach(entry => {
    const pass = normalized.find(path => path.id === entry.pathId);
    if (pass?.kind !== "pass" || pass.passStyle !== "lob" || !pass.toId) return;
    const arrival = entry.startMs + entry.durationMs;
    const finish = normalized.find(path => path.fromId === pass.toId && getExerciseDriveShot(path) && isAlleyOopFinish((resolved.find(item => item.pathId === path.id)?.startMs ?? -Infinity) - arrival));
    const receiver = markers.find(marker => marker.id === pass.toId);
    if (!finish || !receiver) return;
    entry.alleyOop = true;
    entry.to = getExerciseMarkerPositionAt(receiver, normalized, resolved, arrival);
  });
  const byId = new Map(resolved.map(entry => [entry.pathId, entry]));
  const entries = normalized.map(path => byId.get(path.id)!);
  return { entries, totalMs: Math.max(1, ...entries.map(entry => entry.startMs + entry.durationMs)) };
}

export function getNextExercisePathStartMs(paths: ExercisePath[], markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  return paths.length ? Math.ceil(buildExerciseTimeline(paths, markers, pace).totalMs / 100) * 100 : 0;
}

export function setExercisePathStartMs(paths: ExercisePath[], pathId: string, requestedStartMs: number, markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  const normalized = normalizeExerciseTimeline(paths, markers, pace);
  const startMs = Math.max(0, Math.round(requestedStartMs / 50) * 50);
  return normalized.map(path => path.id === pathId ? { ...path, startMs } : path);
}

export function setExercisePathDurationMs(paths: ExercisePath[], pathId: string, requestedDurationMs: number, markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  const normalized = normalizeExerciseTimeline(paths, markers, pace), selected = normalized.find(path => path.id === pathId);
  if (!selected) return normalized;
  let durationMs = Math.min(EXERCISE_MAX_DURATION_MS, Math.max(EXERCISE_MIN_DURATION_MS, Math.round(requestedDurationMs / 50) * 50));
  return normalized.map(path => path.id === pathId ? { ...path, durationMs } : path);
}

export function resetExercisePathDuration(paths: ExercisePath[], pathId: string, markers: ExerciseMarker[], pace: ExercisePace = FOOTBALL_PACE) {
  return normalizeExerciseTimeline(paths, markers, pace).map(path => path.id === pathId ? { ...path, durationMs: undefined } : path);
}

export function getExerciseTimelineProgressAt(positionMs: number, entry: ExerciseTimelineEntry, totalMs: number) {
  const position = Math.min(Math.max(1, totalMs), Math.max(0, positionMs));
  const active = position >= entry.startMs && position < entry.startMs + entry.durationMs;
  return { active, progress: active ? (position - entry.startMs) / Math.max(1, entry.durationMs) : 0 };
}

export function getExerciseTimelineProgress(elapsedMs: number, speed: number, entry: ExerciseTimelineEntry, totalMs: number) {
  return getExerciseTimelineProgressAt(Math.max(0, elapsedMs) * Math.max(.1, speed), entry, totalMs);
}

export function getExercise2dFitZoom(width: number, height: number, pitch: ExercisePitchDimensions, orientation: ExercisePitchOrientation = "landscape") {
  const renderedWidth = orientation === "landscape" ? pitch.groundLength : pitch.groundWidth;
  const renderedHeight = orientation === "landscape" ? pitch.groundWidth : pitch.groundLength;
  const usableWidth = Math.max(width - 180, 360);
  const usableHeight = Math.max(height - 160, 360);
  return Math.min(usableWidth / renderedWidth, usableHeight / renderedHeight);
}

/** Groups timeline entries into lanes: a route keeps a lane it was dragged to, others take the first lane where they fit. */
export function assignExerciseTimelineLanes(entries: ExerciseTimelineEntry[], paths: ExercisePath[]) {
  const lanes: ExerciseTimelineEntry[][] = [];
  [...entries].sort((a, b) => a.startMs - b.startMs).forEach(entry => {
    const savedLane = paths.find(path => path.id === entry.pathId)?.timelineLane;
    if (Number.isInteger(savedLane) && savedLane! >= 0) {
      while (lanes.length <= savedLane!) lanes.push([]);
      lanes[savedLane!].push(entry);
      return;
    }
    const lane = lanes.find(items => {
      const previous = items.at(-1);
      return !previous || previous.startMs + previous.durationMs <= entry.startMs;
    });
    (lane || (lanes.push([]), lanes.at(-1)!)).push(entry);
  });
  return lanes.length ? lanes : [[]];
}

/** Renumbers every route's lane so lanes run from 0 without empty ones in between. */
export function compactExerciseTimelineLanes(paths: ExercisePath[], entries: ExerciseTimelineEntry[]): ExercisePath[] {
  const lanes = assignExerciseTimelineLanes(entries, paths).filter(lane => lane.length), laneOf = new Map<string, number>();
  lanes.forEach((lane, index) => lane.forEach(entry => laneOf.set(entry.pathId, index)));
  const next = paths.map(path => laneOf.has(path.id) && path.timelineLane !== laneOf.get(path.id) ? { ...path, timelineLane: laneOf.get(path.id) } : path);
  return next.some((path, index) => path !== paths[index]) ? next : paths;
}

/** What a player does with the ball at a moment of playback; the 3D figure moves its arms to match. */
export type ExercisePlayerPose = "shoot" | "pass" | "catch" | "hold" | "dribble" | null;

/** Where a player looks at a moment of playback: a point on the court, or a fixed heading in radians the coach set. */
export interface ExercisePlayerFocus {
  target?: { x: number; z: number }; heading?: number; pose: ExercisePlayerPose;
  /** For a pass being thrown or caught, how it travels, so a lob is thrown and caught overhead. */
  passStyle?: ExercisePassStyle;
  /** For a shot being taken, how: a jump shot, a lay-up or a dunk. */
  shotStyle?: ExerciseShotStyle;
  /** How far through a shot or pass the player is, from 0 at the gather to 1 when they have landed or followed through. */
  poseProgress?: number;
  /** Where in that progress the ball leaves the hands. */
  releaseAt?: number;
  /** Whether the player has the ball in their hands right now: from the catch until it leaves them again. */
  holding?: boolean;
}

/** Whether this player has the ball in their hands: they start with it, or caught it, and have not yet let it go. */
export function isExercisePlayerHoldingBall(player: ExerciseMarker, paths: ExercisePath[], entries: ExerciseTimelineEntry[], positionMs: number) {
  const entryOf = new Map(entries.map(entry => [entry.pathId, entry]));
  const ballPaths = paths.filter(path => isExerciseBallPath(path.kind) && entryOf.get(path.id)).sort((a, b) => entryOf.get(a.id)!.startMs - entryOf.get(b.id)!.startMs);
  const started = ballPaths.filter(path => entryOf.get(path.id)!.startMs <= positionMs).at(-1);
  if (!started) return ballPaths[0]?.fromId === player.id;
  const entry = entryOf.get(started.id)!, finished = positionMs >= entry.startMs + entry.durationMs;
  return started.kind === "pass" && started.toId === player.id && finished;
}

// How long before their own route a player already turns towards it, and how long before a pass arrives the receiver
// turns to the passer and reaches for the ball.
const FOCUS_LEAD_MS = 900, CATCH_TURN_MS = 900, CATCH_REACH_MS = 350;
// A jump shot gathers and rises for about a quarter second, releases at the top and lands a quarter second later;
// a pass is a shorter push. Neither starts before the player has caught the ball.
const THROW_TIMING = { shot: { before: 250, after: 250 }, pass: { before: 200, after: 150 } } as const;
// After the release a lay-up lands quickly; a dunker hangs on the rim a moment before dropping.
const DRIVE_LANDING_MS = { layup: 350, dunk: 450 } as const;

/** The heading in radians a coach-set direction stands for: degrees clockwise from the right-hand end, seen from above. */
export function getExerciseFacingHeading(degrees: number) {
  const angle = degrees * Math.PI / 180;
  return Math.atan2(Math.cos(angle), Math.sin(angle));
}

/** Where the ball is at this moment: in flight between two players, with the player who last received it, or in the basket. */
export function getExerciseBallPositionAt(markers: ExerciseMarker[], paths: ExercisePath[], entries: ExerciseTimelineEntry[], positionMs: number) {
  const entryOf = new Map(entries.map(entry => [entry.pathId, entry]));
  const markerAt = (id?: string) => { const marker = markers.find(item => item.id === id); return marker ? getExerciseMarkerPositionAt(marker, paths, entries, positionMs) : undefined; };
  const ballPaths = paths.filter(path => isExerciseBallPath(path.kind) && entryOf.get(path.id)).sort((a, b) => entryOf.get(a.id)!.startMs - entryOf.get(b.id)!.startMs);
  const started = ballPaths.filter(path => entryOf.get(path.id)!.startMs <= positionMs).at(-1);
  if (!started) return ballPaths[0] ? markerAt(ballPaths[0].fromId) : markers.find(marker => marker.kind === "ball");
  const entry = entryOf.get(started.id)!, progress = (positionMs - entry.startMs) / Math.max(1, entry.durationMs);
  if (started.kind === "dribble") return markerAt(started.fromId);
  if (progress < 1 && entry.from && entry.to) return { x: entry.from.x + (entry.to.x - entry.from.x) * progress, z: entry.from.z + (entry.to.z - entry.from.z) * progress };
  return started.toId ? markerAt(started.toId) : started.toPoint;
}

/**
 * Where a player should look and what they do with their arms. Their own action comes first, then a pass coming to
 * them, then a direction the coach set, then the ball, and finally the middle of the court.
 * Movement while running or dribbling is handled by the figure itself and wins over all of this.
 */
export function getExercisePlayerFocus(player: ExerciseMarker, markers: ExerciseMarker[], paths: ExercisePath[], entries: ExerciseTimelineEntry[], positionMs: number): ExercisePlayerFocus {
  const entryOf = new Map(entries.map(entry => [entry.pathId, entry]));
  const position = getExerciseMarkerPositionAt(player, paths, entries, positionMs);
  const timed = paths.map(path => ({ path, entry: entryOf.get(path.id) })).filter((item): item is { path: ExercisePath; entry: ExerciseTimelineEntry } => Boolean(item.entry));
  const own = timed.filter(item => item.path.fromId === player.id);
  const active = own.find(({ entry }) => positionMs >= entry.startMs && positionMs <= entry.startMs + entry.durationMs);
  if (active?.path.kind === "dribble") return { pose: "dribble" };
  // The last pass this player catches before throwing marks the earliest moment the throw can begin.
  const arrivals = timed.filter(({ path }) => path.kind === "pass" && path.toId === player.id).map(({ entry }) => entry.startMs + entry.durationMs);
  // In an alley-oop the receiver takes off before the lob arrives and catches it in the air, so the take-off is not held back.
  const alleyOopArrival = timed.filter(({ path, entry }) => path.kind === "pass" && path.toId === player.id && entry.alleyOop).map(({ entry }) => entry.startMs + entry.durationMs)[0];
  for (const { path, entry } of own) {
    if ((path.kind !== "shot" && path.kind !== "pass") || !entry.to) continue;
    const drive = getExerciseDriveShot(path), alleyOop = Boolean(drive) && alleyOopArrival !== undefined && isAlleyOopFinish(entry.startMs - alleyOopArrival);
    const timing = drive ? { before: drive.takeoffMs, after: DRIVE_LANDING_MS[path.shotStyle as "layup" | "dunk"] } : THROW_TIMING[path.kind];
    const caught = alleyOop ? -Infinity : Math.max(-Infinity, ...arrivals.filter(arrival => arrival <= entry.startMs));
    const start = Math.max(entry.startMs - timing.before, caught), end = entry.startMs + timing.after;
    const span = Math.max(1, end - start);
    const inHands = positionMs < entry.startMs && (!alleyOop || positionMs >= alleyOopArrival!);
    if (positionMs >= start && positionMs <= end) return { target: entry.to, pose: path.kind === "shot" ? "shoot" : "pass", poseProgress: (positionMs - start) / span, releaseAt: (entry.startMs - start) / span, holding: inHands, passStyle: path.kind === "pass" ? path.passStyle ?? "direct" : undefined, shotStyle: path.kind === "shot" ? path.shotStyle ?? "jump" : undefined };
  }
  const holding = isExercisePlayerHoldingBall(player, paths, entries, positionMs);
  const withBall = (focus: ExercisePlayerFocus): ExercisePlayerFocus => holding && !focus.pose ? { ...focus, pose: "hold", holding } : focus;
  const incoming = timed.find(({ path, entry }) => path.kind === "pass" && path.toId === player.id && positionMs >= entry.startMs - CATCH_TURN_MS && positionMs <= entry.startMs + entry.durationMs + 150);
  if (incoming?.entry.from) {
    const arrival = incoming.entry.startMs + incoming.entry.durationMs;
    return { target: incoming.entry.from, pose: positionMs >= arrival - CATCH_REACH_MS ? "catch" : null, passStyle: incoming.path.passStyle ?? "direct" };
  }
  const next = own.filter(({ entry }) => entry.startMs > positionMs).sort((a, b) => a.entry.startMs - b.entry.startMs)[0];
  if (next?.entry.to && next.entry.startMs - positionMs <= FOCUS_LEAD_MS) return withBall({ target: next.entry.to, pose: null });
  if (player.rotation !== undefined) return withBall({ heading: getExerciseFacingHeading(player.rotation), pose: null });
  const ball = getExerciseBallPositionAt(markers, paths, entries, positionMs);
  if (ball && Math.hypot(ball.x - position.x, ball.z - position.z) > .35) return withBall({ target: { x: ball.x, z: ball.z }, pose: null });
  if (next?.entry.to) return withBall({ target: next.entry.to, pose: null });
  return withBall(Math.hypot(position.x, position.z) > .35 ? { target: { x: 0, z: 0 }, pose: null } : { pose: null });
}
