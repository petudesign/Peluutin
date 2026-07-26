import assert from "node:assert/strict";
import test from "node:test";
import { createFormation, reorderLineup, validateFormation } from "../src/formation.ts";

test("creates a valid eight-player formation from a Finnish formation name", () => {
  const slots = createFormation("2–3–2", 8);
  assert.equal(slots.length, 8);
  assert.equal(slots[0][0], "MV");
});

test("supports 5v5, 8v8 and 11v11 formations", () => {
  assert.equal(createFormation("1–2–1", 5).length, 5);
  assert.equal(createFormation("2–3–2", 8).length, 8);
  assert.equal(createFormation("4–4–2", 11).length, 11);
});

test("supports three or four lines and five players on an 11v11 line", () => {
  assert.equal(createFormation("4–3–2–1", 11).length, 11);
  assert.equal(createFormation("4–4–1–1", 11).length, 11);
  const fivePlayerMidfield = createFormation("3–5–2", 11).slice(4, 9);
  assert.equal(fivePlayerMidfield.length, 5);
  assert.ok(fivePlayerMidfield[0][2] < fivePlayerMidfield[2][2]);
  assert.equal(fivePlayerMidfield[0][2], fivePlayerMidfield[4][2]);
});

test("explains why an invalid formation cannot be added", () => {
  assert.equal(
    validateFormation("4-3-4", 11),
    "Riveillä pitää olla yhteensä 10 pelaajaa. Maalivahti lisätään erikseen.",
  );
  assert.match(validateFormation("1-5-1", 8), /enintään 4 pelaajaa/);
  assert.match(validateFormation("3-1-1", 5), /enintään 2 pelaajaa/);
  assert.match(validateFormation("4 3 3", 11), /väliviivoilla eroteltuna/);
});

test("rejects unsupported team sizes", () => {
  assert.equal(createFormation("2–2–2", 8), null);
});

test("creates a four-player defense with centre-backs below the full-backs", () => {
  const slots = createFormation("4–2–1", 8);
  assert.equal(slots.length, 8);
  assert.deepEqual(slots.slice(1, 5).map((slot) => slot[0]), ["VP", "VKP", "OKP", "OP"]);
  assert.ok(slots[2][2] > slots[1][2]);
  assert.equal(slots[2][2], slots[3][2]);
  assert.equal(slots[1][2], slots[4][2]);
});

test("formation change keeps right-sided players on the right", () => {
  const from = createFormation("2–2–3", 8);
  const to = createFormation("3–2–2", 8);
  const lineup = ["MV", "VP", "OP", "VK", "OK", "VH", "KH", "OH"];
  const changed = reorderLineup(lineup, from, to);

  assert.ok(changed.indexOf("OK") > changed.indexOf("VK"));
  assert.ok(changed.indexOf("OH") > changed.indexOf("VH"));
});
