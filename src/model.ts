export type Schedule = { from: string; days: number[] };
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
  /** Missing on older records and therefore treated as a one-time appointment. */
  recurrence?: "once" | "daily" | "yearly";
  /** Loud bundled notification sound; older records use alarm. */
  sound?: "alarm" | "siren" | "urgent";
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

export function sessionsForSheet(sheet: WorkSheet, sessions: WorkSession[]) {
  const ids = new Set(sheet.taskIds);
  // A sheet is the billing home for its tasks. Once a task is assigned, every
  // recorded session must be visible in that sheet, regardless of when it was
  // logged. The date range remains useful as sheet metadata/export context.
  return sessions.filter(session => ids.has(session.taskId));
}

export function durationMinutes(hoursValue: string, minutesValue: string) {
  const hours = parseMinutes(hoursValue || "0");
  const minutes = parseMinutes(minutesValue || "0");
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)
    || hours < 0 || minutes < 0 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

export function appointmentOccursOn(appointment: Appointment, date: string) {
  if (!isDateKey(date)) return false;
  const recurrence = appointment.recurrence ?? "once";
  if (date < appointment.date) return false;
  if (recurrence === "daily") return true;
  if (recurrence === "yearly") return date.slice(5) === appointment.date.slice(5);
  return date === appointment.date;
}

export function appointmentTimeTo24(time: string, period: "AM" | "PM") {
  const match = /^(0?[1-9]|1[0-2]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (period === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export function appointmentTimeTo12(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return { time: "09:00", period: "AM" as const };
  const hour = Number(match[1]);
  return {
    time: `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]}`,
    period: (hour >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
}

export function workByTaskForSheet(sheet: WorkSheet, sessions: WorkSession[]) {
  const totals = new Map<string, number>();
  for (const session of sessionsForSheet(sheet, sessions))
    totals.set(session.taskId, (totals.get(session.taskId) ?? 0) + session.seconds);
  return sheet.taskIds.map(taskId => ({ taskId, seconds: totals.get(taskId) ?? 0 }));
}

export function workSheetSummary(sheet: WorkSheet, sessions: WorkSession[]) {
  const selected = sessionsForSheet(sheet, sessions);
  const seconds = selected.reduce((total, session) => total + session.seconds, 0);
  return {
    // Assigned tasks must show up before their first work session too.
    taskCount: new Set(sheet.taskIds).size,
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
