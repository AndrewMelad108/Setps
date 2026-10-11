import { test } from "node:test";
import assert from "node:assert/strict";
import { Appointment, WorkSession, WorkSheet, appointmentOccursOn, appointmentTimeTo12, appointmentTimeTo24, durationMinutes, isDateKey, sessionsForSheet, workByTaskForSheet, workSheetSummary } from "../src/model";

const sheet: WorkSheet = {
  id: "oct", title: "October", from: "2026-10-01", to: "2026-10-31",
  hourlyRate: 100, currency: "EGP", taskIds: ["design", "code"], createdAt: 1,
};
const sessions: WorkSession[] = [
  { id: "s1", taskId: "design", date: "2026-10-01", seconds: 3600, source: "timer", createdAt: 1 },
  { id: "s2", taskId: "design", date: "2026-10-01", seconds: 1800, source: "manual", createdAt: 2 },
  { id: "s3", taskId: "code", date: "2026-10-02", seconds: 900, source: "timer", createdAt: 3 },
  { id: "s4", taskId: "code", date: "2026-11-01", seconds: 3600, source: "timer", createdAt: 4 },
  { id: "s5", taskId: "other", date: "2026-10-02", seconds: 3600, source: "timer", createdAt: 5 },
];

test("sheet totals every timer and manual session for its assigned tasks", () => {
  assert.deepEqual(sessionsForSheet(sheet, sessions).map(session => session.id), ["s1", "s2", "s3", "s4"]);
  assert.deepEqual(workSheetSummary(sheet, sessions), {
    taskCount: 2, sessionCount: 4, seconds: 9900, hours: 2.75, total: 275,
  });
  assert.deepEqual(workByTaskForSheet(sheet, sessions), [
    { taskId: "design", seconds: 5400 }, { taskId: "code", seconds: 4500 },
  ]);
});

test("empty sheets are valid summaries and duration accepts hours plus minutes", () => {
  assert.deepEqual(workSheetSummary({ ...sheet, taskIds: [] }, sessions), {
    taskCount: 0, sessionCount: 0, seconds: 0, hours: 0, total: 0,
  });
  assert.equal(durationMinutes("٢", "٣٠"), 150);
  assert.equal(Number.isNaN(durationMinutes("1", "60")), true);
});

test("appointments support one-time, daily and yearly recurrence", () => {
  const base: Appointment = { id: "a", title: "A", date: "2026-10-10", time: "09:00", notes: "", createdAt: 1 };
  assert.equal(appointmentOccursOn(base, "2026-10-11"), false);
  assert.equal(appointmentOccursOn({ ...base, recurrence: "daily" }, "2026-10-11"), true);
  assert.equal(appointmentOccursOn({ ...base, recurrence: "yearly" }, "2027-10-10"), true);
  assert.equal(appointmentOccursOn({ ...base, recurrence: "yearly" }, "2027-10-11"), false);
  assert.equal(appointmentTimeTo24("12:30", "AM"), "00:30");
  assert.equal(appointmentTimeTo24("1:05", "PM"), "13:05");
  assert.deepEqual(appointmentTimeTo12("23:15"), { time: "11:15", period: "PM" });
});

test("date keys reject impossible calendar dates", () => {
  assert.equal(isDateKey("2026-10-10"), true);
  assert.equal(isDateKey("2026-02-30"), false);
  assert.equal(isDateKey("10/10/2026"), false);
});
