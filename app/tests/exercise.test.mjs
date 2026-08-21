import assert from "node:assert/strict";
import test from "node:test";
import { canPassBetween, keepSingleBall } from "../src/features/exercises/exerciseTypes.ts";

const player = (team) => ({ id: team, kind: "player", team, name: team, x: 0, z: 0 });
const ball = { id: "ball", kind: "ball", name: "Pallo", x: 0, z: 0 };

test("allows passes within a team or via a ball, but not to an opponent", () => {
  assert.equal(canPassBetween(player("blue"), player("blue")), true);
  assert.equal(canPassBetween(player("blue"), player("red")), false);
  assert.equal(canPassBetween(player("blue"), ball), true);
});

test("keeps at most one ball in an exercise", () => {
  assert.deepEqual(keepSingleBall([ball, player("blue"), { ...ball, id: "ball-2" }]).map(({ id }) => id), ["ball", "blue"]);
});
