import { createExerciseShareDraft } from "../src/features/exercises/exerciseSharing.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { getExerciseImageHeight, getExerciseImageSections } from "../src/features/exercises/exerciseImageExport.ts";
import { exerciseDraftContentKey } from "../src/features/exercises/exerciseStorage.ts";
import { BASKETBALL_HOOP_FROM_BASELINE, EXERCISE_COURT_LIST, exerciseCourtForSport, getExerciseCourt, getExerciseHoops, getExercisePitchDimensions } from "../src/features/exercises/exerciseCourts.ts";
import { isExercisePlayerHoldingBall, getExerciseBallPositionAt, getExerciseFacingHeading, getExercisePlayerFocus, assignExerciseTimelineLanes, compactExerciseTimelineLanes, buildExerciseTimeline, canAddTeamPlayer, canPassBetween, canTargetExercisePath, createExerciseMarkerCopy, EXERCISE_MAX_DURATION_MS, EXERCISE_NATURAL_SPEEDS, EXERCISE_ROLE_OPTIONS, formatRouteCount, getExercise2dFitZoom, getExerciseAnnotationPoints, exerciseAnnotationIntersectsBox, getExerciseMarkerPositionAt, getExerciseMarkerColor, getExercisePathColor, getExercisePathDurationMs, getExercisePathNaturalDurationMs, getExerciseTimelineProgress, getExerciseTimelineProgressAt, isExercisePathValid, moveExerciseMarkerSelection, normalizeExercisePlayerRole, normalizeExerciseTimeline, removeExerciseLayer, resetExercisePathDuration, changeExerciseCourt, resizeExerciseDraftContent, setExercisePathDurationMs, setExercisePathStartMs, snapExerciseShotsToHoops } from "../src/features/exercises/exerciseTypes.ts";

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

test("sizes the exercise image to its visible content", () => {
  assert.equal(getExerciseImageHeight(788, 0, false), 1148);
  assert.equal(getExerciseImageHeight(788, 508, true), 1738);
  assert.equal(getExerciseImageHeight(788, 988, true), 2218);
});

test("allows passes to any player or ball, while excluding equipment", () => {
  assert.equal(canPassBetween(player("blue"), player("blue")), true);
  assert.equal(canPassBetween(player("blue"), player("red")), true);
  assert.equal(canPassBetween(player("blue"), ball), true);
  assert.equal(canPassBetween(player("blue"), { id: "cone", kind: "cone", name: "Tötsä", x: 1, z: 1 }), false);
});

test("copies an exercise marker with its direction and a visible offset", () => {
  const dummy = { id: "dummy-1", kind: "dummy", name: "Harjoitusnukke", x: 1, z: -1, rotation: 135 };
  const copy = createExerciseMarkerCopy([dummy], dummy, 1, "dummy-copy-1", 11);
  assert.deepEqual({ ...copy, x: undefined, z: undefined }, { ...dummy, id: "dummy-copy-1", x: undefined, z: undefined });
  assert.ok(Math.abs(copy.x - 1.32) < Number.EPSILON);
  assert.ok(Math.abs(copy.z - -.68) < Number.EPSILON);
});

test("limits each exercise team to eleven players", () => {
  const blueTeam = Array.from({ length: 11 }, (_, index) => ({ ...player("blue"), id: `blue-${index}` }));
  assert.equal(canAddTeamPlayer(blueTeam, "blue", 11), false);
  assert.equal(canAddTeamPlayer(blueTeam, "red", 11), true);
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
  const training = getExercisePitchDimensions("football", "training"), full = getExercisePitchDimensions("football", "full");
  assert.equal(getExercise2dFitZoom(1896, 930, training), 87.5);
  assert.ok(getExercise2dFitZoom(778, 844, training) < getExercise2dFitZoom(1896, 930, training));
  assert.ok(getExercise2dFitZoom(1896, 930, full) < getExercise2dFitZoom(1896, 930, training));
  assert.ok(getExercise2dFitZoom(1896, 930, full, "portrait") < getExercise2dFitZoom(1896, 930, full, "landscape"));
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
  const dimensions = getExercisePitchDimensions("football", "training");
  const moved = moveExerciseMarkerSelection(markers, ["a", "b"], "a", 2, 1, dimensions);
  assert.deepEqual(moved.map(({ x, z }) => [x, z]), [[2, 1], [3, 2], [-2, -1]]);
  const clamped = moveExerciseMarkerSelection(markers, ["a", "b"], "a", 99, 99, dimensions);
  assert.ok(clamped[1].x <= dimensions.length / 2 - .25 && clamped[1].z <= dimensions.width / 2 - .25);
  assert.deepEqual([clamped[1].x - clamped[0].x, clamped[1].z - clamped[0].z], [1, 1]);
});

