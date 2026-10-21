/**
 * Pure board-move logic — the single source of truth used by BOTH
 * the API (persistence) and the UI (optimistic updates), so dragging
 * a card always produces the same result in memory and in the database.
 */

interface Identifiable {
  id: string;
}

/** Board shape used by the client cache: columns → nested tasks. */
export interface ColumnLike<T extends Identifiable & { order: number }> {
  id: string;
  tasks: T[];
}

/**
 * Moves a task to `toIndex` within `toColumnId` and re-assigns `order`
 * (0..n) inside the affected columns. Returns a new structure.
 */
export function applyMove<
  T extends Identifiable & { order: number },
  C extends ColumnLike<T>
>(columns: C[], taskId: string, toColumnId: string, toIndex: number): C[] {
  const moved = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
  if (!moved) return columns;

  const stripped = columns.map((c) => ({
    ...c,
    tasks: c.tasks
      .filter((t) => t.id !== taskId)
      .map((t, i) => ({ ...t, order: i })),
  })) as C[];

  const target = stripped.find((c) => c.id === toColumnId);
  if (!target) return columns;

  const idx = Math.max(0, Math.min(toIndex, target.tasks.length));
  const nextTasks = [...target.tasks.slice(0, idx), moved, ...target.tasks.slice(idx)].map((t, i) => ({
    ...t,
    order: i,
  }));

  return stripped.map((c) => (c.id === toColumnId ? { ...c, tasks: nextTasks } : c));
}

/** Flat task shape used by the move API. */
export interface FlatTask {
  id: string;
  columnId: string;
  order: number;
}

/**
 * Flat variant of the same operation: returns the updated tasks
 * (columnId + order) for every task whose position changed.
 */
export function applyMoveFlat(
  tasks: FlatTask[],
  taskId: string,
  toColumnId: string,
  toIndex: number
): FlatTask[] {
  const nested: ColumnLike<FlatTask>[] = [];
  for (const task of tasks) {
    let col = nested.find((c) => c.id === task.columnId);
    if (!col) {
      col = { id: task.columnId, tasks: [] };
      nested.push(col);
    }
    col.tasks.push(task);
  }
  for (const col of nested) col.tasks.sort((a, b) => a.order - b.order);

  const moved = applyMove(nested, taskId, toColumnId, toIndex);
  return moved.flatMap((c) => c.tasks.map((t) => ({ ...t, columnId: c.id })));
}

/** Index of `toIndex` clamped into [0, list.length] (for drop-on-column). */
export function clampIndex(toIndex: number, length: number) {
  return Math.max(0, Math.min(toIndex, length));
}
