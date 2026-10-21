"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { CalendarRange, CheckCircle2, KanbanSquare, ListPlus, MoreHorizontal, Plus, X } from "lucide-react";
import TaskCard from "./task-card";
import TaskDialog from "./task-dialog";
import TimelineView from "./timeline-view";
import {
  keys,
  useBoard,
  useCreateColumn,
  useCreateTask,
  useDeleteColumn,
  useMoveTask,
  useUpdateColumn,
} from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { BoardColumnDTO, BoardDTO } from "@/lib/constants";
import { Button, EmptyState, Skeleton, Textarea } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function BoardView({ projectId }: { projectId: string }) {
  const { data: board, isLoading, isError } = useBoard(projectId);
  const move = useMoveTask(projectId);
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "timeline">("board");

  // Deep link: /p/[id]?task=… opens the task dialog
  useEffect(() => {
    const taskParam = searchParams.get("task");
    if (taskParam) setSelectedTaskId(taskParam);
  }, [searchParams]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useMemo(
    () =>
      (event: DragEndEvent): void => {
        const { active, over } = event;
        if (!over) return;
        const activeId = String(active.id);
        const overId = String(over.id);
        if (activeId === overId) return;

        const current = qc.getQueryData<BoardDTO>(keys.board(projectId));
        if (!current) return;

        const overType = (over.data.current as { type?: string } | undefined)?.type;
        const toColumnId = overType === "column" ? overId : ((over.data.current as { columnId?: string })?.columnId ?? "");
        const column = current.columns.find((c) => c.id === toColumnId);
        if (!column) return;

        const toIndex =
          overType === "column" ? column.tasks.length : Math.max(0, column.tasks.findIndex((tk) => tk.id === overId));

        move.mutate(
          { taskId: activeId, columnId: toColumnId, index: toIndex },
          {
            onError: () => toast.error(t("board.moveFailed")),
          }
        );
      },
    [move, qc, projectId, t]
  );

  if (isError) {
    return (
      <div className="p-6">
        <EmptyState title={t("board.notFound")} description={t("board.notFoundDesc")} />
      </div>
    );
  }

  if (isLoading || !board) {
    return (
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-full w-80 shrink-0" />
        ))}
      </div>
    );
  }

  function openTask(taskId: string) {
    setSelectedTaskId(taskId);
    router.replace(`/p/${projectId}?task=${taskId}`, { scroll: false });
  }

  function closeTask() {
    setSelectedTaskId(null);
    router.replace(`/p/${projectId}`, { scroll: false });
  }

  const roleLabel =
    board.role === "OWNER" ? t("common.owner") : board.role === "ADMIN" ? t("common.admin") : t("common.member");

  return (
    <div className="flex h-full flex-col">
      {/* Board header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: board.color }} />
            <h1 className="text-xl font-semibold tracking-tight">{board.name}</h1>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Link href={`/w/${board.workspace.slug}`} className="hover:text-foreground hover:underline">
              {board.workspace.name}
            </Link>{" "}
            · {t("board.meta", { n: board.columns.reduce((sum, c) => sum + c.tasks.length, 0), role: roleLabel })}
          </p>
        </div>
        {/* View switcher */}
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setView("board")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
              view === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <KanbanSquare className="h-3.5 w-3.5" /> {t("board.viewBoard")}
          </button>
          <button
            onClick={() => setView("timeline")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
              view === "timeline" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" /> {t("board.viewTimeline")}
          </button>
        </div>
      </div>

      {view === "board" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="flex flex-1 items-start gap-4 overflow-x-auto p-6">
            {board.columns.map((column) => (
              <Column key={column.id} column={column} projectId={projectId} onOpenTask={openTask} />
            ))}
            <AddColumn projectId={projectId} />
          </div>
        </DndContext>
      ) : (
        <TimelineView columns={board.columns} onOpenTask={openTask} />
      )}

      {selectedTaskId && <TaskDialog taskId={selectedTaskId} onClose={closeTask} />}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Column
   -------------------------------------------------------------------------- */

function Column({
  column,
  projectId,
  onOpenTask,
}: {
  column: BoardColumnDTO;
  projectId: string;
  onOpenTask: (taskId: string) => void;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted transition",
        isOver && "border-ring/50 bg-accent/50"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {renaming ? (
          <form
            className="flex flex-1 items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && name !== column.name) {
                updateColumn.mutate({ id: column.id, name: name.trim() });
              }
              setRenaming(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setRenaming(false)}
              className="h-7 flex-1 rounded-md border border-input bg-card px-2 text-sm font-semibold outline-none focus:border-ring"
            />
          </form>
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/90 hover:text-foreground"
            title={t("board.renameColumn")}
          >
            {column.isDone && <CheckCircle2 className="h-4 w-4 text-success" />}
            {column.name}
          </button>
        )}
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {column.tasks.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-auto rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label="Column actions">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => updateColumn.mutate({ id: column.id, isDone: !column.isDone })}>
              <CheckCircle2 /> {column.isDone ? t("board.unmarkDone") : t("board.markDone")}
            </DropdownMenuItem>
            <DropdownMenuItem
              danger
              onClick={() => {
                if (confirm(t("board.confirmDeleteColumn", { name: column.name, n: column.tasks.length }))) {
                  deleteColumn.mutate(column.id, {
                    onSuccess: () => toast.success(t("board.columnDeleted")),
                    onError: (e) => toast.error(e.message),
                  });
                }
              }}
            >
              <X /> {t("board.deleteColumn")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <SortableContext items={column.tasks.map((tk) => tk.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} columnId={column.id} onOpen={onOpenTask} />
          ))}
          {column.tasks.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("board.dropHere")}</p>
          )}
        </div>
      </SortableContext>

      <AddTaskComposer projectId={projectId} />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Add-task composer
   -------------------------------------------------------------------------- */

function AddTaskComposer({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const createTask = useCreateTask();

  async function submit() {
    const value = title.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    try {
      await createTask.mutateAsync({ projectId, title: value });
      setTitle("");
      setAdding(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("board.moveFailed"));
    }
  }

  return (
    <div className="px-2 pb-2">
      {adding ? (
        <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
          <Textarea
            ref={ref}
            autoFocus
            rows={2}
            value={title}
            placeholder={t("board.taskTitle")}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setTitle("");
              }
            }}
            className="border-0 p-1 focus:ring-0"
          />
          <div className="mt-1 flex items-center gap-1.5">
            <Button size="sm" onClick={submit} disabled={createTask.isPending}>
              {t("common.add")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> {t("board.addTask")}
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Add column
   -------------------------------------------------------------------------- */

function AddColumn({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createColumn = useCreateColumn();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    try {
      await createColumn.mutateAsync({ projectId, name: value });
      setName("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("board.moveFailed"));
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-64 shrink-0 items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition hover:border-ring/50 hover:text-foreground"
      >
        <ListPlus className="h-4 w-4" /> {t("board.addColumn")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-72 shrink-0 rounded-xl border border-border bg-muted p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("board.columnName")}
        className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-ring"
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
      <div className="mt-2 flex gap-1.5">
        <Button size="sm" type="submit" disabled={createColumn.isPending}>
          {t("board.addColumn")}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
