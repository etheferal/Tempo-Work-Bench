"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CalendarRange } from "lucide-react";
import type { BoardColumnDTO, BoardTaskDTO, Priority } from "@/lib/constants";
import { PRIORITY_META } from "@/lib/constants";
import { DAY_WIDTH, isWeekend, layoutTimeline, type TimelineTask } from "@/lib/timeline";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import { Avatar, EmptyState } from "@/components/ui/primitives";

/**
 * Gantt-style timeline for a board: one bar per dated task, spanning
 * created → due (or completed). All geometry comes from the pure,
 * unit-tested `layoutTimeline` helper.
 */
export default function TimelineView({
  columns,
  onOpenTask,
}: {
  columns: BoardColumnDTO[];
  onOpenTask: (taskId: string) => void;
}) {
  const { locale, t } = useI18n();
  const tasks = useMemo(() => columns.flatMap((c) => c.tasks), [columns]);

  const layout = useMemo(() => {
    const asTimeline: TimelineTask[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      createdAt: t.createdAt,
      dueAt: t.dueAt,
      completedAt: t.completedAt,
    }));
    return layoutTimeline(asTimeline);
  }, [tasks]);

  // Column lookups for badges
  const columnById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const taskById = useMemo(() => {
    const map = new Map<string, BoardTaskDTO>();
    for (const c of columns) for (const t of c.tasks) map.set(t.id, t);
    return map;
  }, [columns]);

  if (tasks.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CalendarRange}
          title={t("timeline.emptyTitle")}
          description={t("timeline.emptyDesc")}
        />
      </div>
    );
  }

  const gridWidth = layout.totalDays * DAY_WIDTH;

  return (
    <div className="flex h-full flex-col overflow-hidden px-6 pb-6">
      {/* Month markers */}
      <div className="relative mb-1 ml-48 overflow-hidden">
        <div className="relative" style={{ width: gridWidth }}>
          {layout.days.map((day, i) => {
            const firstOfMonth = day.getDate() === 1 || i === 0;
            if (!firstOfMonth) return null;
            return (
              <span
                key={day.toISOString()}
                className="absolute top-0 text-[11px] font-semibold text-muted-foreground"
                style={{ left: i * DAY_WIDTH + 4 }}
              >
                {format(day, "MMMM yyyy")}
              </span>
            );
          })}
        </div>
      </div>

      {/* Day header */}
      <div className="mb-2 flex items-end gap-0">
        <div className="w-48 shrink-0 pr-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("timeline.task")}
        </div>
        <div className="overflow-hidden">
          <div className="relative" style={{ width: gridWidth }}>
            <div className="flex">
              {layout.days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "shrink-0 border-l border-border pb-1 pt-4 text-center text-[10px] leading-tight",
                    isWeekend(day) && "bg-muted/50",
                    day.toDateString() === new Date().toDateString() && "bg-primary/10"
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  <div className="font-semibold text-foreground/70">{format(day, "d")}</div>
                  <div className="text-muted-foreground">{format(day, "EEEEE")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sticky task labels */}
        <div className="w-48 shrink-0 overflow-hidden border-r border-border pr-3">
          {layout.bars.map((bar) => (
            <button
              key={bar.task.id}
              onClick={() => onOpenTask(bar.task.id)}
              className="flex h-9 w-full items-center gap-2 truncate pr-1 text-left text-[13px] hover:text-primary"
              title={bar.task.title}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: PRIORITY_META[(taskById.get(bar.task.id)?.priority ?? "MEDIUM") as Priority].color }}
              />
              <span className="truncate">{bar.task.title}</span>
            </button>
          ))}
          {layout.undated.length > 0 && (
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("timeline.noDue")}
            </p>
          )}
          {layout.undated.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTask(t.id)}
              className="flex h-8 w-full items-center truncate pr-1 text-left text-[13px] text-muted-foreground hover:text-primary"
              title={t.title}
            >
              {t.title}
            </button>
          ))}
        </div>

        {/* Grid + bars */}
        <div className="relative flex-1 overflow-x-auto">
          <div className="relative" style={{ width: gridWidth, minHeight: layout.bars.length * 36 + 8 }}>
            {/* Weekend/today column shading */}
            <div className="flex">
              {layout.days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "h-full shrink-0 border-l border-border/60",
                    isWeekend(day) && "bg-muted/50",
                    day.toDateString() === new Date().toDateString() && "bg-primary/5"
                  )}
                  style={{ width: DAY_WIDTH, minHeight: layout.bars.length * 36 + 8 }}
                />
              ))}
            </div>

            {/* Today line */}
            {layout.todayIndex >= 0 && layout.todayIndex < layout.totalDays && (
              <div
                aria-hidden
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-danger/70"
                style={{ left: layout.todayIndex * DAY_WIDTH }}
              >
                <span className="absolute -top-0.5 left-1 text-[9px] font-semibold text-danger">{t("common.today")}</span>
              </div>
            )}

            {/* Bars */}
            {layout.bars.map((bar) => {
              const task = taskById.get(bar.task.id);
              const column = task ? columnById.get(taskColumnId(columns, bar.task.id)!) : undefined;
              const priority = (task?.priority ?? "MEDIUM") as Priority;
              const color = PRIORITY_META[priority].color;
              const done = bar.done;
              return (
                <button
                  key={bar.task.id}
                  onClick={() => onOpenTask(bar.task.id)}
                  title={`${bar.task.title} — ${column?.name ?? ""}${
                    bar.task.dueAt ? ` · ${formatDate(bar.task.dueAt, locale)}` : ""
                  }`}
                  className="absolute top-1 flex h-7 items-center gap-2 overflow-hidden rounded-md px-2 text-left text-xs font-medium shadow-sm transition hover:z-20 hover:shadow-md"
                  style={{
                    left: bar.startDay * DAY_WIDTH,
                    width: Math.max(bar.lengthDays * DAY_WIDTH - 4, DAY_WIDTH - 4),
                    backgroundColor: done ? "hsl(var(--muted))" : `${color}22`,
                    color: done ? "hsl(var(--muted-foreground))" : color,
                    border: `1px solid ${done ? "hsl(var(--border))" : color + "55"}`,
                    opacity: done ? 0.8 : 1,
                  }}
                >
                  <span className={cn("truncate", done && "line-through")}>{bar.task.title}</span>
                  {task?.assignee && (
                    <Avatar name={task.assignee.name} src={task.assignee.image} className="ml-auto h-5 w-5 shrink-0 text-[8px]" />
                  )}
                </button>
              );
            })}

            {/* Undated markers */}
            <div style={{ marginTop: layout.bars.length * 36 }}>
              {layout.undated.map((undatedTask) => (
                <div
                  key={undatedTask.id}
                  className="flex h-8 items-center text-xs text-muted-foreground"
                  style={{ paddingLeft: 8 }}
                >
                  ⚑ {undatedTask.title} ({t("timeline.noDue")})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {layout.bars.length === 0 && layout.undated.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">{t("timeline.noDueHint")}</p>
      )}
    </div>
  );
}

function taskColumnId(columns: BoardColumnDTO[], taskId: string): string | undefined {
  for (const c of columns) if (c.tasks.some((t) => t.id === taskId)) return c.id;
  return undefined;
}
