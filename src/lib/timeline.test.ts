import { describe, expect, it } from "vitest";
import { buildTimelineRange, isWeekend, layoutTimeline, type TimelineTask } from "./timeline";

const NOW = new Date("2026-10-21T10:00:00");

function task(partial: Partial<TimelineTask> & { id: string }): TimelineTask {
  return {
    title: partial.id,
    createdAt: "2026-10-20T00:00:00.000Z",
    dueAt: null,
    completedAt: null,
    ...partial,
  };
}

describe("buildTimelineRange", () => {
  it("always includes today with sensible padding", () => {
    const { start, totalDays } = buildTimelineRange([], NOW);
    // starts at least 7 days before today
    expect(start.getTime()).toBeLessThanOrEqual(new Date("2026-10-14").getTime());
    expect(totalDays).toBeGreaterThanOrEqual(28);
  });

  it("extends the end to cover the latest due date", () => {
    const t = task({ id: "t1", dueAt: "2026-12-24T00:00:00.000Z" });
    const { start, totalDays } = buildTimelineRange([t], NOW);
    const last = new Date(start);
    last.setDate(last.getDate() + totalDays - 1);
    expect(last.getFullYear()).toBe(2026);
    expect(last.getMonth()).toBe(11);
    expect(last.getDate()).toBeGreaterThanOrEqual(24);
  });

  it("shifts the start earlier to keep overdue tasks visible", () => {
    const t = task({ id: "t1", createdAt: "2026-09-01T00:00:00.000Z", dueAt: "2026-09-05T00:00:00.000Z" });
    const { start } = buildTimelineRange([t], NOW);
    expect(start.getTime()).toBeLessThanOrEqual(new Date("2026-09-05").getTime());
  });
});

describe("layoutTimeline", () => {
  it("separates dated and undated tasks", () => {
    const dated = task({ id: "d1", dueAt: "2026-10-28T00:00:00.000Z" });
    const undated = task({ id: "u1" });
    const layout = layoutTimeline([dated, undated], NOW);
    expect(layout.bars).toHaveLength(1);
    expect(layout.bars[0].task.id).toBe("d1");
    expect(layout.undated).toHaveLength(1);
    expect(layout.undated[0].id).toBe("u1");
  });

  it("sorts bars by due date", () => {
    const later = task({ id: "later", dueAt: "2026-11-20T00:00:00.000Z" });
    const earlier = task({ id: "earlier", dueAt: "2026-10-25T00:00:00.000Z" });
    const layout = layoutTimeline([later, earlier], NOW);
    expect(layout.bars.map((b) => b.task.id)).toEqual(["earlier", "later"]);
  });

  it("computes bar start & length in day offsets", () => {
    const t = task({ id: "t1", createdAt: "2026-10-20T00:00:00.000Z", dueAt: "2026-10-23T00:00:00.000Z" });
    const layout = layoutTimeline([t], NOW);
    const bar = layout.bars[0];
    expect(bar.lengthDays).toBe(4); // 20, 21, 22, 23
    expect(bar.startDay).toBeGreaterThanOrEqual(0);
  });

  it("uses the completion date when the task finished before its due date", () => {
    const t = task({
      id: "t1",
      createdAt: "2026-10-18T00:00:00.000Z",
      dueAt: "2026-10-30T00:00:00.000Z",
      completedAt: "2026-10-20T00:00:00.000Z",
    });
    const layout = layoutTimeline([t], NOW);
    const bar = layout.bars[0];
    expect(bar.done).toBe(true);
    expect(bar.lengthDays).toBe(3); // 18 → 20
  });

  it("never produces a zero-length bar", () => {
    const t = task({ id: "t1", createdAt: "2026-10-21T00:00:00.000Z", dueAt: "2026-10-21T00:00:00.000Z" });
    const layout = layoutTimeline([t], NOW);
    expect(layout.bars[0].lengthDays).toBeGreaterThanOrEqual(1);
  });

  it("places today inside the range", () => {
    const layout = layoutTimeline([], NOW);
    expect(layout.todayIndex).toBeGreaterThanOrEqual(0);
    expect(layout.todayIndex).toBeLessThan(layout.totalDays);
  });
});

describe("isWeekend", () => {
  it("detects saturday and sunday", () => {
    expect(isWeekend(new Date("2026-10-24T12:00:00Z"))).toBe(true); // Saturday
    expect(isWeekend(new Date("2026-10-25T12:00:00Z"))).toBe(true); // Sunday
    expect(isWeekend(new Date("2026-10-21T12:00:00Z"))).toBe(false); // Wednesday
  });
});
