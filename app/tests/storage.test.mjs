import test from "node:test";
import assert from "node:assert/strict";
import { parseActiveMatch, parseScheduledMatches, parseTeams } from "../src/storage.ts";

const fallbackFormations = [{ id: "8-2–2–3", name: "2–2–3", teamSize: 8, slots: [] }];

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
    scheduledMatchId: "scheduled-1",
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

  const parsed = parseActiveMatch(JSON.stringify(match));
  assert.equal(parsed.opponent, "Testi");
  assert.equal(parsed.scheduledMatchId, "scheduled-1");
});

test("stores up to three formations for each supported team size", () => {
  const formations = [
    [5, "5a"], [5, "5b"], [5, "5c"], [5, "5d"],
    [8, "8a"], [8, "8b"], [8, "8c"], [8, "8d"],
    [11, "11a"], [11, "11b"], [11, "11c"], [11, "11d"],
  ].map(([teamSize, id]) => ({ id, name: id, teamSize, slots: [] }));
  const [team] = parseTeams(JSON.stringify([{
    id: "team-1",
    name: "Testijoukkue",
    players: [],
    formations,
  }]), fallbackFormations);

  assert.deepEqual(team.formations.map(({ id }) => id), ["5a", "5b", "5c", "8a", "8b", "8c", "11a", "11b", "11c"]);
});

test("keeps valid scheduled matches in chronological order", () => {
  const matches = [
    { id: "later", scheduledAt: "2026-08-24T18:00:00.000Z", teamId: "team-1", opponent: "B", venue: "away", formation: "8-a", activePlayerIds: [1], lineup: [1] },
    { id: "first", scheduledAt: "2026-08-23T10:00:00.000Z", teamId: "team-1", opponent: " A ", venue: "home", formation: "8-a", activePlayerIds: [1], lineup: [1] },
  ];
  const parsed = parseScheduledMatches(JSON.stringify(matches));
  assert.deepEqual(parsed.map(({ id }) => id), ["first", "later"]);
  assert.equal(parsed[0].opponent, "A");
});
