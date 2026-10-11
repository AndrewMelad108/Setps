import { Habit, Entry, GlobalTask, GlobalTaskEntry, globalTaskDue } from "./model";

export type TaskItem = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isEssential: boolean;
  scheduled: boolean;
  done: boolean;
  source: GlobalTask;
};

/** Build the task-only list. Habit records are not part of the app. */
export function taskList(
  tasks: GlobalTask[], taskEntries: GlobalTaskEntry[], date: string,
): TaskItem[] {
  return [
    ...tasks.filter(t => !t.archivedDate || t.archivedDate > date).map(t => ({
      id: `global:${t.id}`, name: t.name, emoji: t.emoji, color: t.color,
      isEssential: t.isEssential,
      scheduled: date >= t.createdDate && globalTaskDue(t, date),
      done: taskEntries.some(e => e.globalTaskId === t.id && e.date === date),
      source: t,
    })),
  ];
}

export function visibleTasks(tasks: TaskItem[], status: "all" | "done" | "pending", query: string) {
  const search = query.trim().toLocaleLowerCase();
  return tasks.filter(task => task.name.toLocaleLowerCase().includes(search)
    && (status === "all" || (status === "done" ? task.done : task.scheduled && !task.done)));
}

/** Adapt tasks to the calendar/statistics calculation format. */
export function taskStatisticsData(
  tasks: GlobalTask[], taskEntries: GlobalTaskEntry[],
): { tasks: Habit[]; entries: Entry[] } {
  const taskIds = new Set(tasks.map(task => task.id));
  return {
    tasks: [...tasks.map(task => ({
      id: `global:${task.id}`, name: task.name, emoji: task.emoji, color: task.color,
      createdDate: task.createdDate, archivedDate: task.archivedDate,
      schedules: [{ from: task.createdDate, days: task.isEssential ? [0, 1, 2, 3, 4, 5, 6] : task.days }],
    }))],
    entries: [...taskEntries.filter(entry => taskIds.has(entry.globalTaskId)).map(entry => ({
      id: `global:${entry.id}`, habitId: `global:${entry.globalTaskId}`, date: entry.date,
    }))],
  };
}
