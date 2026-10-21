import { describe, expect, it } from "vitest";
import { applyMove, applyMoveFlat, clampIndex, type FlatTask } from "./board";

interface Task {
  id: string;
  order: number;
}

const col = (id: string, tasks: Task[]) => ({ id, tasks });

describe("applyMove (nested board)", () => {
  it("reorders within the same column", () => {
    const board = [col("a", [{ id: "t1", order: 0 }, { id: "t2", order: 1 }, { id: "t3", order: 2 }])];

    const next = applyMove(board, "t3", "a", 0);

    expect(next[0].tasks.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
    expect(next[0].tasks.map((t) => t.order)).toEqual([0, 1, 2]);
  });

  it("moves a task across columns", () => {
    const board = [
      col("a", [{ id: "t1", order: 0 }, { id: "t2", order: 1 }]),
      col("b", [{ id: "t3", order: 0 }]),
    ];

    const next = applyMove(board, "t2", "b", 0);

    expect(next[0].tasks.map((t) => t.id)).toEqual(["t1"]);
    expect(next[1].tasks.map((t) => t.id)).toEqual(["t2", "t3"]);
    expect(next[1].tasks.map((t) => t.order)).toEqual([0, 1]);
  });

  it("appends to the end when dropping on an empty column", () => {
    const board = [col("a", [{ id: "t1", order: 0 }]), col("b", [])];

    const next = applyMove(board, "t1", "b", 0);

    expect(next[0].tasks).toHaveLength(0);
    expect(next[1].tasks.map((t) => t.id)).toEqual(["t1"]);
  });

  it("returns the board unchanged for an unknown task", () => {
    const board = [col("a", [{ id: "t1", order: 0 }])];
    expect(applyMove(board, "nope", "a", 0)).toBe(board);
  });

  it("clamps out-of-range indexes", () => {
    const board = [col("a", [{ id: "t1", order: 0 }, { id: "t2", order: 1 }])];
    const next = applyMove(board, "t1", "a", 99);
    expect(next[0].tasks.map((t) => t.id)).toEqual(["t2", "t1"]);
  });
});

describe("applyMoveFlat (API persistence)", () => {
  const flat: FlatTask[] = [
    { id: "t1", columnId: "a", order: 0 },
    { id: "t2", columnId: "a", order: 1 },
    { id: "t3", columnId: "b", order: 0 },
  ];

  it("moves across columns and produces sequential orders", () => {
    const next = applyMoveFlat(flat, "t2", "b", 0);

    const t2 = next.find((t) => t.id === "t2")!;
    expect(t2.columnId).toBe("b");
    expect(t2.order).toBe(0);

    const colA = next.filter((t) => t.columnId === "a");
    expect(colA.map((t) => t.order)).toEqual([0]);
    const colB = next.filter((t) => t.columnId === "b").map((t) => t.order);
    expect(colB).toEqual([0, 1]);
  });

  it("produces the same result as the nested variant", () => {
    const nested = [
      col("a", [
        { id: "t1", order: 0 },
        { id: "t2", order: 1 },
      ]),
      col("b", [{ id: "t3", order: 0 }]),
    ];
    const viaNested = applyMove(nested, "t2", "b", 1);
    const viaFlat = applyMoveFlat(flat, "t2", "b", 1);

    // Same column memberships and sequential ordering
    for (const c of viaNested) {
      for (const task of c.tasks) {
        const flatTask = viaFlat.find((t) => t.id === task.id)!;
        expect(flatTask.columnId).toBe(c.id);
        expect(flatTask.order).toBe(task.order);
      }
    }
  });
});

describe("clampIndex", () => {
  it("clamps to [0, length]", () => {
    expect(clampIndex(-5, 3)).toBe(0);
    expect(clampIndex(2, 3)).toBe(2);
    expect(clampIndex(9, 3)).toBe(3);
  });
});
