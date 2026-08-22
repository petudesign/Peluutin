import assert from "node:assert/strict";
import test from "node:test";
import { buildExerciseTimeline, canAddTeamPlayer, canPassBetween, createExerciseMarkerCopy, EXERCISE_LIGHT_CONTRAST_OUTLINE, EXERCISE_MAX_DURATION_MS, EXERCISE_NATURAL_SPEEDS, EXERCISE_ROLE_OPTIONS, formatRouteCount, getExercise2dFitZoom, getExerciseMarkerColor, getExercisePathColor, getExercisePathDurationMs, getExercisePathNaturalDurationMs, getExerciseTimelineProgress, getExerciseTimelineProgressAt, isExercisePathValid, keepSingleBall, normalizeExercisePlayerRole, normalizeExerciseTimeline, resetExercisePathDuration, setExercisePathDurationMs, setExercisePathStartMs } from "../src/features/exercises/exerciseTypes.ts";

const player = (team) => ({ id: team, kind: "player", team, name: team, x: 0, z: 0 });
const ball = { id: "ball", kind: "ball", name: "Pallo", x: 0, z: 0 };

test("allows passes within a team or via a ball, but not to an opponent", () => {
  assert.equal(canPassBetween(player("blue"), player("blue")), true);
  assert.equal(canPassBetween(player("blue"), player("red")), false);
  assert.equal(canPassBetween(player("blue"), ball), true);
  assert.equal(canPassBetween(player("blue"), { id: "cone", kind: "cone", name: "Tötsä", x: 1, z: 1 }), false);
});

test("keeps at most one ball in an exercise", () => {
  assert.deepEqual(keepSingleBall([ball, player("blue"), { ...ball, id: "ball-2" }]).map(({ id }) => id), ["ball", "blue"]);
});

test("copies an exercise marker with its direction and a visible offset", () => {
  const dummy = { id: "dummy-1", kind: "dummy", name: "Harjoitusnukke", x: 1, z: -1, rotation: 135 };
  const copy = createExerciseMarkerCopy([dummy], dummy, 1, "dummy-copy-1");
  assert.deepEqual({ ...copy, x: undefined, z: undefined }, { ...dummy, id: "dummy-copy-1", x: undefined, z: undefined });
  assert.ok(Math.abs(copy.x - 1.32) < Number.EPSILON);
  assert.ok(Math.abs(copy.z - -.68) < Number.EPSILON);
});

test("limits each exercise team to eleven players", () => {
  const blueTeam = Array.from({ length: 11 }, (_, index) => ({ ...player("blue"), id: `blue-${index}` }));
  assert.equal(canAddTeamPlayer(blueTeam, "blue"), false);
  assert.equal(canAddTeamPlayer(blueTeam, "red"), true);
});

test("colors own players by position and keeps opponents neutral", () => {
  const defenderColor = EXERCISE_ROLE_OPTIONS.find(option => option.value === "defender").color;
  assert.equal(getExerciseMarkerColor({ ...player("blue"), role: "defender" }), defenderColor);
  assert.equal(getExerciseMarkerColor({ ...player("red"), role: "attacker" }), "#747f85");
  assert.equal(normalizeExercisePlayerRole("field"), "midfielder");
});

test("keeps light-theme colors recognizable with a contrasting pitch outline", () => {
  const luminance = (hex) => {
    const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  };
  const contrast = (first, second) => (Math.max(luminance(first), luminance(second)) + .05) / (Math.min(luminance(first), luminance(second)) + .05);
  const pitchStripes = ["#347c2b", "#3f8a32"];
  const colors = [
    ...EXERCISE_ROLE_OPTIONS.map(option => getExerciseMarkerColor({ ...player("blue"), role: option.value }, "light")),
    getExerciseMarkerColor(player("red"), "light"),
    getExercisePathColor("pass", "light"),
    getExercisePathColor("run", "light"),
  ];
  assert.equal(new Set(colors).size, colors.length);
  pitchStripes.forEach(stripe => assert.ok(contrast(EXERCISE_LIGHT_CONTRAST_OUTLINE, stripe) >= 3, `${EXERCISE_LIGHT_CONTRAST_OUTLINE} against ${stripe}`));
});

test("formats the route count in Finnish", () => {
  assert.equal(formatRouteCount(0), "0 reittiä");
  assert.equal(formatRouteCount(1), "1 reitti");
  assert.equal(formatRouteCount(2), "2 reittiä");
});

test("fits the 2D pitch between the editor controls", () => {
  assert.equal(getExercise2dFitZoom(1896, 930), 87.5);
  assert.ok(getExercise2dFitZoom(778, 844) < getExercise2dFitZoom(1896, 930));
});

test("accepts free run targets but keeps passes attached to markers", () => {
  const markers = [player("blue"), player("red")];
  assert.equal(isExercisePathValid({ id: "run", kind: "run", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), true);
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), false);
});

