import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildMatchXlsx } from "../src/export.ts";

test("builds a formatted and readable Excel workbook", async () => {
  const bytes = await buildMatchXlsx({
    playedAt: "2026-07-24T12:00:00.000Z",
    opponent: "HJK Sininen",
    venue: "home",
    score: [2, 1],
    duration: 1800,
    players: [{ number: 9, name: "Aleksandra Laukka-Oja", seconds: 900, goals: 2 }],
  }, "FC Revontuli");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet("Ottelu");

  assert.equal(sheet.getCell("A1").value, "Otteluraportti");
  assert.equal(sheet.getCell("B10").value, "Aleksandra Laukka-Oja");
  assert.equal(sheet.getCell("C10").value, 15);
  assert.equal(sheet.getCell("D10").value, 2);
  assert.equal(sheet.getColumn(2).width, 30);
  assert.equal(sheet.getColumn(1).width, 16);
  assert.equal(sheet.getCell("C9").alignment.horizontal, "center");
  assert.equal(sheet.getCell("B7").alignment.horizontal, "left");
  assert.equal(sheet.getCell("A9").fill.fgColor.argb, "FF0B57D0");
  assert.equal(sheet.autoFilter, undefined);
});
