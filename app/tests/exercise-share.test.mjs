import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { decodeExerciseShare, encodeExerciseShareCompressed } from "../src/features/exercises/exerciseSharing.ts";

const draft = {
  name: "Pienpeli",
  notes: "",
  markers: [{ id: "a", kind: "player", team: "blue", name: "Pelaaja 1", x: 0, z: 0 }],
  paths: [],
  annotations: [],
  goalSize: "small",
  pitchPreset: "training",
  pitchOrientation: "landscape",
  pitchStyle: "grass",
  updatedAt: "2026-11-05T00:00:00.000Z",
};

const base64Url = (bytes) => Buffer.from(bytes).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const plainLink = (payload) => `#harjoite=${base64Url(Buffer.from(JSON.stringify(payload)))}`;
const gzipLink = (payload) => `#harjoite=g.${base64Url(gzipSync(typeof payload === "string" ? payload : JSON.stringify(payload)))}`;

test("round-trips a compressed exercise share link", async () => {
  assert.deepEqual(await decodeExerciseShare(`#harjoite=${await encodeExerciseShareCompressed(draft)}`), draft);
});

test("decodes plain and compressed links the same way", async () => {
  assert.deepEqual(await decodeExerciseShare(plainLink({ version: 1, draft })), draft);
  assert.deepEqual(await decodeExerciseShare(gzipLink({ version: 1, draft })), draft);
});

test("applies the size limits to compressed links too", async () => {
  const tooManyMarkers = { ...draft, markers: Array.from({ length: 101 }, (_, index) => ({ ...draft.markers[0], id: String(index) })) };
  assert.equal(await decodeExerciseShare(plainLink({ version: 1, draft: tooManyMarkers })), null);
  assert.equal(await decodeExerciseShare(gzipLink({ version: 1, draft: tooManyMarkers })), null);
});

test("rejects malformed compressed payloads", async () => {
  assert.equal(await decodeExerciseShare(gzipLink({ version: 2, draft })), null);
  assert.equal(await decodeExerciseShare(gzipLink({ version: 1, draft: { ...draft, markers: "nope" } })), null);
  assert.equal(await decodeExerciseShare(gzipLink({ version: 1, draft: { ...draft, paths: [null] } })), null);
  assert.equal(await decodeExerciseShare(gzipLink("not json")), null);
  assert.equal(await decodeExerciseShare("#harjoite=g.@@@"), null);
  assert.equal(await decodeExerciseShare("#harjoitteet"), null);
});

test("stops inflating a compressed link that expands past the limit", async () => {
  const bomb = gzipLink(" ".repeat(20_000_000));
  assert.ok(bomb.length < 100_000);
  assert.equal(await decodeExerciseShare(bomb), null);
});
