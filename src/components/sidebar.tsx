"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Settings } from "lucide-react";
import { useBoard, useCreateProject, useCreateWorkspace, useWorkspaces, useWorkspace } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { Button, Input, Label, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PROJECT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const router = useRouter();
  const { t } = useI18n();
  const { data: workspaces, isLoading } = useWorkspaces();
  const params = useParams();
  const activeSlug = params?.slug as string | undefined;
  const projectId = params?.id as string | undefined;

  // When viewing a board, resolve the workspace it belongs to
  const board = useBoard(projectId ?? "");
  const boardSlug = projectId ? board.data?.workspace.slug : undefined;
  const currentSlug = activeSlug ?? boardSlug;

  const { data: activeWorkspace } = useWorkspace(currentSlug ?? "");

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <Link href="/dashboard" className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Tempo" className="h-7 w-7 rounded-lg" />
        <span className="font-semibold tracking-tight">Tempo</span>
      </Link>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("common.workspaces")}
        </p>

        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        <nav className="space-y-0.5">
          {workspaces?.map((ws) => {
            const active = ws.slug === currentSlug;
            return (
              <div key={ws.id}>
                <Link
                  href={`/w/${ws.slug}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition",
                    active ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">
                    {ws.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{ws.name}</span>
                  {ws.role !== "MEMBER" && (
                    <span className="ml-auto text-[10px] uppercase text-muted-foreground">{ws.role}</span>
                  )}
                </Link>

                {active && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                    {activeWorkspace?.projects
                      ?.filter((p) => !p.archivedAt)
                      .map((p) => (
                        <Link
                          key={p.id}
                          href={`/p/${p.id}`}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition",
                            p.id === projectId
                              ? "bg-accent font-medium"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                          )}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                        </Link>
                      ))}
                    <NewProjectButton workspaceId={ws.id} compact />                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <NewWorkspaceButton />
      </div>

      <div className="border-t border-border p-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
        >
          <Settings className="h-4 w-4" /> {t("common.dashboard")}
        </Link>
      </div>
    </aside>
  );
}

// --- New workspace -----------------------------------------------------------

function NewWorkspaceButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { t } = useI18n();
  const create = useCreateWorkspace();
  const qc = useQueryClient();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const ws = await create.mutateAsync({ name: name.trim() });
      toast.success(t("sidebar.workspaceCreated"));
      setName("");
      setOpen(false);
      qc.invalidateQueries();
      router.push(`/w/${ws.slug}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
    >
      <Plus className="h-4 w-4" /> {t("sidebar.newWorkspace")}
    </button>
  );
}

// --- New project ---------------------------------------------------------------

export function NewProjectButton({ workspaceId, compact }: { workspaceId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const { t } = useI18n();
  const create = useCreateProject();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const project = await create.mutateAsync({ workspaceId, name: name.trim(), description, color });
      toast.success(t("sidebar.projectCreated"));
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/p/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> {t("sidebar.newProject")}
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> {t("sidebar.newProject")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(94vw,26rem)]">
          <DialogHeader>
            <DialogTitle>{t("sidebar.newProject")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="project-name">{t("common.name")}</Label>
              <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Website Redesign" autoFocus />
            </div>
            <div>
              <Label htmlFor="project-desc">{t("sidebar.descOptional")}</Label>
              <Textarea
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder={t("sidebar.newProjectDesc")}
              />
            </div>
            <div>
              <Label>{t("common.color")}</Label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition",
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("sidebar.newProject")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
