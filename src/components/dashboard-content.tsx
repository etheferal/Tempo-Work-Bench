"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import {
  Activity as ActivityIcon,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  Inbox,
  TrendingUp,
} from "lucide-react";
import { useOverview } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { PRIORITY_META, type ActivityDTO, type Priority } from "@/lib/constants";
import { Avatar, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { dueLabel, relativeTime, cn } from "@/lib/utils";
import { NewProjectButton } from "@/components/sidebar";

export default function DashboardContent() {
  const { data, isLoading, isError } = useOverview();
  const { locale, t } = useI18n();

  if (isError) {
    return (
      <div className="p-6">
        <EmptyState title={t("dash.loadError")} description={t("dash.refresh")} />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const { counts, weekly, myTasks, priorityBreakdown, activity } = data;
  const firstName = data.user.name.split(" ")[0];
  const maxWeekly = Math.max(1, ...weekly.map((d) => d.count));
  const totalOpen = priorityBreakdown.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dash.greeting", { name: firstName })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: locale === "tr" ? trLocale : undefined })}
            {data.workspaces.length === 0 && ` ${t("dash.createFirst")}`}
          </p>
        </div>
        {data.workspaces[0] && <NewProjectButton workspaceId={data.workspaces[0].id} />}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox} label={t("dash.statOpen")} value={counts.activeTasks} tone="primary" />
        <StatCard icon={CheckCircle2} label={t("dash.statCompleted")} value={counts.completedThisWeek} tone="success" />
        <StatCard icon={CircleDashed} label={t("dash.statOverdue")} value={counts.overdue} tone={counts.overdue > 0 ? "danger" : "muted"} />
        <StatCard icon={FolderKanban} label={t("dash.statProjects")} value={counts.projects} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* My tasks */}
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> {t("dash.myTasks")}
            </h2>
            <span className="text-xs text-muted-foreground">{t("dash.shown", { n: myTasks.length })}</span>
          </div>
          <div className="divide-y divide-border">
            {myTasks.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("dash.noTasks")}</p>
            )}
            {myTasks.map((task) => {
              const due = dueLabel(task.dueAt, locale);
              return (
                <Link
                  key={task.id}
                  href={`/p/${task.projectId}?task=${task.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-accent/50"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PRIORITY_META[task.priority].color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                  <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.projectColor }} />
                    <span className="max-w-28 truncate">{task.projectName}</span>
                  </span>
                  {due && (
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-xs",
                        due.tone === "overdue" && "bg-danger/10 text-danger",
                        due.tone === "soon" && "bg-primary/10 text-primary",
                        due.tone === "normal" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {due.text}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Weekly chart */}
        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" /> {t("dash.weeklyTitle")}
            </h2>
          </div>
          <div className="px-5 py-5">
            <div className="flex h-40 items-end gap-2.5">
              {weekly.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{day.count > 0 ? day.count : ""}</span>
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-primary/70 to-primary transition-all"
                    style={{ height: `${Math.max(day.count > 0 ? 12 : 4, (day.count / maxWeekly) * 100)}%` }}
                    title={`${day.count} · ${day.date}`}
                  />
                  <span className="text-[11px] text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("dash.weeklySummary", { n: counts.completedThisWeek })}
            </p>
          </div>
        </Card>

        {/* Priority donut */}
        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t("dash.priorityTitle")}</h2>
          </div>
          <div className="flex items-center gap-6 px-5 py-5">
            <DonutChart breakdown={priorityBreakdown} total={totalOpen} />
            <div className="space-y-2">
              {priorityBreakdown.map((p) => (
                <div key={p.priority} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIORITY_META[p.priority].color }} />
                  <span className="text-muted-foreground">{priorityLabel(p.priority, t)}</span>
                  <span className="ml-auto font-medium">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Activity */}
        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ActivityIcon className="h-4 w-4 text-primary" /> {t("dash.recentActivity")}
            </h2>
          </div>
          <div className="divide-y divide-border">
            {activity.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("dash.noActivity")}</p>
            )}
            {activity.slice(0, 6).map((a) => (
              <ActivityRow key={a.id} item={a} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- helpers -----------------------------------------------------------------

function priorityLabel(priority: Priority, t: TFunc) {
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

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "success" | "danger" | "muted";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneCls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function DonutChart({ breakdown, total }: { breakdown: { priority: Priority; count: number }[]; total: number }) {
  const { t } = useI18n();
  const size = 120;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="14" className="stroke-muted" />
      {breakdown.map((seg) => {
        const fraction = total > 0 ? seg.count / total : 0;
        const dash = fraction * circumference;
        const el = (
          <circle
            key={seg.priority}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="14"
            stroke={PRIORITY_META[seg.priority].color}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
      <text x="50%" y="47%" textAnchor="middle" className="fill-foreground text-xl font-semibold">
        {total}
      </text>
      <text x="50%" y="60%" textAnchor="middle" className="fill-muted-foreground text-[9px]">
        {t("dash.openTasks")}
      </text>
    </svg>
  );
}

export function ActivityRow({ item }: { item: ActivityDTO }) {
  const { locale, t } = useI18n();

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Avatar name={item.user.name} src={item.user.image} className="h-7 w-7 text-[10px]" />
      <p className="min-w-0 flex-1 text-sm">
        <b className="font-medium">{item.user.name}</b>{" "}
        {describe(item.type, item.meta ?? {}, t)}{" "}
        <span className="text-xs text-muted-foreground" title={format(parseISO(item.createdAt), "d MMM yyyy, HH:mm")}>
          · {relativeTime(item.createdAt, locale)}
        </span>
      </p>
    </div>
  );
}

type TFunc = (key: any, vars?: Record<string, string | number>) => string;

function describe(type: string, meta: Record<string, string>, t: TFunc): React.ReactNode {
  const name = meta.taskTitle ?? meta.projectName ?? meta.workspaceName ?? meta.memberName ?? "";
  switch (type) {
    case "workspace_created":
      return t("dash.act.workspace_created", { name: meta.workspaceName });
    case "workspace_updated":
      return t("dash.act.workspace_updated", { name: meta.workspaceName });
    case "member_joined":
      return t("dash.act.member_joined");
    case "member_left":
      return t("dash.act.member_left");
    case "project_created":
      return t("dash.act.project_created", { name: meta.projectName });
    case "project_archived":
      return t("dash.act.project_archived", { name: meta.projectName });
    case "project_unarchived":
      return t("dash.act.project_unarchived", { name: meta.projectName });
    case "task_created":
      return t("dash.act.task_created", { name: meta.taskTitle, project: meta.projectName });
    case "task_completed":
      return t("dash.act.task_completed", { name: meta.taskTitle });
    case "task_reopened":
      return t("dash.act.task_reopened", { name: meta.taskTitle });
    case "task_assigned":
      return t("dash.act.task_assigned", { name: meta.taskTitle });
    case "task_recreated":
      return t("dash.act.task_recreated", { name: meta.taskTitle });
    case "comment_added":
      return t("dash.act.comment_added", { name: meta.taskTitle });
    default:
      return name;
  }
}
