import assert from "node:assert/strict";
import test from "node:test";
import { createFormation, reorderLineup } from "../src/formation.ts";

test("creates a valid eight-player formation from a Finnish formation name", () => {
  const slots = createFormation("2–3–2");
  assert.equal(slots.length, 8);
  assert.equal(slots[0][0], "MV");
});

test("rejects formations that do not contain seven field players", () => {
  assert.equal(createFormation("2–2–2"), null);
});

test("formation change keeps right-sided players on the right", () => {
  const from = createFormation("2–2–3");
  const to = createFormation("3–2–2");
  const lineup = ["MV", "VP", "OP", "VK", "OK", "VH", "KH", "OH"];
  const changed = reorderLineup(lineup, from, to);

  assert.ok(changed.indexOf("OK") > changed.indexOf("VK"));
  assert.ok(changed.indexOf("OH") > changed.indexOf("VH"));
});