test("uses distance-based run durations", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }];
  const shortRun = { id: "short", kind: "run", fromId: "blue", toPoint: { x: 1, z: 0 } };
  const longRun = { id: "long", kind: "run", fromId: "blue", toPoint: { x: 4, z: 0 } };
  assert.ok(getExercisePathDurationMs(longRun, markers) > getExercisePathDurationMs(shortRun, markers));
  assert.equal(EXERCISE_NATURAL_SPEEDS.runKmh, 18);
  assert.equal(EXERCISE_NATURAL_SPEEDS.passKmh, 54);
  assert.equal(getExercisePathDurationMs(shortRun, markers), 1750);
  assert.equal(getExercisePathDurationMs({ ...shortRun, durationMs: 900 }, markers), 900);
  assert.equal(getExercisePathNaturalDurationMs({ ...shortRun, durationMs: 900 }, markers), 1750);
  assert.equal(getExercisePathDurationMs({ ...longRun, durationMs: 12000 }, markers), EXERCISE_MAX_DURATION_MS);
  assert.equal(getExercisePathDurationMs(longRun, markers), EXERCISE_MAX_DURATION_MS);
});

test("supports overlapping runs and a separately timed ball track", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 3, z: 0 }];
  const paths = [
    { id: "pass", kind: "pass", fromId: "blue", toId: "blue-2", startMs: 0 },
    { id: "run", kind: "run", fromId: "blue", toPoint: { x: 2, z: 2 }, startMs: 0 },
    { id: "return", kind: "pass", fromId: "blue-2", toId: "blue", startMs: 2200 },
  ];
  const timeline = buildExerciseTimeline(paths, markers);
  assert.equal(timeline.entries[0].startMs, timeline.entries[1].startMs);
  assert.ok(timeline.entries[2].startMs > timeline.entries[0].startMs);
  assert.equal(timeline.totalMs, Math.max(...timeline.entries.map(entry => entry.startMs + entry.durationMs)));
});

test("keeps ball clips from overlapping when they are dragged", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 3, z: 0 }];
  const paths = [
    { id: "first", kind: "pass", fromId: "blue", toId: "blue-2", startMs: 0 },
    { id: "second", kind: "pass", fromId: "blue-2", toId: "blue", startMs: 2200 },
  ];
  const moved = setExercisePathStartMs(paths, "second", 100, markers);
  const timeline = buildExerciseTimeline(moved, markers);
  const [first, second] = timeline.entries;
  assert.ok(second.startMs >= first.startMs + first.durationMs);
});

test("trims clips without changing route geometry and protects the next ball clip", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 3, z: 0 }];
  const paths = [
    { id: "first", kind: "pass", fromId: "blue", toId: "blue-2", startMs: 0 },
    { id: "second", kind: "pass", fromId: "blue-2", toId: "blue", startMs: 2200 },
  ];
  const trimmed = setExercisePathDurationMs(paths, "first", 5000, markers);
  const [first, second] = buildExerciseTimeline(trimmed, markers).entries;
  assert.equal(first.durationMs, second.startMs - first.startMs);
  assert.equal(trimmed[0].toId, "blue-2");
});

test("restoring a natural ball duration moves later ball clips instead of overlapping them", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 3, z: 0 }];
  const paths = [
    { id: "first", kind: "pass", fromId: "blue", toId: "blue-2", startMs: 0, durationMs: 600 },
    { id: "second", kind: "pass", fromId: "blue-2", toId: "blue", startMs: 700 },
  ];
  const restored = resetExercisePathDuration(paths, "first", markers);
  const [first, second] = buildExerciseTimeline(restored, markers).entries;
  assert.equal(restored[0].durationMs, undefined);
  assert.ok(second.startMs >= first.startMs + first.durationMs);
});

test("migrates old phases to continuous start times", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 2, z: 0 }];
  const migrated = normalizeExerciseTimeline([
    { id: "run", kind: "run", fromId: "blue", toId: "blue-2", phase: 0 },
    { id: "pass", kind: "pass", fromId: "blue", toId: "blue-2", phase: 1 },
  ], markers);
  assert.equal(migrated[0].startMs, 0);
  assert.ok(migrated[1].startMs > 0);
  assert.equal(migrated[0].phase, undefined);
});

test("applies playback speed once and stops at the timeline end", () => {
  const entry = { pathId: "pass", startMs: 1000, durationMs: 500 };
  assert.deepEqual(getExerciseTimelineProgress(600, 2, entry, 2000), { active: true, progress: .4 });
  assert.deepEqual(getExerciseTimelineProgress(600, 1, entry, 2000), { active: false, progress: 0 });
  assert.deepEqual(getExerciseTimelineProgress(2600, 1, entry, 2000), { active: false, progress: 0 });
  assert.deepEqual(getExerciseTimelineProgressAt(1200, entry, 2000), { active: true, progress: .4 });
});
