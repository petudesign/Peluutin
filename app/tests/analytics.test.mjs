import assert from "node:assert/strict";
import test from "node:test";
import { matchDurationBucket } from "../src/analyticsEvents.ts";

test("groups match duration without sending an exact playing time", () => {
  assert.equal(matchDurationBucket(14 * 60 + 59), "under_15_min");
  assert.equal(matchDurationBucket(15 * 60), "15_to_45_min");
  assert.equal(matchDurationBucket(45 * 60), "15_to_45_min");
  assert.equal(matchDurationBucket(45 * 60 + 1), "over_45_min");
});
