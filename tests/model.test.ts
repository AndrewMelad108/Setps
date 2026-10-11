import { test } from "node:test";
import assert from "node:assert/strict";
import { Habit, due, metrics, streak, shift } from "../src/model";
const h: Habit = {
  id: "read",
  name: "Read",
  emoji: "📖",
  color: "#fff",
  createdDate: "2026-09-21",
  archivedDate: null,
  schedules: [{ from: "2026-09-21", days: [1, 3, 5] }],
};
const entry = (date: string) => ({
  id: "read_" + date,
  habitId: "read",
  date,
});
test("scheduled days only, ignores dates before creation", () => {
  assert.equal(due(h, "2026-09-20"), false);
  assert.equal(due(h, "2026-09-21"), true);
  assert.equal(due(h, "2026-09-22"), false);
  assert.deepEqual(metrics([h], [entry("2026-09-21")], "2026-09-27", 7), {
    expected: 3,
    done: 1,
    rate: 33,
  });
});
test("schedule revisions preserve historical denominator", () => {
  const revised = {
    ...h,
    schedules: [
      ...h.schedules,
      { from: "2026-09-28", days: [0, 1, 2, 3, 4, 5, 6] },
    ],
  };
  assert.equal(metrics([revised], [], "2026-09-27", 7).expected, 3);
  assert.equal(due(revised, "2026-09-29"), true);
});
test("archive preserves past, stops future", () => {
  const archived = { ...h, archivedDate: "2026-09-25" };
  assert.equal(due(archived, "2026-09-23"), true);
  assert.equal(due(archived, "2026-09-25"), false);
});
test("streak skips rest days and incomplete current day", () => {
  assert.equal(
    streak(h, [entry("2026-09-21"), entry("2026-09-23")], "2026-09-25"),
    2,
  );
  assert.equal(streak(h, [entry("2026-09-21")], "2026-09-25"), 0);
});
test("completion duplicates do not inflate rate", () =>
  assert.equal(
    metrics([h], [entry("2026-09-21"), entry("2026-09-21")], "2026-09-21", 1)
      .rate,
    100,
  ));
test("month boundary and empty denominator", () => {
  assert.equal(shift("2026-10-01", -1), "2026-09-30");
  assert.equal(metrics([], [], "2026-09-21").rate, 0);
});

test("task duration accepts English and Arabic keyboard digits", async () => {
  const { parseMinutes } = await import("../src/model");
  assert.equal(parseMinutes("20"), 20);
  assert.equal(parseMinutes("٢٠"), 20);
  assert.equal(parseMinutes("۲۰"), 20);
  assert.ok(Number.isNaN(parseMinutes("abc")));
  assert.equal(Number.isInteger(parseMinutes("2.5")), false);
});
