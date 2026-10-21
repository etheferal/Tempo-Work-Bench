import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, workspaceWhere } from "@/lib/api-utils";
import type { ProjectSummary } from "@/lib/constants";

/** GET /api/search?q=… — workspaces, projects and tasks in one call. */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return jsonOk({ workspaces: [], projects: [], tasks: [] });
    }

    const [workspaces, projects, tasks] = await Promise.all([
      prisma.workspace.findMany({
        where: { AND: [{ name: { contains: q } }, workspaceWhere(userId)] },
        select: { id: true, name: true, slug: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          workspace: workspaceWhere(userId),
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        },
        include: { workspace: { select: { name: true, slug: true } } },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          title: { contains: q },
          project: { workspace: workspaceWhere(userId) },
        },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const projectDtos: ProjectSummary[] = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      archivedAt: p.archivedAt?.toISOString() ?? null,
      workspaceId: p.workspaceId,
      workspaceName: p.workspace.name,
      workspaceSlug: p.workspace.slug,
      createdAt: p.createdAt.toISOString(),
    }));

    return jsonOk({
      workspaces,
      projects: projectDtos,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.project.id,
        projectName: t.project.name,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