test("accepts free targets for runs, passes, dribbles and shots", () => {
  const markers = [player("blue"), player("red")];
  assert.equal(isExercisePathValid({ id: "run", kind: "run", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), true);
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "blue", toPoint: { x: 2, z: 1 } }, markers), true);
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


test("keeps every corner of a long narrow rectangle in either drawing direction", () => {
  for (const points of [[{ x: 0, z: 0 }, { x: 4, z: 1 }], [{ x: 4, z: 1 }, { x: 0, z: 0 }]]) {
    const outline = getExerciseAnnotationPoints({ id: "rect", kind: "rectangle", color: "#fff", points });
    assert.equal(outline.length, 5);
    assert.deepEqual(outline[0], outline[4]);
    for (let i = 1; i < outline.length; i++) {
      assert.ok(outline[i].x === outline[i - 1].x || outline[i].z === outline[i - 1].z);
      assert.ok(Math.hypot(outline[i].x - outline[i - 1].x, outline[i].z - outline[i - 1].z) > 0);
    }
  }
});

test("samples a smooth closed ellipse without leaving its bounds", () => {
  const outline = getExerciseAnnotationPoints({ id: "circle", kind: "circle", color: "#fff", points: [{ x: 1, z: 2 }, { x: 4, z: 3 }] });
  assert.equal(outline.length, 97);
  for (const point of outline) assert.ok(Math.abs(((point.x - 1) / 3) ** 2 + (point.z - 2) ** 2 - 1) < 1e-10);
  assert.ok(Math.hypot(outline[0].x - outline.at(-1).x, outline[0].z - outline.at(-1).z) < 1e-10);
});


test("removes a layer and only the routes linked to its marker", () => {
  const content = { ...draft, markers: [player("blue"), player("red"), ball], paths: [
    { id: "linked-start", kind: "run", fromId: "blue", toPoint: { x: 2, z: 2 } },
    { id: "linked-end", kind: "pass", fromId: "ball", toId: "blue" },
    { id: "unrelated", kind: "run", fromId: "red", toPoint: { x: 3, z: 1 } },
  ], annotations: [{ id: "rectangle", kind: "rectangle", color: "#fff", points: [{ x: 0, z: 0 }, { x: 1, z: 1 }] }] };
  const result = removeExerciseLayer(content, "marker", "blue");
  assert.deepEqual(result.markers.map(item => item.id), ["red", "ball"]);
  assert.deepEqual(result.paths.map(item => item.id), ["unrelated"]);
  assert.equal(result.annotations, content.annotations);
  assert.equal(content.markers.length, 3);
  assert.equal(removeExerciseLayer(content, "marker", "missing"), content);
  const withoutPath = removeExerciseLayer(content, "path", "linked-end");
  assert.equal(withoutPath.paths.length, 2);
  assert.equal(withoutPath.markers, content.markers);
  const withoutShape = removeExerciseLayer(content, "annotation", "rectangle");
  assert.equal(withoutShape.annotations.length, 0);
  assert.equal(withoutShape.paths, content.paths);
});


test("marquee selects shape edges and crossing strokes without selecting empty interiors", () => {
  const rectangle = { id: "rect", kind: "rectangle", color: "#fff", points: [{ x: 0, z: 0 }, { x: 4, z: 4 }] };
  assert.equal(exerciseAnnotationIntersectsBox(rectangle, { left: -1, right: 5, top: -1, bottom: 5 }), true);
  assert.equal(exerciseAnnotationIntersectsBox(rectangle, { left: 1, right: 2, top: -.1, bottom: .1 }), true);
  assert.equal(exerciseAnnotationIntersectsBox(rectangle, { left: 1, right: 2, top: 1, bottom: 2 }), false);
  const line = { ...rectangle, kind: "line", points: [{ x: -2, z: -2 }, { x: 2, z: 2 }] };
  assert.equal(exerciseAnnotationIntersectsBox(line, { left: -.5, right: .5, top: -.5, bottom: .5 }), true);
  assert.equal(exerciseAnnotationIntersectsBox(line, { left: -2, right: -1, top: 1, bottom: 2 }), false);
  const circle = { ...rectangle, kind: "circle", points: [{ x: 0, z: 0 }, { x: 2, z: 2 }] };
  assert.equal(exerciseAnnotationIntersectsBox(circle, { left: -.2, right: .2, top: -.2, bottom: .2 }), false);
  assert.equal(exerciseAnnotationIntersectsBox(circle, { left: 1.9, right: 2.1, top: -.2, bottom: .2 }), true);
});


