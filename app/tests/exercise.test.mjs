import assert from "node:assert/strict";
import test from "node:test";
import { getExerciseImageSections } from "../src/features/exercises/exerciseImageExport.ts";
import { exerciseDraftContentKey } from "../src/features/exercises/exerciseStorage.ts";
import { buildExerciseTimeline, canAddTeamPlayer, canPassBetween, canTargetExercisePath, createExerciseMarkerCopy, EXERCISE_MAX_DURATION_MS, EXERCISE_NATURAL_SPEEDS, EXERCISE_PITCH_DIMENSIONS, EXERCISE_ROLE_OPTIONS, formatRouteCount, getExercise2dFitZoom, getExerciseMarkerColor, getExercisePathColor, getExercisePathDurationMs, getExercisePathNaturalDurationMs, getExerciseTimelineProgress, getExerciseTimelineProgressAt, isExercisePathValid, moveExerciseMarkerSelection, normalizeExercisePlayerRole, normalizeExerciseTimeline, resetExercisePathDuration, resizeExerciseDraftContent, setExercisePathDurationMs, setExercisePathStartMs } from "../src/features/exercises/exerciseTypes.ts";

const player = (team) => ({ id: team, kind: "player", team, name: team, x: 0, z: 0 });
const ball = { id: "ball", kind: "ball", name: "Pallo", x: 0, z: 0 };

const draft = {
  name: "Pienpeli",
  notes: "Kolme vastaan kolme.",
  markers: [],
  paths: [],
  annotations: [],
  goalSize: "youth",
  pitchPreset: "training",
  pitchOrientation: "landscape",
  pitchStyle: "grass",
  updatedAt: "2026-09-01T08:00:00.000Z",
};

test("compares the saved exercise content without treating its timestamp as an edit", () => {
  assert.equal(exerciseDraftContentKey(draft), exerciseDraftContentKey({ ...draft, updatedAt: "2026-09-01T09:00:00.000Z" }));
  assert.equal(exerciseDraftContentKey(draft), exerciseDraftContentKey({ ...draft, exerciseTheme: "", coachingPoints: "", keyQuestions: "" }));
  assert.notEqual(exerciseDraftContentKey(draft), exerciseDraftContentKey({ ...draft, notes: "Muuttunut kuvaus." }));
});

test("includes only filled exercise detail sections in the image", () => {
  assert.deepEqual(getExerciseImageSections({ ...draft, exerciseTheme: "Tilanteenvaihto", coachingPoints: "  ", keyQuestions: "Missä tila on?" }), [
    { title: "Teema", text: "Tilanteenvaihto" },
    { title: "Kuvaus ja säännöt", text: "Kolme vastaan kolme." },
    { title: "Avainkysymykset", text: "Missä tila on?" },
  ]);
});

test("allows passes within a team or via a ball, but not to an opponent", () => {
  assert.equal(canPassBetween(player("blue"), player("blue")), true);
  assert.equal(canPassBetween(player("blue"), player("red")), false);
  assert.equal(canPassBetween(player("blue"), ball), true);
  assert.equal(canPassBetween(player("blue"), { id: "cone", kind: "cone", name: "Tötsä", x: 1, z: 1 }), false);
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
  assert.equal(getExerciseMarkerColor({ ...player("blue"), role: "defender" }), "#075fba");
  assert.equal(getExerciseMarkerColor({ ...player("red"), role: "attacker" }), "#545f65");
  assert.equal(normalizeExercisePlayerRole("field"), "midfielder");
  assert.equal(getExerciseMarkerColor({ ...player("red"), color: "#f25f54" }), "#f25f54");
});

test("keeps marker colors distinct and consistent between interface themes", () => {
  const colors = [
    ...EXERCISE_ROLE_OPTIONS.map(option => getExerciseMarkerColor({ ...player("blue"), role: option.value }, "light")),
    getExerciseMarkerColor(player("red"), "light"),
  ];
  assert.equal(new Set(colors).size, colors.length);
  EXERCISE_ROLE_OPTIONS.forEach(option => assert.equal(
    getExerciseMarkerColor({ ...player("blue"), role: option.value }, "light"),
    getExerciseMarkerColor({ ...player("blue"), role: option.value }, "dark"),
  ));
});

test("keeps route colors consistent between interface themes", () => {
  ["pass", "run", "dribble", "shot"].forEach(kind => {
    assert.equal(getExercisePathColor(kind, "light"), getExercisePathColor(kind, "dark"));
  });
});

test("formats the route count in Finnish", () => {
  assert.equal(formatRouteCount(0), "0 reittiä");
  assert.equal(formatRouteCount(1), "1 reitti");
  assert.equal(formatRouteCount(2), "2 reittiä");
});

test("fits the 2D pitch between the editor controls", () => {
  assert.equal(getExercise2dFitZoom(1896, 930), 87.5);
  assert.ok(getExercise2dFitZoom(778, 844) < getExercise2dFitZoom(1896, 930));
  assert.ok(getExercise2dFitZoom(1896, 930, "full") < getExercise2dFitZoom(1896, 930, "training"));
  assert.ok(getExercise2dFitZoom(1896, 930, "full", "portrait") < getExercise2dFitZoom(1896, 930, "full", "landscape"));
});

