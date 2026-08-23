import assert from "node:assert/strict";
import test from "node:test";
globalThis.__APP_VERSION__ = "test-version";

const { matchDurationBucket, sanitizeAnalyticsEvent } = await import("../src/analyticsEvents.ts");

test("groups match duration without sending an exact playing time", () => {
  assert.equal(matchDurationBucket(14 * 60 + 59), "under_15_min");
  assert.equal(matchDurationBucket(15 * 60), "15_to_45_min");
  assert.equal(matchDurationBucket(45 * 60), "15_to_45_min");
  assert.equal(matchDurationBucket(45 * 60 + 1), "over_45_min");
});

test("redacts exception messages but preserves diagnostic stack data", () => {
  const event = sanitizeAnalyticsEvent({
    event: "$exception",
    properties: {
      $exception_message: "Player Test Name caused a failure",
      $exception_steps: [{ message: "typed private text" }],
      $exception_list: [{ type: "TypeError", value: "Player Test Name", stacktrace: { frames: [{ filename: "App.tsx" }] } }],
    },
  });

  assert.equal(event.properties.$exception_message, "[redacted]");
  assert.equal(event.properties.$exception_list[0].value, "[redacted]");
  assert.equal(event.properties.$exception_list[0].type, "TypeError");
  assert.deepEqual(event.properties.$exception_list[0].stacktrace, { frames: [{ filename: "App.tsx" }] });
  assert.equal(event.properties.$exception_steps, undefined);
  assert.equal(event.properties.app_version, "test-version");
});

test("does not alter ordinary product analytics events", () => {
  const event = { event: "match_created", properties: { source: "new" } };
  assert.equal(sanitizeAnalyticsEvent(event), event);
});