test("validates passes to opponents and finite open space while rejecting invalid sources", () => {
  const markers = [player("blue"), player("red"), ball, { id: "cone", kind: "cone", name: "Tötsä", x: 1, z: 1 }];
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "blue", toId: "red" }, markers), true);
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "ball", toPoint: { x: 3, z: 2 } }, markers), true);
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "cone", toPoint: { x: 3, z: 2 } }, markers), false);
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "blue", toPoint: { x: NaN, z: 2 } }, markers), false);
  assert.equal(isExercisePathValid({ id: "pass", kind: "pass", fromId: "blue", toPoint: { x: 3, z: Infinity } }, markers), false);
});

test("plays a pass into open space alongside a runner targeting the same location", () => {
  const markers = [{ ...player("blue"), x: -2, z: 0 }, { ...player("red"), x: 0, z: -2 }];
  const paths = [{ id: "pass", kind: "pass", fromId: "blue", toPoint: { x: 1, z: 1 }, startMs: 0 }, { id: "run", kind: "run", fromId: "red", toPoint: { x: 1, z: 1 }, startMs: 0 }];
  for (const path of paths) assert.equal(isExercisePathValid(path, markers), true);
  const timeline = buildExerciseTimeline(paths, markers);
  assert.equal(timeline.entries.length, 2);
  assert.ok(timeline.entries.every(entry => entry.startMs === 0 && entry.durationMs > 0));
  assert.ok(timeline.entries.find(entry => entry.pathId === "pass").durationMs < timeline.entries.find(entry => entry.pathId === "run").durationMs);
});


test("starts subsequent passes at the completed run endpoint and targets moved receivers", () => {
  const runner = { ...player("blue"), id: "runner" };
  const teammate = { ...player("blue"), id: "teammate", x: 2, z: 2 };
  const markers = [runner, teammate];
  const run = { id: "run", fromId: runner.id, kind: "run", toPoint: { x: 2, z: 0 }, startMs: 0, durationMs: 1000 };
  const pass = { id: "pass", fromId: runner.id, toId: teammate.id, kind: "pass", startMs: 1000 };
  const receive = { id: "receive", fromId: teammate.id, toId: runner.id, kind: "pass", startMs: 1000 };
  const paths = [run, pass, receive];
  const { entries } = buildExerciseTimeline(paths, markers);
  assert.deepEqual(entries[1].from, run.toPoint);
  assert.deepEqual(entries[2].to, run.toPoint);
  const expectedDuration = getExercisePathNaturalDurationMs(pass, [{ ...runner, ...run.toPoint }, teammate]);
  assert.equal(entries[1].durationMs, expectedDuration);
  assert.equal(entries[1].naturalDurationMs, expectedDuration);
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 500), { x: 1, z: 0 });
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 1500), run.toPoint);
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 10000), run.toPoint);
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 0), { x: 0, z: 0 });
});

test("chains movement endpoints chronologically even when paths are stored out of order", () => {
  const runner = { ...player("blue"), id: "runner" };
  const first = { id: "first", fromId: runner.id, kind: "run", toPoint: { x: 2, z: 0 }, startMs: 0, durationMs: 1000 };
  const second = { id: "second", fromId: runner.id, kind: "dribble", toPoint: { x: 2, z: 2 }, startMs: 1000, durationMs: 1000 };
  const pass = { id: "pass", fromId: runner.id, kind: "pass", toPoint: { x: 4, z: 2 }, startMs: 2000 };
  const paths = [pass, second, first];
  const { entries } = buildExerciseTimeline(paths, [runner]);
  assert.deepEqual(entries[0].from, second.toPoint);
  assert.deepEqual(entries[1].from, first.toPoint);
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 1500), { x: 2, z: 1 });
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 3000), second.toPoint);
  const reordered = paths.map(path => path.id === "pass" ? { ...path, startMs: 0 } : path);
  assert.deepEqual(buildExerciseTimeline(reordered, [runner]).entries[0].from, { x: 0, z: 0 });
});

