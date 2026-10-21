/**
 * Pure timeline (Gantt) layout math — mirrors the approach in `board.ts`:
 * one shared, unit-tested source of truth that the UI simply renders.
 *
 * A bar spans from a task's creation to its due date (or completion date
 * when it was finished early/late). Tasks without a due date are returned
 * separately as an "undated" list.
 */

import { addDays, startOfDay, differenceInCalendarDays } from "date-fns";

export interface TimelineTask {
  id: string;
  title: string;
  createdAt: string; // ISO
  dueAt: string | null; // ISO
  completedAt: string | null; // ISO
}

export interface TimelineBar {
  task: TimelineTask;
  /** Day offset from range start (0-based, can be negative if it predates the range). */
  startDay: number;
  /** Duration in days (>= 1 so short tasks stay visible). */
  lengthDays: number;
  /** true when the bar ends before "today" and is completed. */
  done: boolean;
}

export interface TimelineLayout {
  rangeStart: Date; // startOfDay
  totalDays: number;
  days: Date[]; // one entry per day
  bars: TimelineBar[];
  undated: TimelineTask[];
  todayIndex: number; // 0-based index of today inside the range
}

export const DAY_WIDTH = 34; // px per day column in the UI

const MIN_DAYS_BEFORE = 7;
const MIN_DAYS_AFTER = 14;
const MIN_TOTAL_DAYS = 28;

function parse(iso: string): Date {
  return new Date(iso);
}

/** Builds a sensible day range around the task dates and "today". */
export function buildTimelineRange(tasks: TimelineTask[], now: Date = new Date()): { start: Date; totalDays: number } {
  const today = startOfDay(now);
  let first = addDays(today, -MIN_DAYS_BEFORE);
  let last = addDays(today, MIN_DAYS_AFTER);

  for (const task of tasks) {
    const created = startOfDay(parse(task.createdAt));
    const due = task.dueAt ? startOfDay(parse(task.dueAt)) : null;
    if (created < first) first = created;
    if (due && due > last) last = due;
    if (due && due < first) {
      // Keep overdue tasks visible instead of clipping them away
      first = addDays(due, -3);
    }
  }

  let totalDays = differenceInCalendarDays(last, first) + 1;
  if (totalDays < MIN_TOTAL_DAYS) totalDays = MIN_TOTAL_DAYS;

  return { start: first, totalDays };
}

/**
 * Lays out every dated task as a horizontal bar.
 * Tasks are ordered by due date (undated/none last) so the chart reads naturally.
 */
export function layoutTimeline(tasks: TimelineTask[], now: Date = new Date()): TimelineLayout {
  const { start, totalDays } = buildTimelineRange(tasks, now);
  const today = startOfDay(now);
  const days = Array.from({ length: totalDays }, (_, i) => addDays(start, i));
  const todayIndex = differenceInCalendarDays(today, start);

  const dated: TimelineTask[] = [];
  const undated: TimelineTask[] = [];
  for (const task of tasks) {
    if (task.dueAt) dated.push(task);
    else undated.push(task);
  }
  dated.sort((a, b) => parse(a.dueAt!).getTime() - parse(b.dueAt!).getTime());

  const bars: TimelineBar[] = dated.map((task) => {
    const created = startOfDay(parse(task.createdAt));
    const due = startOfDay(parse(task.dueAt!));
    const completed = task.completedAt ? startOfDay(parse(task.completedAt)) : null;
    const barStart = created < start ? created : created > due ? due : created;
    const barEnd = completed && completed < due ? completed : due;

    const startDay = differenceInCalendarDays(barStart, start);
    const lengthDays = Math.max(1, differenceInCalendarDays(barEnd, barStart) + 1);

    return {
      task,
      startDay,
      lengthDays,
      done: !!task.completedAt,
    };
  });

  return { rangeStart: start, totalDays, days, bars, undated, todayIndex };
}

/** Renders a compact day label like "12" plus a weekday hint for weekends. */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
