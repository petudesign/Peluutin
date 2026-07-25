import test from "node:test";
import assert from "node:assert/strict";
import { changePlayerGoal, comparePlaytime } from "../src/features/match/matchLogic.ts";

test("adds and removes a player goal with the own-team score", () => {
  const added = changePlayerGoal({}, [0, 0], 7, 1, 1);
  assert.deepEqual(added, { goals: { 7: 1 }, score: [0, 1] });

  const removed = changePlayerGoal(added.goals, added.score, 7, 1, -1);
  assert.deepEqual(removed, { goals: { 7: 0 }, score: [0, 0] });
});

test("does not remove a goal that does not exist", () => {
  const goals = {};
  const score = [2, 1];
  const result = changePlayerGoal(goals, score, 7, 0, -1);
  assert.equal(result.goals, goals);
  assert.equal(result.score, score);
});

test("classifies playtime around the active-player average", () => {
  assert.deepEqual(comparePlaytime(500, 600), { state: "behind", differenceSeconds: -100 });
  assert.deepEqual(comparePlaytime(590, 600), { state: "balanced", differenceSeconds: -10 });
  assert.deepEqual(comparePlaytime(700, 600), { state: "ahead", differenceSeconds: 100 });
});