test("resolves actions during curved movement from the actual playback position", () => {
  const runner = { ...player("blue"), id: "runner" };
  const run = { id: "run", fromId: runner.id, kind: "run", toPoint: { x: 2, z: 0 }, curve: 1, startMs: 0, durationMs: 4000 };
  const pass = { id: "pass", fromId: runner.id, kind: "pass", toPoint: { x: 4, z: 0 }, startMs: 2000 };
  const paths = [run, pass];
  const { entries } = buildExerciseTimeline(paths, [runner]);
  assert.deepEqual(entries[1].from, { x: 1, z: .38 });
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 2000), entries[1].from);
  assert.deepEqual(getExerciseMarkerPositionAt(runner, paths, entries, 5000), run.toPoint);
});


test("removes player names from shared data by default without changing the local exercise", () => {
  const source = { ...draft, markers: [{ ...player("blue"), name: "Aino", number: 7 }, { ...ball, name: "Pallo" }], paths: [{ id: "pass", fromId: "blue", toId: "ball", kind: "pass" }] };
  const shared = createExerciseShareDraft(source);
  assert.equal(shared.markers[0].name, "Pelaaja 1");
  assert.equal(shared.markers[0].number, undefined);
  assert.equal(source.markers[0].number, 7);
  assert.equal(shared.markers[1].name, "Pallo");
  assert.equal(source.markers[0].name, "Aino");
  assert.equal(JSON.stringify(shared).includes("Aino"), false);
  assert.deepEqual(shared.paths, source.paths);
  assert.equal(shared.notes, source.notes);
  assert.equal(createExerciseShareDraft(source, false).markers[0].name, "Aino");
});

test("draws selectable arrowheads at the drag endpoint in either direction", () => {
  for (const end of [{ x: 2, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 2 }, { x: 1, z: -1 }]) {
    const arrow = { id: "arrow", kind: "arrow", color: "#fff", points: [{ x: 0, z: 0 }, end] };
    const points = getExerciseAnnotationPoints(arrow);
    assert.equal(points.length, 5);
    assert.deepEqual(points[1], end);
    assert.deepEqual(points[3], end);
    const wing = points[2];
    assert.ok((wing.x - end.x) * end.x + (wing.z - end.z) * end.z < 0);
    assert.equal(exerciseAnnotationIntersectsBox(arrow, { left: wing.x - .01, right: wing.x + .01, top: wing.z - .01, bottom: wing.z + .01 }), true);
  }
  const zero = { id: "arrow", kind: "arrow", points: [{ x: 0, z: 0 }, { x: 0, z: 0 }] };
  assert.ok(getExerciseAnnotationPoints(zero).every(point => Number.isFinite(point.x) && Number.isFinite(point.z)));
});

test("draws exercises without a court on the football pitch, and starts futsal teams there", () => {
  assert.equal(getExerciseCourt(undefined).id, "football");
  assert.equal(getExerciseCourt("hockey").id, "football");
  assert.equal(exerciseCourtForSport("futsal"), "football");
  assert.equal(exerciseCourtForSport(undefined), "football");
  assert.deepEqual(getExercisePitchDimensions(undefined, "full"), getExercisePitchDimensions("football", "full"));
});

test("falls back to the court's reference size for a size it does not offer", () => {
  assert.deepEqual(getExercisePitchDimensions("football", "half"), getExerciseCourt("football").presets[0].dimensions);
  assert.deepEqual(getExercisePitchDimensions("basketball", "training"), getExerciseCourt("basketball").presets[0].dimensions);
});

test("offers every court's default style", () => {
  for (const court of EXERCISE_COURT_LIST) assert.ok(court.styles.some(style => style.id === court.defaultStyle), court.id);
});

