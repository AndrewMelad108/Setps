import { test } from "node:test";
import assert from "node:assert/strict";
import { timerNotificationState } from "../src/timerState";

test("stopwatch uses its start time after background suspension", () => {
  const state = timerNotificationState({ end: 61000, remaining: 120 }, 121000)!;
  assert.equal(state.label, "3:00");
  assert.equal(state.timeout, undefined);
  assert.equal(state.end, undefined);
  assert.equal(state.running, true);
});
test("pause keeps the accumulated stopwatch time", () => {
  const state = timerNotificationState({ end: null, remaining: 65 }, 999999)!;
  assert.equal(state.label, "1:05");
  assert.equal(state.running, false);
  assert.equal(state.timeout, undefined);
});
test("zero is a valid running stopwatch and cancelled timers disappear", () => {
  assert.equal(timerNotificationState(null, 0), null);
  assert.equal(timerNotificationState({ end: 1000, remaining: 0 }, 1000)?.label, "0:00");
  assert.equal(timerNotificationState({ end: 1000, remaining: 0 }, 5000)?.label, "0:04");
  assert.equal(timerNotificationState({ end: null, remaining: 0 }, 5000)?.label, "0:00");
});

test("removing Habits preserves task timers but drops old habit sessions", async () => {
  const { restoreTaskTimer } = await import("../src/timerState");
  const old = { habitId: "global:study", date: "2026-09-29", remaining: 60, end: null };
  assert.equal(restoreTaskTimer(JSON.stringify(old))?.taskId, "global:study");
  assert.equal(restoreTaskTimer(JSON.stringify({ ...old, mode: "stopwatch" }))?.mode, "stopwatch");
  assert.equal(restoreTaskTimer(JSON.stringify({ ...old, habitId: "old-habit" })), null);
  assert.equal(restoreTaskTimer("null"), null);
  assert.equal(restoreTaskTimer("bad-json"), null);
  assert.equal(restoreTaskTimer(JSON.stringify({ taskId: "global:study" })), null);
});
