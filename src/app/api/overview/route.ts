import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, unauthorized } from "@/lib/api-utils";
import { getSessionUser } from "@/lib/auth";
import { parseMeta } from "@/lib/utils";
import { format, subDays } from "date-fns";
import type { ActivityDTO, ActivityType, OverviewDTO, Priority, WorkspaceSummary } from "@/lib/constants";

/** GET /api/overview — everything the dashboard needs, in one request. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const sessionUser = await getSessionUser();
    if (!sessionUser) throw unauthorized();

    const memberships = await prisma.member.findMany({
      where: { userId },
      include: { workspace: { include: { _count: { select: { projects: true } } } } },
      orderBy: { createdAt: "asc" },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const workspaceDtos: WorkspaceSummary[] = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      role: m.role as WorkspaceSummary["role"],
      projectsCount: m.workspace._count.projects,
      createdAt: m.workspace.createdAt.toISOString(),
    }));

    // My open tasks (assigned to me, not completed)
    const [openTasks, completedRecently, projectCount] = await Promise.all([
      prisma.task.findMany({
        where: {
          assigneeId: userId,
          completedAt: null,
          project: { workspaceId: { in: workspaceIds } },
        },
        include: { column: true, project: { select: { name: true, color: true, id: true } } },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      }),
      prisma.task.count({
        where: {
          assigneeId: userId,
          completedAt: { gte: subDays(new Date(), 7) },
        },
      }),
      prisma.project.count({ where: { workspaceId: { in: workspaceIds }, archivedAt: null } }),
    ]);

    const now = new Date();
    const overdue = openTasks.filter((t) => t.dueAt && t.dueAt < now).length;

    const myTasks = openTasks.slice(0, 10).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority as Priority,
      dueAt: t.dueAt?.toISOString() ?? null,
      completedAt: null,
      projectId: t.project.id,
      projectName: t.project.name,
      projectColor: t.project.color,
      columnName: t.column.name,
    }));

    // Weekly completion chart (last 7 days)
    const weekAgo = subDays(now, 6);
    const completed = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        completedAt: { gte: weekAgo },
      },
      select: { completedAt: true },
    });
    const weekly = Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(now, 6 - i);
      const key = format(day, "yyyy-MM-dd");
      const count = completed.filter(
        (t) => t.completedAt && format(t.completedAt, "yyyy-MM-dd") === key
      ).length;
      return { date: key, label: format(day, "EEE"), count };
    });

    // Priority breakdown across my open tasks
    const breakdown = ["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => ({
      priority: priority as Priority,
      count: openTasks.filter((t) => t.priority === priority).length,
    }));

    // Recent activity across my workspaces
    const activities = await prisma.activity.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const activityDtos: ActivityDTO[] = activities.map((a) => ({
      id: a.id,
      type: a.type as ActivityType,
      meta: parseMeta(a.meta),
      createdAt: a.createdAt.toISOString(),
      user: { id: a.user.id, name: a.user.name, email: a.user.email, image: a.user.image },
    }));

    const data: OverviewDTO = {
      user: {
        id: sessionUser.id,
        name: sessionUser.name ?? "",
        email: sessionUser.email ?? "",
        image: sessionUser.image ?? null,
      },
      workspaces: workspaceDtos,
      counts: {
        activeTasks: openTasks.length,
        completedThisWeek: completedRecently,
        overdue,
        projects: projectCount,
      },
      weekly,
      myTasks,
      priorityBreakdown: breakdown,
      activity: activityDtos,
    };

    return jsonOk(data);
  } catch (error) {
    return handleError(error);
  }
}