test("sizes the basketball court to 28 by 15 metres", () => {
  const court = getExerciseCourt("basketball"), full = getExercisePitchDimensions("basketball", "full"), half = getExercisePitchDimensions("basketball", "half");
  assert.ok(Math.abs(full.length * court.pace.metersPerUnit - 28) < 1e-9);
  assert.ok(Math.abs(full.width * court.pace.metersPerUnit - 15) < 1e-9);
  assert.ok(Math.abs(half.length * 2 - full.length) < 1e-9);
});

test("moves an exercise to another court in the same place relative to the field", () => {
  const source = { ...draft, markers: [{ ...player("blue"), x: 2, z: -1 }], paths: [{ id: "run", kind: "run", fromId: "blue", toPoint: { x: 4, z: 2 } }] };
  const moved = changeExerciseCourt(source, "basketball");
  const from = getExercisePitchDimensions("football", "training"), to = getExercisePitchDimensions("basketball", "half");
  assert.equal(moved.court, "basketball");
  assert.equal(moved.pitchPreset, "half");
  assert.equal(moved.pitchStyle, "wood");
  assert.ok(Math.abs(moved.markers[0].x / to.length - 2 / from.length) < 1e-9);
  assert.ok(Math.abs(moved.paths[0].toPoint.z / to.width - 2 / from.width) < 1e-9);
  assert.equal(changeExerciseCourt(moved, "basketball"), moved);
});

test("times routes by the court's real-world scale", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }];
  const run = { id: "run", kind: "run", fromId: "blue", toPoint: { x: 2, z: 0 } };
  const basketball = getExerciseCourt("basketball").pace;
  assert.ok(getExercisePathNaturalDurationMs(run, markers, basketball) < getExercisePathNaturalDurationMs(run, markers));
  assert.ok(Math.abs(getExercisePathNaturalDurationMs(run, markers, basketball) - 2 * basketball.metersPerUnit / (EXERCISE_NATURAL_SPEEDS.runKmh / 3.6) * 1000) < 1e-6);
});

test("treats the court as exercise content", () => {
  assert.notEqual(exerciseDraftContentKey(draft), exerciseDraftContentKey({ ...draft, court: "basketball" }));
});

test("puts one basket on the half court and one at each end of the full court", () => {
  const scale = getExerciseCourt("basketball").pace.metersPerUnit;
  const half = getExerciseHoops("basketball", "half"), full = getExerciseHoops("basketball", "full");
  assert.equal(half.length, 1);
  assert.ok(Math.abs(half[0].x - (-getExercisePitchDimensions("basketball", "half").length / 2 + BASKETBALL_HOOP_FROM_BASELINE / scale)) < 1e-9);
  assert.deepEqual(full.map(hoop => Math.sign(hoop.x)), [-1, 1]);
  assert.deepEqual(getExerciseHoops("football", "training"), []);
});

test("sends every basketball shot into the nearest basket", () => {
  const shooter = { ...player("blue"), x: 3, z: 1 };
  const shots = [{ id: "left", kind: "shot", fromId: "blue", toPoint: { x: -2, z: 3 } }, { id: "right", kind: "shot", fromId: "blue", toPoint: { x: 6, z: -2 } }, { id: "pass", kind: "pass", fromId: "blue", toPoint: { x: -2, z: 3 } }];
  const court = { ...draft, court: "basketball", pitchPreset: "full", markers: [shooter], paths: shots };
  const [left, right] = getExerciseHoops("basketball", "full");
  const snapped = snapExerciseShotsToHoops(court);
  assert.deepEqual(snapped.paths.map(path => path.toPoint), [left, right, { x: -2, z: 3 }]);
  assert.equal(snapExerciseShotsToHoops(snapped), snapped);
  assert.equal(snapExerciseShotsToHoops({ ...court, court: "football", pitchPreset: "training" }).paths, shots);
});

test("times a basketball shot slower than a football shot over the same distance", () => {
  const markers = [{ ...player("blue"), x: 0, z: 0 }], shot = { id: "shot", kind: "shot", fromId: "blue", toPoint: { x: 4, z: 0 } };
  const football = getExerciseCourt("football").pace, basketball = getExerciseCourt("basketball").pace;
  assert.ok(getExercisePathNaturalDurationMs(shot, markers, { ...basketball, metersPerUnit: football.metersPerUnit }) > getExercisePathNaturalDurationMs(shot, markers, football));
});

