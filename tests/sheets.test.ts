import { test } from "node:test";
import assert from "node:assert/strict";
import { WorkSession, WorkSheet, isDateKey, sessionsForSheet, sheetEntries, sheetSummary, workSheetSummary } from "../src/model";

const sheet: WorkSheet = {
  id: "oct", title: "October", from: "2026-10-01", to: "2026-10-31",
  hourlyRate: 100, currency: "EGP", taskIds: ["design", "code"], createdAt: 1,
};
const entries = [
  { id: "1", globalTaskId: "design", date: "2026-10-01", minutes: 60, actualSeconds: 1800 },
  { id: "2", globalTaskId: "code", date: "2026-10-31", minutes: 60 },
  { id: "3", globalTaskId: "code", date: "2026-11-01", minutes: 60 },
  { id: "4", globalTaskId: "other", date: "2026-10-10", minutes: 60 },
];
const sessions: WorkSession[] = [
  { id: "s1", taskId: "design", date: "2026-10-01", seconds: 3600, source: "timer", createdAt: 1 },
  { id: "s2", taskId: "design", date: "2026-10-01", seconds: 1800, source: "manual", createdAt: 2 },
  { id: "s3", taskId: "code", date: "2026-10-02", seconds: 900, source: "timer", createdAt: 3 },
  { id: "s4", taskId: "code", date: "2026-11-01", seconds: 3600, source: "timer", createdAt: 4 },
  { id: "s5", taskId: "other", date: "2026-10-02", seconds: 3600, source: "timer", createdAt: 5 },
];

test("sheet includes selected tasks within an inclusive date range", () => {
  assert.deepEqual(sheetEntries(sheet, entries).map(entry => entry.id), ["1", "2"]);
});

test("sheet prefers measured time and falls back to legacy planned minutes", () => {
  assert.deepEqual(sheetSummary(sheet, entries), { count: 2, seconds: 5400, hours: 1.5, total: 150 });
});

test("sheet totals multiple timer and manual sessions across work days", () => {
  assert.deepEqual(sessionsForSheet(sheet, sessions).map(session => session.id), ["s1", "s2", "s3"]);
  assert.deepEqual(workSheetSummary(sheet, sessions), {
    taskCount: 2, sessionCount: 3, seconds: 6300, hours: 1.75, total: 175,
  });
});

test("date keys reject impossible calendar dates", () => {
  assert.equal(isDateKey("2026-10-10"), true);
  assert.equal(isDateKey("2026-02-30"), false);
  assert.equal(isDateKey("10/10/2026"), false);
});
