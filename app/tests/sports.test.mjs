import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SPORT, getSport, isSport, SPORTS, teamSizeFor } from "../src/sports.ts";

test("every sport offers its default format", () => {
  for (const sport of SPORTS) assert.ok(sport.teamSizes.includes(sport.defaultTeamSize), sport.id);
});

test("recognises known sports and falls back to the default", () => {
  assert.equal(isSport("futsal"), true);
  assert.equal(isSport("hockey"), false);
  assert.equal(getSport(undefined).id, DEFAULT_SPORT);
});

test("keeps a requested format only when the sport offers it", () => {
  assert.equal(teamSizeFor("football", 11), 11);
  assert.equal(teamSizeFor("football", null), 8);
  assert.equal(teamSizeFor("futsal", 11), 5);
});