test("keeps a dragged route on its lane and fits the others into the first free lane", () => {
  const entries = [{ pathId: "a", startMs: 0, durationMs: 1000 }, { pathId: "b", startMs: 500, durationMs: 1000 }, { pathId: "c", startMs: 1200, durationMs: 500 }];
  const lanes = assignExerciseTimelineLanes(entries, [{ id: "a" }, { id: "b" }, { id: "c", timelineLane: 3 }]);
  assert.deepEqual(lanes.map(lane => lane.map(entry => entry.pathId)), [["a"], ["b"], [], ["c"]]);
});

test("closes the gaps left by empty timeline lanes", () => {
  const entries = [{ pathId: "a", startMs: 0, durationMs: 1000 }, { pathId: "c", startMs: 1200, durationMs: 500 }];
  const paths = [{ id: "a", timelineLane: 0 }, { id: "c", timelineLane: 3 }];
  assert.deepEqual(compactExerciseTimelineLanes(paths, entries).map(path => path.timelineLane), [0, 1]);
  const compact = [{ id: "a", timelineLane: 0 }, { id: "c", timelineLane: 1 }];
  assert.equal(compactExerciseTimelineLanes(compact, entries), compact);
});

const focusScene = () => {
  const markers = [
    { ...player("blue"), id: "passer", x: 0, z: 0 },
    { ...player("blue"), id: "receiver", x: 3, z: 0 },
    { ...player("red"), id: "defender", x: 1, z: 2 },
  ];
  const paths = [{ id: "pass", kind: "pass", fromId: "passer", toId: "receiver", startMs: 2000 }];
  return { markers, paths, entries: buildExerciseTimeline(paths, markers).entries };
};

test("turns a receiver to the passer and reaches for the ball just before it arrives", () => {
  const { markers, paths, entries } = focusScene(), receiver = markers[1], pass = entries[0];
  assert.deepEqual(getExercisePlayerFocus(receiver, markers, paths, entries, 1500).target, { x: 0, z: 0 });
  assert.equal(getExercisePlayerFocus(receiver, markers, paths, entries, 1500).pose, null);
  assert.equal(getExercisePlayerFocus(receiver, markers, paths, entries, pass.startMs + pass.durationMs - 100).pose, "catch");
});

test("lets the passer pass towards the receiver and everyone else watch the ball", () => {
  const { markers, paths, entries } = focusScene();
  const passing = getExercisePlayerFocus(markers[0], markers, paths, entries, 2050);
  assert.equal(passing.pose, "pass");
  assert.deepEqual(passing.target, { x: 3, z: 0 });
  assert.deepEqual(getExercisePlayerFocus(markers[2], markers, paths, entries, 0).target, { x: 0, z: 0 });
  assert.deepEqual(getExercisePlayerFocus(markers[2], markers, paths, entries, 99999).target, { x: 3, z: 0 });
});

test("keeps a direction the coach set unless the player is acting", () => {
  const { markers, paths, entries } = focusScene();
  const defender = { ...markers[2], rotation: 90 }, receiver = { ...markers[1], rotation: 90 };
  assert.equal(getExercisePlayerFocus(defender, markers, paths, entries, 0).heading, getExerciseFacingHeading(90));
  assert.deepEqual(getExercisePlayerFocus(receiver, markers, paths, entries, 1500).target, { x: 0, z: 0 });
});

test("faces right for 0 degrees and down the screen for 90 degrees", () => {
  const right = getExerciseFacingHeading(0), down = getExerciseFacingHeading(90);
  assert.ok(Math.abs(Math.sin(right) - 1) < 1e-9 && Math.abs(Math.cos(right)) < 1e-9);
  assert.ok(Math.abs(Math.cos(down) - 1) < 1e-9 && Math.abs(Math.sin(down)) < 1e-9);
});

test("follows the ball from the passer through the air to the receiver", () => {
  const { markers, paths, entries } = focusScene(), pass = entries[0];
  assert.deepEqual(getExerciseBallPositionAt(markers, paths, entries, 0), { x: 0, z: 0 });
  const middle = getExerciseBallPositionAt(markers, paths, entries, pass.startMs + pass.durationMs / 2);
  assert.ok(Math.abs(middle.x - 1.5) < 1e-9);
  assert.deepEqual(getExerciseBallPositionAt(markers, paths, entries, 99999), { x: 3, z: 0 });
});

