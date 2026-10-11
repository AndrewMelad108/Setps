import { test } from "node:test";
import assert from "node:assert/strict";
import { taskList, visibleTasks, taskStatisticsData } from "../src/tasks";
import { GlobalTask, metrics } from "../src/model";
const task: GlobalTask = {
  id: "study", name: "Study", emoji: "✅", color: "#fff", createdDate: "2026-09-01", archivedDate: null,
  isEssential: true, days: [], minutes: 30,
};
const date = "2026-09-29";
test("tasks preserve completion and identity", () => {
  const tasks = taskList([task], [{ id: "study_" + date, globalTaskId: task.id, date }], date);
  assert.deepEqual(tasks.map(t => [t.id, t.done]), [["global:study", true]]);
  assert.equal(tasks[0].source, task);
});
test("rest-day tasks remain editable in All but are not pending", () => {
  const tasks = taskList([{ ...task, isEssential: false, days: [1] }], [], date);
  assert.equal(visibleTasks(tasks, "all", " STUDY ").length, 1);
  assert.equal(visibleTasks(tasks, "pending", "").length, 0);
});
test("archived and future tasks do not become actionable", () => {
  assert.equal(taskList([{ ...task, archivedDate: date }], [], date).length, 0);
  assert.equal(taskList([{ ...task, createdDate: "2026-10-01" }], [], date)[0].scheduled, false);
});
test("daily statistics count task completions", () => {
  const data = taskStatisticsData([task], [{ id: "study_" + date, globalTaskId: task.id, date }]);
  assert.deepEqual(metrics(data.tasks, data.entries, date, 1), { expected: 1, done: 1, rate: 100 });
});
test("calendar respects creation and archive dates", () => {
  const data = taskStatisticsData([{ ...task, archivedDate: "2026-09-30" }], [{ id: "study_" + date, globalTaskId: task.id, date }]);
  assert.equal(metrics(data.tasks, data.entries, "2026-08-31", 1).expected, 0);
  assert.equal(metrics(data.tasks, data.entries, "2026-09-30", 1).expected, 0);
  assert.equal(metrics(data.tasks, data.entries, date, 1).done, 1);
});
test("deleted tasks leave no ghost completions", () => {
  const data = taskStatisticsData([task], [
    { id: "deleted_" + date, globalTaskId: "deleted", date },
    { id: "study_" + date, globalTaskId: task.id, date },
  ]);
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].habitId, "global:study");
});
