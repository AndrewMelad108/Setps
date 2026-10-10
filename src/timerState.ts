/** Derive notification timing from the deadline, never from JS interval ticks. */
export function timerNotificationState(
  timer: { end: number | null; remaining: number } | null,
  now: number,
) {
  if (!timer) return null;
  const seconds = timer.end === null ? timer.remaining : Math.ceil((timer.end - now) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return {
    running: timer.end !== null,
    end: timer.end ?? undefined,
    timeout: timer.end === null ? undefined : Math.max(1, timer.end - now),
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
    const plannedSeconds = Number.isFinite(value.plannedSeconds) && value.plannedSeconds > 0
      ? value.plannedSeconds as number : Math.max(1, value.remaining as number);
    const sessionId = typeof value.sessionId === "string" && value.sessionId
      ? value.sessionId : `session_restored_${value.date}_${taskId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    return { taskId, date: value.date as string, remaining: value.remaining as number,
      end: value.end as number | null, sessionId, plannedSeconds };
  } catch { return null; }
}
