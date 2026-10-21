import { describe, expect, it } from "vitest";
import { computeNextDueAt, RECURRENCES } from "./recurrence";

const NOW = new Date("2026-10-21T12:00:00");

describe("computeNextDueAt", () => {
  it("returns null for one-off tasks", () => {
    expect(computeNextDueAt(new Date("2026-10-20"), "NONE", NOW)).toBeNull();
  });

  it("starts a fresh series one interval from today", () => {
    const daily = computeNextDueAt(null, "DAILY", NOW);
    const weekly = computeNextDueAt(null, "WEEKLY", NOW);
    const monthly = computeNextDueAt(null, "MONTHLY", NOW);

    expect(daily?.toISOString()).toBe(new Date("2026-10-22").toISOString());
    expect(weekly?.toISOString()).toBe(new Date("2026-10-28").toISOString());
    expect(monthly?.toISOString()).toBe(new Date("2026-11-21").toISOString());
  });

  it("advances exactly one interval from a recent due date", () => {
    const next = computeNextDueAt(new Date("2026-10-20"), "WEEKLY", NOW);
    expect(next?.toISOString()).toBe(new Date("2026-10-27").toISOString());
  });

  it("fast-forwards schedules that fell far behind", () => {
    // A daily task last due three weeks ago must reappear tomorrow, not 3 weeks behind
    const next = computeNextDueAt(new Date("2026-09-30"), "DAILY", NOW);
    expect(next?.toISOString()).toBe(new Date("2026-10-22").toISOString());
  });

  it("never lands on or before today", () => {
    for (const r of RECURRENCES) {
      if (r === "NONE") continue;
      const next = computeNextDueAt(new Date("2026-01-01"), r, NOW);
      expect(next!.getTime()).toBeGreaterThan(new Date("2026-10-21").getTime());
    }
  });

  it("handles month boundaries", () => {
    const next = computeNextDueAt(new Date("2026-01-31"), "MONTHLY", new Date("2026-01-15"));
    // Jan 31 + 1 month = Feb 28 (date-fns clamps)
    expect(next?.getUTCMonth()).toBe(1);
  });
});
