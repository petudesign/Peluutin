import assert from "node:assert/strict";
import test from "node:test";
import { formatScheduledDate, formatScheduledDateTime, parseScheduledDate, scheduledDateFromInputValue, scheduledDateToInputValue, scheduledStartError } from "../src/features/match/scheduledDate.ts";

test("formats and parses Finnish 24-hour match times", () => {
  const date = new Date(2026, 7, 22, 16, 0);
  assert.equal(formatScheduledDate(date), "22/08/2026");
  assert.equal(formatScheduledDateTime(date.toISOString()), "22/08/2026 16:00");
  assert.equal(parseScheduledDate("22/08/2026", "16:00")?.getTime(), date.getTime());
});

test("converts between Finnish dates and native date input values", () => {
  assert.equal(scheduledDateToInputValue("22/08/2026"), "2026-08-22");
  assert.equal(scheduledDateFromInputValue("2026-08-22"), "22/08/2026");
  assert.equal(scheduledDateToInputValue("not a date"), "");
  assert.equal(scheduledDateFromInputValue("22/08/2026"), "");
});

test("rejects invalid dates and 12-hour clock values", () => {
  assert.equal(parseScheduledDate("31/02/2026", "16:00"), null);
  assert.equal(parseScheduledDate("22/08/2026", "4:00 PM"), null);
});

test("rejects past and duplicate team start times", () => {
  const now = new Date(2026, 7, 22, 15, 0);
  const start = new Date(2026, 7, 22, 16, 0);
  assert.match(scheduledStartError(now, "team-1", [], now), /myöhemmin/);
  assert.match(scheduledStartError(start, "team-1", [{ teamId: "team-1", scheduledAt: start.toISOString() }], now), /samaan ajankohtaan/);
  assert.equal(scheduledStartError(start, "team-2", [{ teamId: "team-1", scheduledAt: start.toISOString() }], now), "");
});