test("lets a receiver catch the ball before jumping to shoot, and peaks the jump at the release", () => {
  const markers = [{ ...player("blue"), id: "passer", x: 0, z: 0 }, { ...player("blue"), id: "shooter", x: 3, z: 0 }];
  const pass = { id: "pass", kind: "pass", fromId: "passer", toId: "shooter", startMs: 0 };
  const draftPaths = [pass, { id: "shot", kind: "shot", fromId: "shooter", toPoint: { x: 6, z: 0 }, startMs: 0 }];
  const arrival = buildExerciseTimeline([pass], markers).entries[0].durationMs;
  const paths = draftPaths.map(path => path.id === "shot" ? { ...path, startMs: arrival + 100 } : path);
  const entries = buildExerciseTimeline(paths, markers).entries, shooter = markers[1];
  assert.equal(getExercisePlayerFocus(shooter, markers, paths, entries, arrival - 50).pose, "catch");
  const release = getExercisePlayerFocus(shooter, markers, paths, entries, arrival + 100);
  assert.equal(release.pose, "shoot");
  const start = arrival, end = arrival + 100 + 250;
  assert.ok(Math.abs(release.poseProgress - 100 / (end - start)) < 1e-9);
  assert.equal(getExercisePlayerFocus(shooter, markers, paths, entries, end + 50).pose, null);
});

test("has the passer hold the ball until the pass and the receiver from the catch on", () => {
  const { markers, paths, entries } = focusScene(), pass = entries[0], arrival = pass.startMs + pass.durationMs;
  const [passer, receiver, defender] = markers;
  assert.equal(isExercisePlayerHoldingBall(passer, paths, entries, 0), true);
  assert.equal(isExercisePlayerHoldingBall(passer, paths, entries, pass.startMs + 10), false);
  assert.equal(isExercisePlayerHoldingBall(receiver, paths, entries, arrival - 10), false);
  assert.equal(isExercisePlayerHoldingBall(receiver, paths, entries, arrival + 10), true);
  assert.equal(isExercisePlayerHoldingBall(defender, paths, entries, arrival + 10), false);
  assert.equal(getExercisePlayerFocus(receiver, markers, paths, entries, arrival + 500).pose, "hold");
});

test("leads a pass to where a cutting receiver will be when the ball arrives", () => {
  const markers = [{ ...player("blue"), id: "passer", x: 0, z: 0 }, { ...player("blue"), id: "cutter", x: 3, z: 0 }];
  const paths = [{ id: "cut", kind: "run", fromId: "cutter", toPoint: { x: 3, z: 4 }, startMs: 0 }, { id: "pass", kind: "pass", fromId: "passer", toId: "cutter", startMs: 500 }];
  const { entries } = buildExerciseTimeline(paths, markers);
  const pass = entries.find(entry => entry.pathId === "pass"), cutterAtArrival = getExerciseMarkerPositionAt(markers[1], paths, entries, pass.startMs + pass.durationMs);
  assert.ok(Math.hypot(pass.to.x - cutterAtArrival.x, pass.to.z - cutterAtArrival.z) < .05);
  assert.ok(pass.to.z > getExerciseMarkerPositionAt(markers[1], paths, entries, pass.startMs).z);
});

test("floats a lob and slows a bounce pass compared with a direct pass", () => {
  const markers = [{ ...player("blue"), id: "a", x: 0, z: 0 }, { ...player("blue"), id: "b", x: 4, z: 0 }];
  const duration = passStyle => getExercisePathNaturalDurationMs({ id: "p", kind: "pass", fromId: "a", toId: "b", passStyle }, markers);
  assert.ok(duration("lob") > duration("bounce"));
  assert.ok(duration("bounce") > duration(undefined));
});

test("turns a bounce pass into a ground pass when the drill moves to football", () => {
  const basketball = { ...draft, court: "basketball", pitchPreset: "half", markers: [player("blue"), player("red")], paths: [{ id: "p", kind: "pass", fromId: "blue", toId: "red", passStyle: "bounce" }, { id: "l", kind: "pass", fromId: "red", toId: "blue", passStyle: "lob" }] };
  const football = changeExerciseCourt(basketball, "football");
  assert.deepEqual(football.paths.map(path => path.passStyle), [undefined, "lob"]);
});

