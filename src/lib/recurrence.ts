/**
 * Pure recurrence math for repeating tasks — unit tested.
 * Used by the move endpoint: when a recurring task lands in a "done"
 * column, the next occurrence is scheduled with `computeNextDueAt`.
 */

import { addDays, addMonths, addWeeks } from "date-fns";

export const RECURRENCES = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  NONE: "Never",
  DAILY: "Every day",
  WEEKLY: "Every week",
  MONTHLY: "Every month",
};

/**
 * Dates come from Prisma as UTC instants, so "a day" is anchored to the UTC
 * calendar day — keeps the math deterministic in any test timezone.
 */
function utcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Computes the due date of the next occurrence.
 *
 * - With a previous due date, the next occurrence is exactly one interval
 *   later — and if that is still in the past (the task was completed late,
 *   or long after), the schedule fast-forwards past "now".
 * - Without a previous due date, the series starts one interval from today.
 */
export function computeNextDueAt(
  prevDueAt: Date | null,
  recurrence: Recurrence,
  now: Date = new Date()
): Date | null {
  if (recurrence === "NONE") return null;

  const advance = (date: Date): Date => {
    switch (recurrence) {
      case "DAILY":
        return addDays(date, 1);
      case "WEEKLY":
        return addWeeks(date, 1);
      case "MONTHLY":
        return addMonths(date, 1);
      default:
        return date;
    }
  };

  let next = utcStartOfDay(prevDueAt ? new Date(prevDueAt) : now);
  next = advance(next);

  // Fast-forward overdue schedules so the new occurrence lands strictly
  // after today — a task completed today must not immediately be overdue again.
  const today = utcStartOfDay(now);
  while (next <= today) {
    const stepped = advance(next);
    if (stepped.getTime() === next.getTime()) break; // safety for zero-step
    next = stepped;
  }

  return next;
}
