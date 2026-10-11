/** Derive stopwatch time from its start timestamp, even after background suspension. */
export function timerNotificationState(
  timer: { end: number | null; remaining: number } | null,
  now: number,
) {
  if (!timer) return null;
  const seconds = timer.end === null
    ? timer.remaining
    : timer.remaining + Math.max(0, Math.floor((now - timer.end) / 1000));
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return {
    running: timer.end !== null,
    end: undefined,
    timeout: undefined,
    label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
  };
}

/** Keep existing task sessions, but never restore a session for the removed Habit feature. */
export function restoreTaskTimer(serialized: string) {
  try {
    const value = JSON.parse(serialized);
    const taskId = value?.taskId ?? value?.habitId;
    if (typeof taskId !== "string" || !taskId.startsWith("global:")
      || typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
      || !Number.isFinite(value.remaining) || value.remaining < 0
      || !(value.end === null || (typeof value.end === "number" && Number.isFinite(value.end)))) return null;
    const sessionId = typeof value.sessionId === "string" && value.sessionId
      ? value.sessionId : `session_restored_${value.date}_${taskId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    if (value.mode !== "stopwatch") {
      const planned = Number.isFinite(value.plannedSeconds) ? value.plannedSeconds as number : value.remaining as number;
      const oldRemaining = value.end === null ? value.remaining as number
        : Math.max(0, Math.ceil(((value.end as number) - Date.now()) / 1000));
      return { taskId, date: value.date as string, remaining: Math.max(0, planned - oldRemaining),
        end: null, sessionId, mode: "stopwatch" as const };
    }
    return { taskId, date: value.date as string, remaining: value.remaining as number,
      end: value.end as number | null, sessionId, mode: "stopwatch" as const };
  } catch { return null; }
}
