import test from "node:test";
import assert from "node:assert/strict";
import { parseActiveMatch, parseTeams } from "../src/storage.ts";

const fallbackFormations = [{ id: "2–2–3", name: "2–2–3", slots: [] }];

test("rejects malformed browser storage without throwing", () => {
  assert.deepEqual(parseTeams("{bad json", fallbackFormations), []);
  assert.equal(parseActiveMatch(JSON.stringify({ teamId: "team-1" })), null);
});

test("bounds stored names and player numbers", () => {
  const [team] = parseTeams(JSON.stringify([{
    id: "team-1",
    name: `  ${"A".repeat(80)}  `,
    players: [{ id: 1, name: ` ${"B".repeat(80)} `, number: 400 }],
  }]), fallbackFormations);

  assert.equal(team.name.length, 60);
  assert.equal(team.players[0].name.length, 60);
  assert.equal(team.players[0].number, 99);
  assert.equal(team.formations, fallbackFormations);
});

test("accepts a valid paused active match", () => {
  const match = {
    teamId: "team-1",
    opponent: " Testi ",
    venue: "home",
    activePlayerIds: [1],
    lineup: [1],
    score: [1, 0],
    seconds: 120,
    formation: "2–2–3",
    minutes: { 1: 120 },
    goals: { 1: 1 },
  };

  assert.equal(parseActiveMatch(JSON.stringify(match)).opponent, "Testi");
});
