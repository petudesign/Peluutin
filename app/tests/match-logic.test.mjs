import test from "node:test";
import assert from "node:assert/strict";
import { applyBatchSubstitution, changePlayerGoal, comparePlaytime, formatPitchPlayerName } from "../src/features/match/matchLogic.ts";

test("applies a batch substitution only when incoming and outgoing counts match", () => {
  const lineup = [1, 2, 3, 4, 5];

  assert.equal(applyBatchSubstitution(lineup, [6, 7], [1]), lineup);
  assert.deepEqual(applyBatchSubstitution(lineup, [6, 7], [1, 3]), [1, 6, 3, 7, 5]);
});

test("rejects duplicate, active, invalid and oversized batch selections", () => {
  const lineup = [1, 2, 3, 4, 5];

  assert.equal(applyBatchSubstitution(lineup, [6, 6], [0, 1]), lineup);
  assert.equal(applyBatchSubstitution(lineup, [1], [0]), lineup);
  assert.equal(applyBatchSubstitution(lineup, [6], [9]), lineup);
  assert.equal(applyBatchSubstitution(lineup, [6, 7, 8, 9, 10, 11], [0, 1, 2, 3, 4, 5]), lineup);
});

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

test("keeps full short names and abbreviates long pitch-card names", () => {
  assert.equal(formatPitchPlayerName("Minna L."), "Minna L.");
  assert.equal(formatPitchPlayerName("Joni-Petteri"), "Joni-Petteri");
  assert.equal(formatPitchPlayerName("Abdullah Ah-Rahdi"), "Abdullah A.");
  assert.equal(formatPitchPlayerName("Maximilianusz"), "Maximilianu…");
});
