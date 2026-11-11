import assert from "node:assert/strict";
import test from "node:test";
import { resultFor, summarizeMatches, summarizePlayers, TEAM_METRICS } from "../src/features/match/matchStats.ts";

const player = (id, seconds, goals = 0) => ({ id, name: `Pelaaja ${id}`, number: id, seconds, goals });
const matches = [
  { id: "a", playedAt: "2026-11-01", opponent: "HJK", venue: "home", score: [3, 1], duration: 2400, formation: "2–3–2", players: [player(1, 2400, 2), player(2, 0)] },
  { id: "b", playedAt: "2026-11-08", opponent: "PK-35", venue: "away", score: [2, 2], duration: 2400, formation: "2–3–2", players: [player(1, 1200), player(2, 1800, 1)] },
  { id: "c", playedAt: "2026-11-15", opponent: "KäPa", venue: "away", score: [4, 1], duration: 1800, formation: "3–2–2", players: [player(2, 2000)] },
];

test("reads results from the team's side of the score", () => {
  assert.deepEqual(matches.map(resultFor), ["Voitto", "Tasapeli", "Tappio"]);
});

test("summarises results, goals and duration", () => {
  assert.deepEqual(summarizeMatches(matches), { matches: 3, wins: 1, draws: 1, losses: 1, goalsFor: 6, goalsAgainst: 7, totalMatchSeconds: 6600 });
});

test("counts an appearance only when the player actually played", () => {
  const [first, second] = summarizePlayers(matches);
  assert.equal(first.id, 2);
  assert.equal(first.appearances, 2);
  assert.equal(second.goals, 2);
});

test("every team metric renders from an empty summary", () => {
  const empty = summarizeMatches([]);
  for (const metric of TEAM_METRICS) assert.equal(typeof metric.value(empty), "string", metric.id);
});
