"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, MessageSquare, Flag } from "lucide-react";
import type { BoardTaskDTO } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { Avatar } from "@/components/ui/primitives";
import { dueLabel, priorityMeta, cn } from "@/lib/utils";

/** A single draggable card on the board. Pure props — unit tested. */
export default function TaskCard({
  task,
  columnId,
  onOpen,
}: {
  task: BoardTaskDTO;
  columnId: string;
  onOpen?: (taskId: string) => void;
}) {
  const { locale } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", columnId },
  });

  const due = dueLabel(task.dueAt, locale);
  const priority = priorityMeta(task.priority);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen?.(task.id)}
      className={cn(
        "group cursor-grab select-none rounded-xl border border-border bg-card p-3 text-sm shadow-sm transition",
        "hover:border-ring/60 hover:shadow-md active:cursor-grabbing",
        isDragging && "rotate-2 opacity-80 shadow-xl ring-2 ring-ring/40"
      )}
      role="button"
      data-testid="task-card"
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${label.color}22`, color: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <p className={cn("font-medium leading-snug", task.completedAt && "text-muted-foreground line-through")}>
        {task.title}
      </p>

      <div className="mt-2.5 flex items-center gap-2 text-muted-foreground">
        <span title={`${priority.label} priority`} data-testid="priority-dot">
          <Flag className="h-3.5 w-3.5" style={{ color: priority.color }} />
        </span>

        {due && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              due.tone === "overdue" && "bg-danger/10 text-danger",
              due.tone === "soon" && "bg-primary/10 text-primary",
              due.tone === "normal" && "bg-muted"
            )}
            data-testid="due-badge"
          >
            <Calendar className="h-3 w-3" /> {due.text}
          </span>
        )}

        {task.checklistCount > 0 && (
          <span className="flex items-center gap-1 text-[11px]" title="Checklist progress">
            <CheckSquare className="h-3 w-3" />
            {task.checklistDoneCount}/{task.checklistCount}
          </span>
        )}

        {task.commentCount > 0 && (
          <span className="flex items-center gap-1 text-[11px]" title="Comments">
            <MessageSquare className="h-3 w-3" />
            {task.commentCount}
          </span>
        )}

        {task.assignee && <Avatar name={task.assignee.name} src={task.assignee.image} className="ml-auto h-6 w-6 text-[9px]" />}
      </div>
    </div>
  );
}
