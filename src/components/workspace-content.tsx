"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Loader2,
  MoreHorizontal,
  Plus,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import {
  useActivity,
  useDeleteProject,
  useDeleteWorkspace,
  useInviteMember,
  useRemoveMember,
  useRevokeInvite,
  useUpdateMemberRole,
  useUpdateProject,
  useUpdateWorkspace,
  useWorkspace,
} from "@/lib/hooks";
import type { WorkspaceDetail } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { ProjectSummary } from "@/lib/constants";
import { NewProjectButton } from "@/components/sidebar";
import { ActivityRow } from "@/components/dashboard-content";
import { Avatar, Button, Card, EmptyState, Input, Label, Skeleton } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, relativeTime } from "@/lib/utils";

export default function WorkspaceContent({ slug }: { slug: string }) {
  const { data: ws, isLoading } = useWorkspace(slug);
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="p-6">
        <EmptyState title={t("ws.notFound")} description={t("ws.notFoundDesc")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ws.name}</h1>
          {ws.description && <p className="mt-1 text-sm text-muted-foreground">{ws.description}</p>}
        </div>
        {ws.myRole !== "MEMBER" && <NewProjectButton workspaceId={ws.id} />}
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">{t("common.projects")}</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-3.5 w-3.5" /> {t("common.members")} ({ws.members.length})
          </TabsTrigger>
          <TabsTrigger value="activity">{t("common.activity")}</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-3.5 w-3.5" /> {t("common.settings")}
          </TabsTrigger>
        </TabsList>

        {/* Projects */}
        <TabsContent value="projects">
          <ProjectsTab projects={ws.projects} workspaceId={ws.id} myRole={ws.myRole} workspaceSlug={ws.slug} />
        </TabsContent>

        {/* Members */}
        <TabsContent value="members">
          <MembersTab ws={ws} />
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <ActivityTab workspaceId={ws.id} />
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <SettingsTab workspaceId={ws.id} name={ws.name} description={ws.description} myRole={ws.myRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Projects
   -------------------------------------------------------------------------- */

function ProjectsTab({
  projects,
  workspaceId,
  myRole,
  workspaceSlug,
}: {
  projects: ProjectSummary[];
  workspaceId: string;
  myRole: string;
  workspaceSlug: string;
}) {
  const { t } = useI18n();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const active = projects.filter((p) => !p.archivedAt);
  const archived = projects.filter((p) => p.archivedAt);

  if (projects.length === 0) {
    return (
      <EmptyState
        title={t("ws.noProjects")}
        description={t("ws.noProjectsDesc")}
        action={myRole !== "MEMBER" ? <NewProjectButton workspaceId={workspaceId} /> : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {active.map((p) => (
          <ProjectCard key={p.id} project={p} myRole={myRole} />
        ))}
        {active.length === 0 && (
          <EmptyState title={t("ws.allArchived")} description={t("ws.allArchivedDesc")} />
        )}
      </div>

      {archived.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{t("ws.archivedSection")}</p>
          <div className="space-y-1">
            {archived.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm text-muted-foreground line-through">{p.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => updateProject.mutate({ id: p.id, archived: false })}
                >
                  <ArchiveRestore className="h-3.5 w-3.5" /> {t("ws.unarchive")}
                </Button>
                <Button size="sm" variant="danger" onClick={() => confirmDelete(deleteProject, p, t)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("ws.slugLabel", { slug: workspaceSlug })}</p>
    </div>
  );
}

type TFunc = (key: any, vars?: Record<string, string | number>) => string;

function confirmDelete(
  deleteProject: { mutate: (id: string, opts?: { onSuccess: () => void; onError: (e: Error) => void }) => void },
  p: ProjectSummary,
  t: TFunc
) {
  if (confirm(t("ws.confirmDeleteProject", { name: p.name }))) {
    deleteProject.mutate(p.id, {
      onSuccess: () => toast.success(t("ws.projectDeleted")),
      onError: (e) => toast.error(e.message),
    });
  }
}

function ProjectCard({ project, myRole }: { project: ProjectSummary; myRole: string }) {
  const { t, locale } = useI18n();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const progress =
    project.tasksCount && project.tasksCount > 0 ? Math.round(((project.doneCount ?? 0) / project.tasksCount) * 100) : 0;

  return (
    <Card className="group relative overflow-hidden transition hover:shadow-lg">
      <div className="h-1.5" style={{ backgroundColor: project.color }} />
      <div className="p-5">
        <Link href={`/p/${project.id}`} className="block">
          <h3 className="font-semibold leading-snug group-hover:text-primary">{project.name}</h3>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
          )}
        </Link>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {project.doneCount ?? 0}/{project.tasksCount ?? 0} {t("ws.done")}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("ws.created", { date: formatDate(project.createdAt, locale) })}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent group-hover:opacity-100" aria-label="Project actions">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => updateProject.mutate({ id: project.id, archived: true })}>
                <Archive /> {t("ws.archive")}
              </DropdownMenuItem>
              {canManage && (
                <DropdownMenuItem danger onClick={() => confirmDelete(deleteProject, project, t)}>
                  <Trash2 /> {t("ws.deleteProject")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------------
   Members & invites
   -------------------------------------------------------------------------- */

function MembersTab({ ws }: { ws: WorkspaceDetail }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const invite = useInviteMember();
  const revokeInvite = useRevokeInvite();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const workspaceId = ws.id;
  const canManage = ws.myRole === "OWNER" || ws.myRole === "ADMIN";

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const inv = await invite.mutateAsync({ workspaceId, email, role });
      const url = `${window.location.origin}/join/${inv.token}`;
      setLastInviteUrl(url);
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast.success(t("ws.inviteCreated"));
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ws.inviteFailed"));
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">{t("ws.inviteTeammate")}</h3>
          <form onSubmit={sendInvite} className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Label htmlFor="invite-email">{t("common.email")}</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">{t("common.role")}</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none"
              >
                <option value="MEMBER">{t("ws.roleMember")}</option>
                <option value="ADMIN">{t("ws.roleAdmin")}</option>
              </select>
            </div>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("ws.inviteBtn")}
            </Button>
          </form>

          {lastInviteUrl && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
              <code className="min-w-0 flex-1 truncate">{lastInviteUrl}</code>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(lastInviteUrl)}>
                <Copy className="h-3.5 w-3.5" /> {t("ws.copy")}
              </Button>
            </div>
          )}

          {ws.invites.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("ws.pendingInvites")}</p>
              <div className="space-y-1.5">
                {ws.invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{inv.email}</span>
                    <span className="text-xs text-muted-foreground">{inv.role === "ADMIN" ? t("ws.roleAdmin") : t("ws.roleMember")}</span>
                    <span className="text-xs text-muted-foreground">{t("ws.expires", { time: relativeTime(inv.expiresAt, locale) })}</span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        revokeInvite.mutate(
                          { workspaceId, inviteId: inv.id },
                          { onSuccess: () => toast.success(t("ws.inviteRevoked")) }
                        )
                      }
                    >
                      {t("ws.revoke")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        {ws.members.map((m, i) => (
          <div
            key={m.id}
            className={`flex items-center gap-3 bg-card px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <Avatar name={m.user.name} src={m.user.image} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                m.role === "OWNER"
                  ? "bg-primary/10 text-primary"
                  : m.role === "ADMIN"
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {m.role === "OWNER" ? t("common.owner").toUpperCase() : m.role === "ADMIN" ? t("common.admin").toUpperCase() : t("common.member").toUpperCase()}
            </span>
            {canManage && m.role !== "OWNER" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() =>
                      updateRole.mutate(
                        { workspaceId, userId: m.user.id, role: m.role === "ADMIN" ? "MEMBER" : "ADMIN" },
                        { onSuccess: () => toast.success(t("ws.roleUpdated")) }
                      )
                    }
                  >
                    <Check /> {m.role === "ADMIN" ? t("ws.makeMember") : t("ws.makeAdmin")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    danger
                    onClick={() => {
                      if (confirm(t("ws.confirmRemove", { name: m.user.name }))) {
                        removeMember.mutate(
                          { workspaceId, userId: m.user.id },
                          { onSuccess: () => toast.success(t("ws.memberRemoved")) }
                        );
                      }
                    }}
                  >
                    <Trash2 /> {t("ws.removeMember")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("ws.inviteHint")}</p>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Activity
   -------------------------------------------------------------------------- */

function ActivityTab({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useActivity(workspaceId);

  if (isLoading) return <Skeleton className="h-64" />;

  if (!data || data.length === 0) {
    return <EmptyState title={t("ws.noActivity")} description={t("ws.noActivityDesc")} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {data.map((item, i) => (
        <div key={item.id} className={i > 0 ? "border-t border-border" : ""}>
          <ActivityRow item={item} />
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Settings
   -------------------------------------------------------------------------- */

function SettingsTab({
  workspaceId,
  name,
  description,
  myRole,
}: {
  workspaceId: string;
  name: string;
  description: string | null;
  myRole: string;
}) {
  const { t } = useI18n();
  const update = useUpdateWorkspace();
  const deleteWs = useDeleteWorkspace();
  const router = useRouter();
  const [formName, setFormName] = useState(name);
  const [formDesc, setFormDesc] = useState(description ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOwner = myRole === "OWNER";
  const canManage = isOwner || myRole === "ADMIN";

  return (
    <div className="max-w-xl space-y-6">
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold">{t("ws.details")}</h3>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(
              { id: workspaceId, name: formName, description: formDesc },
              {
                onSuccess: () => toast.success(t("ws.updated")),
                onError: (e) => toast.error(e.message),
              }
            );
          }}
        >
          <div>
            <Label htmlFor="ws-name">{t("common.name")}</Label>
            <Input id="ws-name" value={formName} onChange={(e) => setFormName(e.target.value)} disabled={!canManage} />
          </div>
          <div>
            <Label htmlFor="ws-desc">{t("common.description")}</Label>
            <Input id="ws-desc" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} disabled={!canManage} />
          </div>
          {canManage && (
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("common.save")}
            </Button>
          )}
        </form>
      </Card>

      {isOwner && (
        <Card className="border-danger/40 p-5">
          <h3 className="text-sm font-semibold text-danger">{t("ws.danger")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("ws.dangerDesc")}</p>
          <Button variant="danger" className="mt-4" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> {t("ws.deleteWorkspace")}
          </Button>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="w-[min(94vw,26rem)]">
              <DialogHeader>
                <DialogTitle>{t("ws.confirmDeleteWs")}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t("ws.confirmDeleteWsDesc")}</p>
              <ConfirmDeleteInput
                expected={name}
                confirmLabel={t("common.delete")}
                onConfirm={() => {
                  deleteWs.mutate(workspaceId, {
                    onSuccess: () => {
                      toast.success(t("ws.wsDeleted"));
                      router.push("/dashboard");
                    },
                    onError: (e) => toast.error(e.message),
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </Card>
      )}
    </div>
  );
}

function ConfirmDeleteInput({ expected, confirmLabel, onConfirm }: { expected: string; confirmLabel: string; onConfirm: () => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-4 flex gap-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={expected} autoFocus />
      <Button variant="danger" disabled={value !== expected} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}