test("scales exercise content with the pitch preset", () => {
  const draft = { name: "", notes: "", markers: [{ ...player("blue"), x: 2, z: -1 }], paths: [{ id: "run", kind: "run", fromId: "blue", toPoint: { x: 4, z: 2 } }], annotations: [{ id: "line", kind: "line", color: "#fff", points: [{ x: -2, z: 1 }] }], goalSize: "youth", pitchPreset: "training", pitchOrientation: "landscape", updatedAt: "" };
  const resized = resizeExerciseDraftContent(draft, "full");
  assert.equal(resized.pitchPreset, "full");
  assert.ok(resized.markers[0].x > draft.markers[0].x);
  assert.ok(resized.markers[0].z < draft.markers[0].z);
  assert.ok(resized.paths[0].toPoint.x > draft.paths[0].toPoint.x);
  assert.ok(resized.annotations[0].points[0].x < draft.annotations[0].points[0].x);
});

test("moves a marker selection as one group and keeps it inside the pitch", () => {
  const markers = [{ ...player("blue"), id: "a", x: 0, z: 0 }, { ...player("blue"), id: "b", x: 1, z: 1 }, { ...player("red"), id: "c", x: -2, z: -1 }];
  const moved = moveExerciseMarkerSelection(markers, ["a", "b"], "a", 2, 1, "training");
  assert.deepEqual(moved.map(({ x, z }) => [x, z]), [[2, 1], [3, 2], [-2, -1]]);
  const clamped = moveExerciseMarkerSelection(markers, ["a", "b"], "a", 99, 99, "training");
  const dimensions = EXERCISE_PITCH_DIMENSIONS.training;
  assert.ok(clamped[1].x <= dimensions.length / 2 - .25 && clamped[1].z <= dimensions.width / 2 - .25);
  assert.deepEqual([clamped[1].x - clamped[0].x, clamped[1].z - clamped[0].z], [1, 1]);
});

test("accepts free run targets but keeps passes attached to markers", () => {
  const markers = [player("blue"), player("red")];
  assert.equal(isExercisePathValid({ id: "run", kind: "run", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), true);
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), false);
  assert.equal(isExercisePathValid({ id: "dribble", kind: "dribble", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), true);
  assert.equal(isExercisePathValid({ id: "shot", kind: "shot", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), true);
  const goal = { id: "goal", kind: "goal", name: "Maali", goalSize: "youth", x: 3, z: 0 };
  assert.equal(canTargetExercisePath("shot", markers[0], goal), true);
  assert.equal(canTargetExercisePath("run", markers[0], goal), false);
});

test("uses distance-based run durations", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }];
  const shortRun = { id: "short", kind: "run", fromId: "blue", toPoint: { x: 1, z: 0 } };
  const longRun = { id: "long", kind: "run", fromId: "blue", toPoint: { x: 4, z: 0 } };
  assert.ok(getExercisePathDurationMs(longRun, markers) > getExercisePathDurationMs(shortRun, markers));
  assert.equal(EXERCISE_NATURAL_SPEEDS.runKmh, 18);
  assert.equal(EXERCISE_NATURAL_SPEEDS.passKmh, 54);
  assert.equal(EXERCISE_NATURAL_SPEEDS.dribbleKmh, 12);
  assert.equal(EXERCISE_NATURAL_SPEEDS.shotKmh, 75);
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

test("allows ball clips to overlap when they are dragged", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 3, z: 0 }];
  const paths = [
    { id: "first", kind: "pass", fromId: "blue", toId: "blue-2", startMs: 0 },
    { id: "second", kind: "pass", fromId: "blue-2", toId: "blue", startMs: 2200 },
  ];
  const moved = setExercisePathStartMs(paths, "second", 100, markers);
  const timeline = buildExerciseTimeline(moved, markers);
  const [first, second] = timeline.entries;
  assert.equal(second.startMs, 100);
  assert.ok(second.startMs < first.startMs + first.durationMs);
});

test("changes a ball clip duration without moving or trimming other clips", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 3, z: 0 }];
  const paths = [
    { id: "first", kind: "pass", fromId: "blue", toId: "blue-2", startMs: 0 },
    { id: "second", kind: "pass", fromId: "blue-2", toId: "blue", startMs: 2200 },
  ];
  const trimmed = setExercisePathDurationMs(paths, "first", 5000, markers);
  const [first, second] = buildExerciseTimeline(trimmed, markers).entries;
  assert.equal(first.durationMs, 5000);
  assert.equal(second.startMs, 2200);
  assert.equal(trimmed[0].toId, "blue-2");
});

test("restores a natural ball duration without moving later clips", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }, { ...player("blue"), id: "blue-2", x: 3, z: 0 }];
  const paths = [
    { id: "first", kind: "pass", fromId: "blue", toId: "blue-2", startMs: 0, durationMs: 600 },
    { id: "second", kind: "pass", fromId: "blue-2", toId: "blue", startMs: 700 },
  ];
  const restored = resetExercisePathDuration(paths, "first", markers);
  const [first, second] = buildExerciseTimeline(restored, markers).entries;
  assert.equal(restored[0].durationMs, undefined);
  assert.equal(second.startMs, 700);
  assert.ok(second.startMs < first.startMs + first.durationMs);
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
