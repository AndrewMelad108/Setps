export type Schedule = { from: string; days: number[]; minutes: number };
export type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdDate: string;
  archivedDate: string | null;
  schedules: Schedule[];
};
export type Entry = {
  id: string;
  habitId: string;
  date: string;
  minutes: number;
};
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function shift(key: string, n: number) {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function schedule(h: Habit, key: string) {
  return [...h.schedules].reverse().find((s) => s.from <= key);
}
export function due(h: Habit, key: string) {
  const s = schedule(h, key);
  return (
    key >= h.createdDate &&
    (!h.archivedDate || key < h.archivedDate) &&
    !!s?.days.includes(new Date(key + "T12:00:00").getDay())
  );
}
export function range(end: string, count: number) {
  return Array.from({ length: count }, (_, i) => shift(end, i - count + 1));
}
export function metrics(
  habits: Habit[],
  entries: Entry[],
  end: string,
  count = 30,
) {
  const days = range(end, count);
  const keys = new Set(entries.map((e) => e.habitId + "_" + e.date));
  let expected = 0,
    done = 0;
  for (const d of days)
    for (const h of habits)
      if (due(h, d)) {
        expected++;
        if (keys.has(h.id + "_" + d)) done++;
      }
  return {
    expected,
    done,
    rate: expected ? Math.round((done / expected) * 100) : 0,
  };
}
export function streak(h: Habit, entries: Entry[], today: string) {
  const keys = new Set(
    entries.filter((e) => e.habitId === h.id).map((e) => e.date),
  );
  let total = 0;
  for (let day = today; day >= h.createdDate; day = shift(day, -1)) {
    if (!due(h, day)) continue;
    if (keys.has(day)) total++;
    else if (day !== today) break;
  }
  return total;
}

export type TaskStatus = "done" | "pending" | "unscheduled";
export function taskStatus(h: Habit, entries: Entry[], date: string): TaskStatus {
  if (!due(h, date)) return "unscheduled";
  return entries.some(e => e.habitId === h.id && e.date === date) ? "done" : "pending";
}
export function filterTasks(
  habits: Habit[], entries: Entry[], date: string,
  status: "all" | "done" | "pending", query = "",
) {
  const search = query.trim().toLocaleLowerCase();
  return habits.filter(h => {
    const state = taskStatus(h, entries, date);
    return state !== "unscheduled" && (status === "all" || state === status)
      && h.name.toLocaleLowerCase().includes(search);
  });
}

/** Accept digits produced by Arabic and Persian keyboards as well as Latin digits. */
export function parseMinutes(value: string) {
  return Number(value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0)));
}

export type GlobalTask = {
  minutes?: number;
  id: string;
  name: string;
  emoji: string;
  color: string;
  isEssential: boolean;
  days: number[];
  createdDate: string;
  archivedDate: string | null;
};

export type GlobalTaskEntry = {
  minutes?: number;
  /** Measured focus time. Older records only contain planned minutes. */
  actualSeconds?: number;
  id: string;           // globalTaskId + '_' + date
  globalTaskId: string;
  date: string;
};

export type Currency = "EGP" | "USD";
export type WorkSheet = {
  id: string;
  title: string;
  from: string;
  to: string;
  hourlyRate: number;
  currency: Currency;
  taskIds: string[];
  createdAt: number;
};

export type Appointment = {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  createdAt: number;
};

export type WorkSession = {
  id: string;
  taskId: string;
  date: string;
  seconds: number;
  source: "timer" | "manual";
  createdAt: number;
};

export function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00");
  return !Number.isNaN(date.valueOf()) && dateKey(date) === value;
}

export function sheetEntries(sheet: WorkSheet, entries: GlobalTaskEntry[]) {
  const ids = new Set(sheet.taskIds);
  return entries.filter(entry => ids.has(entry.globalTaskId)
    && entry.date >= sheet.from && entry.date <= sheet.to);
}

export function entrySeconds(entry: GlobalTaskEntry) {
  return Math.max(0, entry.actualSeconds ?? (entry.minutes ?? 0) * 60);
}

export function sheetSummary(sheet: WorkSheet, entries: GlobalTaskEntry[]) {
  const selected = sheetEntries(sheet, entries);
  const seconds = selected.reduce((total, entry) => total + entrySeconds(entry), 0);
  return {
    count: selected.length,
    seconds,
    hours: seconds / 3600,
    total: (seconds / 3600) * sheet.hourlyRate,
  };
}

export function sessionsForSheet(sheet: WorkSheet, sessions: WorkSession[]) {
  const ids = new Set(sheet.taskIds);
  return sessions.filter(session => ids.has(session.taskId)
    && session.date >= sheet.from && session.date <= sheet.to);
}

export function workSheetSummary(sheet: WorkSheet, sessions: WorkSession[]) {
  const selected = sessionsForSheet(sheet, sessions);
  const seconds = selected.reduce((total, session) => total + session.seconds, 0);
  return {
    taskCount: new Set(selected.map(session => session.taskId)).size,
    sessionCount: selected.length,
    seconds,
    hours: seconds / 3600,
    total: (seconds / 3600) * sheet.hourlyRate,
  };
}

export function globalTaskDue(task: GlobalTask, dateKey: string): boolean {
  if (task.archivedDate && dateKey >= task.archivedDate) return false;
  if (task.isEssential) return true;
  const dow = new Date(dateKey + "T12:00:00").getDay();
  return task.days.includes(dow);
}

export function globalTaskStatus(
  task: GlobalTask,
  entries: GlobalTaskEntry[],
  date: string,
): "done" | "pending" {
  return entries.some(e => e.globalTaskId === task.id && e.date === date)
    ? "done"
    : "pending";
}
