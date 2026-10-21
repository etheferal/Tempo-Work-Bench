"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Check, Eye, File, FileArchive, FileImage, FileText, Loader2, Paperclip, Pencil, Plus, Send, Trash2 } from "lucide-react";
import {
  useAddChecklistItem,
  useCreateComment,
  useDeleteAttachment,
  useDeleteChecklistItem,
  useDeleteTask,
  useTaskDetail,
  useToggleTaskLabel,
  useUpdateChecklistItem,
  useUpdateTask,
  useUploadAttachment,
} from "@/lib/hooks";
import { PRIORITIES, PRIORITY_META, type Priority } from "@/lib/constants";
import { RECURRENCES, type Recurrence } from "@/lib/recurrence";
import { formatFileSize } from "@/lib/attachments";
import { useI18n } from "@/lib/i18n";
import Markdown from "@/components/markdown";
import { Avatar, Button, Input, Label, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn, relativeTime } from "@/lib/utils";

export default function TaskDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data: task, isLoading, isError } = useTaskDetail(taskId);
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const toggleLabel = useToggleTaskLabel();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {isLoading && <Skeleton className="h-96 w-full" />}
        {isError && <p className="py-16 text-center text-sm text-muted-foreground">{t("task.notFound")}</p>}
        {task && (
          <div className="space-y-6">
            {/* Breadcrumb */}
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Link href={`/w/${task.projectId}`} className="hover:text-foreground">
                {task.projectName}
              </Link>
              <span>/</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5">{task.columnName}</span>
            </p>

            <TitleEditor task={task} />

            <div className="grid gap-6 md:grid-cols-[1fr_200px]">
              {/* Main column */}
              <div className="min-w-0 space-y-6">
                <DescriptionEditor task={task} />
                <AttachmentsSection task={task} />
                <ChecklistSection task={task} />
                <CommentsSection task={task} />
              </div>

              {/* Meta sidebar */}
              <aside className="space-y-4 md:border-l md:border-border md:pl-5">
                <div>
                  <Label htmlFor="assignee">{t("task.assignee")}</Label>
                  <Select
                    id="assignee"
                    value={task.assignee?.id ?? ""}
                    onChange={(e) =>
                      update.mutate(
                        { id: task.id, assigneeId: e.target.value || null },
                        { onError: (e2) => toast.error(e2.message) }
                      )
                    }
                  >
                    <option value="">{t("common.unassigned")}</option>
                    {task.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>{t("task.priority")}</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => update.mutate({ id: task.id, priority: p }, { onError: (e) => toast.error(e.message) })}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-xs font-medium transition",
                          task.priority === p ? "border-transparent text-white" : "border-border hover:bg-accent"
                        )}
                        style={task.priority === p ? { backgroundColor: PRIORITY_META[p].color } : undefined}
                      >
                        {priorityLabel(p, t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="due">{t("task.dueDate")}</Label>
                  <Input
                    id="due"
                    type="date"
                    value={task.dueAt ? format(parseISO(task.dueAt), "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                      update.mutate(
                        {
                          id: task.id,
                          dueAt: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null,
                        },
                        { onError: (e2) => toast.error(e2.message) }
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="repeat">{t("task.repeat")}</Label>
                  <Select
                    id="repeat"
                    value={task.recurrence}
                    onChange={(e) =>
                      update.mutate(
                        { id: task.id, recurrence: e.target.value as Recurrence },
                        { onError: (e2) => toast.error(e2.message) }
                      )
                    }
                  >
                    {RECURRENCES.map((r) => (
                      <option key={r} value={r}>
                        {recurrenceLabel(r, t)}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-[10px] text-muted-foreground">{t("task.repeatHint")}</p>
                </div>

                <div>
                  <Label>{t("task.labels")}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {task.workspaceLabels.map((label) => {
                      const attached = task.labels.some((l) => l.id === label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() =>
                            toggleLabel.mutate(
                              { taskId: task.id, labelId: label.id },
                              { onError: (e) => toast.error(e.message) }
                            )
                          }
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-medium transition",
                            attached ? "border-transparent" : "border-border text-muted-foreground hover:bg-accent"
                          )}
                          style={attached ? { backgroundColor: `${label.color}25`, color: label.color } : undefined}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                    {task.workspaceLabels.length === 0 && (
                      <span className="text-xs text-muted-foreground">{t("task.noLabels")}</span>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="danger" size="sm" className="w-full"
                    onClick={() => {
                      if (confirm(t("task.confirmDelete"))) {
                        remove.mutate(task.id, {
                          onSuccess: () => {
                            toast.success("Task deleted");
                            onClose();
                          },
                          onError: (e) => toast.error(e.message),
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("task.deleteTask")}
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------
   Title
   -------------------------------------------------------------------------- */

function TitleEditor({ task }: { task: NonNullable<ReturnType<typeof useTaskDetail>["data"]> }) {
  const update = useUpdateTask();
  const [title, setTitle] = useState(task.title);

  useEffect(() => setTitle(task.title), [task.title]);

  function commit() {
    const value = title.trim();
    if (!value || value === task.title) {
      setTitle(task.title);
      return;
    }
    update.mutate({ id: task.id, title: value }, { onError: () => setTitle(task.title) });
  }

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-full rounded-lg border border-transparent bg-transparent pr-8 text-lg font-semibold tracking-tight outline-none transition hover:border-border focus:border-ring focus:bg-card focus:px-2"
      data-testid="task-title-input"
    />
  );
}

/* --------------------------------------------------------------------------
   Description (markdown, write/preview)
   -------------------------------------------------------------------------- */

function DescriptionEditor({ task }: { task: NonNullable<ReturnType<typeof useTaskDetail>["data"]> }) {
  const { t } = useI18n();
  const update = useUpdateTask();
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [value, setValue] = useState(task.description ?? "");

  useEffect(() => setValue(task.description ?? ""), [task.description]);

  function commit() {
    setEditing(false);
    if (value !== (task.description ?? "")) {
      update.mutate({ id: task.id, description: value || null }, { onError: (e) => toast.error(e.message) });
    }
  }

  if (!editing && !task.description) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition hover:border-ring/50 hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> {t("task.addDescription")}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("task.description")}</p>
        <div className="flex gap-1">
          {task.description &&
            !editing && (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setPreview(false); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setPreview((p) => !p); setEditing(false); }}>
                  <Eye className="h-3.5 w-3.5" /> {preview ? t("task.write") : t("task.preview")}
                </Button>
              </>
            )}
          {editing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setPreview(false)} className={cn(!preview && "bg-accent")}>
                {t("task.write")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPreview(true)} className={cn(preview && "bg-accent")}>
                {t("task.preview")}
              </Button>
            </>
          )}
        </div>
      </div>
      {editing && !preview ? (
        <Textarea
          autoFocus
          rows={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setValue(task.description ?? "");
              setEditing(false);
            }
          }}
          placeholder="Describe the task… **markdown** works"
        />
      ) : preview || task.description ? (
        <div
          className="min-h-16 rounded-lg border border-border bg-card px-3 py-2.5"
          onClick={() => !preview && setEditing(true)}
        >
          <Markdown content={value} />
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Attachments
   -------------------------------------------------------------------------- */

function attachmentIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("zip")) return FileArchive;
  if (mime.includes("pdf") || mime.startsWith("text/")) return FileText;
  return File;
}

function AttachmentsSection({ task }: { task: NonNullable<ReturnType<typeof useTaskDetail>["data"]> }) {
  const { t } = useI18n();
  const upload = useUploadAttachment();
  const removeAttachment = useDeleteAttachment();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      await upload.mutateAsync({ taskId: task.id, file });
      toast.success(t("task.fileAttached"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("task.uploadFailed"));
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("task.attachments")} {task.attachments.length > 0 && `· ${task.attachments.length}`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {t("task.attachFile")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.txt,.md,.csv,.zip"
          onChange={onFileChange}
        />
      </div>
      <div className="space-y-1">
        {task.attachments.map((a) => {
          const Icon = attachmentIcon(a.mime);
          return (
            <div key={a.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-accent/40">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm hover:text-primary hover:underline"
                title={a.name}
              >
                {a.name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(a.size)}</span>
              <button
                onClick={() =>
                  removeAttachment.mutate(
                    { taskId: task.id, attachmentId: a.id },
                    { onError: (e) => toast.error(e.message) }
                  )
                }
                className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:text-danger group-hover:opacity-100"
                aria-label={`Delete ${a.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {task.attachments.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("task.noAttachments")}</p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Checklist
   -------------------------------------------------------------------------- */

function ChecklistSection({ task }: { task: NonNullable<ReturnType<typeof useTaskDetail>["data"]> }) {
  const { t } = useI18n();
  const addItem = useAddChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const [value, setValue] = useState("");

  const done = task.checklist.filter((c) => c.done).length;
  const pct = task.checklist.length ? Math.round((done / task.checklist.length) * 100) : 0;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    await addItem.mutateAsync({ taskId: task.id, content: v }).catch((e2) => toast.error(e2.message));
    setValue("");
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("task.checklist")} {task.checklist.length > 0 && `· ${done}/${task.checklist.length}`}
        </p>
        {task.checklist.length > 0 && (
          <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="space-y-1">
        {task.checklist.map((item) => (
          <div key={item.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-accent/40">
            <button
              onClick={() => updateItem.mutate({ itemId: item.id, done: !item.done }, { onError: (e) => toast.error(e.message) })}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                item.done ? "border-success bg-success text-white" : "border-border hover:border-ring"
              )}
              aria-label={item.done ? "Mark as not done" : "Mark as done"}
            >
              {item.done && <Check className="h-3 w-3" />}
            </button>
            <span className={cn("min-w-0 flex-1 text-sm", item.done && "text-muted-foreground line-through")}>
              {item.content}
            </span>
            <button
              onClick={() => deleteItem.mutate(item.id, { onError: (e) => toast.error(e.message) })}
              className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:text-danger group-hover:opacity-100"
              aria-label="Delete checklist item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("task.addChecklist")}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" type="submit" disabled={addItem.isPending}>
          {addItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Comments
   -------------------------------------------------------------------------- */

function CommentsSection({ task }: { task: NonNullable<ReturnType<typeof useTaskDetail>["data"]> }) {
  const { t } = useI18n();
  const create = useCreateComment();
  const [content, setContent] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = content.trim();
    if (!value) return;
    try {
      await create.mutateAsync({ taskId: task.id, content: value });
      setContent("");
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Could not post the comment");
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("task.comments")} {task.comments.length > 0 && `· ${task.comments.length}`}
      </p>
      <div className="space-y-3">
        {task.comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <Avatar name={c.author.name} src={c.author.image} className="h-7 w-7 text-[10px]" />
            <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-border bg-muted/60 px-3 py-2">
              <p className="text-xs">
                <span className="font-medium">{c.author.name}</span>{" "}
                <span className="text-muted-foreground" title={c.createdAt}>
                  {relativeTime(c.createdAt)}
                </span>
              </p>
              <div className="mt-0.5 text-sm">
                <Markdown content={c.content} inline />
              </div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("task.writeComment")} />
        <Button size="sm" type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Locale helpers
   -------------------------------------------------------------------------- */

type DialogT = (key: any, vars?: Record<string, string | number>) => string;

function priorityLabel(priority: Priority, t: DialogT) {
  switch (priority) {
    case "LOW":
      return t("board.low");
    case "HIGH":
      return t("board.high");
    case "URGENT":
      return t("board.urgent");
    default:
      return t("board.medium");
  }
}

function recurrenceLabel(recurrence: Recurrence, t: DialogT) {
  switch (recurrence) {
    case "DAILY":
      return t("task.recurrence.daily");
    case "WEEKLY":
      return t("task.recurrence.weekly");
    case "MONTHLY":
      return t("task.recurrence.monthly");
    default:
      return t("task.recurrence.none");
  }
}