const basketballPace = getExerciseCourt("basketball").pace;
const hoop = { x: -8.283333333333333, z: 0 };

test("glides a lay-up shooter towards the basket before the release and keeps them there", () => {
  const markers = [{ ...player("blue"), id: "s", x: -4, z: 0 }];
  const paths = [{ id: "lay", kind: "shot", fromId: "s", toPoint: hoop, startMs: 1000, shotStyle: "layup" }];
  const { entries } = buildExerciseTimeline(paths, markers, basketballPace), shot = entries[0];
  assert.equal(shot.glide.startMs, 1000 - 420);
  assert.ok(Math.abs(Math.hypot(shot.glide.to.x - shot.glide.from.x, shot.glide.to.z - shot.glide.from.z) * basketballPace.metersPerUnit - 1.6) < 1e-9);
  assert.deepEqual(shot.from, shot.glide.to);
  assert.equal(shot.durationMs, 650);
  assert.deepEqual(getExerciseMarkerPositionAt(markers[0], paths, entries, 500), { x: -4, z: 0 });
  assert.deepEqual(getExerciseMarkerPositionAt(markers[0], paths, entries, 5000), shot.glide.to);
});

test("makes a lob into a dunk that starts as it arrives an alley-oop caught in the air", () => {
  const markers = [{ ...player("blue"), id: "p", x: 0, z: 2 }, { ...player("blue"), id: "r", x: -5, z: 1 }];
  const lob = { id: "lob", kind: "pass", fromId: "p", toId: "r", startMs: 0, passStyle: "lob" };
  const arrival = buildExerciseTimeline([lob], markers, basketballPace).entries[0].durationMs;
  const paths = [lob, { id: "dunk", kind: "shot", fromId: "r", toPoint: hoop, startMs: Math.round(arrival + 150), shotStyle: "dunk" }];
  const { entries } = buildExerciseTimeline(paths, markers, basketballPace);
  const lobEntry = entries.find(entry => entry.pathId === "lob"), dunk = entries.find(entry => entry.pathId === "dunk");
  assert.equal(lobEntry.alleyOop, true);
  const caughtAt = lobEntry.startMs + lobEntry.durationMs, receiver = getExerciseMarkerPositionAt(markers[1], paths, entries, caughtAt);
  assert.ok(Math.hypot(lobEntry.to.x - receiver.x, lobEntry.to.z - receiver.z) < 1e-9);
  assert.ok(dunk.glide.startMs < caughtAt);
  const midAir = getExercisePlayerFocus(markers[1], markers, paths, entries, caughtAt - 50);
  assert.equal(midAir.pose, "shoot");
  assert.equal(midAir.shotStyle, "dunk");
  assert.equal(midAir.holding, false);
  assert.equal(getExercisePlayerFocus(markers[1], markers, paths, entries, caughtAt + 50).holding, true);
});

test("keeps a lob followed later by a jump shot an ordinary catch", () => {
  const markers = [{ ...player("blue"), id: "p", x: 0, z: 2 }, { ...player("blue"), id: "r", x: -5, z: 1 }];
  const paths = [{ id: "lob", kind: "pass", fromId: "p", toId: "r", startMs: 0, passStyle: "lob" }, { id: "shot", kind: "shot", fromId: "r", toPoint: hoop, startMs: 6000 }];
  const { entries } = buildExerciseTimeline(paths, markers, basketballPace);
  assert.equal(entries.find(entry => entry.pathId === "lob").alleyOop, undefined);
});

test("does not count a dunk that starts before the lob arrives as an alley-oop", () => {
  const markers = [{ ...player("blue"), id: "p", x: 0, z: 2 }, { ...player("blue"), id: "r", x: -5, z: 1 }];
  const lob = { id: "lob", kind: "pass", fromId: "p", toId: "r", startMs: 0, passStyle: "lob" };
  const arrival = buildExerciseTimeline([lob], markers, basketballPace).entries[0].durationMs;
  const paths = [lob, { id: "dunk", kind: "shot", fromId: "r", toPoint: hoop, startMs: Math.round(arrival - 200), shotStyle: "dunk" }];
  assert.equal(buildExerciseTimeline(paths, markers, basketballPace).entries.find(entry => entry.pathId === "lob").alleyOop, undefined);
});
