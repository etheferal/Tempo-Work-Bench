import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireMemberOf, badRequest, notFound } from "@/lib/api-utils";
import { createWorkspaceSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/utils";
import type { InviteRow, LabelDTO, MemberRow, ProjectSummary, Role, WorkspaceSummary } from "@/lib/constants";

/**
 * GET /api/workspaces            → workspaces the user belongs to
 * GET /api/workspaces?slug=…     → full detail of one workspace (sidebar & workspace page)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const slug = req.nextUrl.searchParams.get("slug");

    // --- Detail mode ---
    if (slug) {
      const workspace = await prisma.workspace.findUnique({ where: { slug } });
      if (!workspace) throw notFound("Workspace not found");
      const myRole = await requireMemberOf(workspace.id, userId);

      const [projects, members, labels, invites] = await Promise.all([
        prisma.project.findMany({
          where: { workspaceId: workspace.id },
          include: {
            workspace: { select: { name: true, slug: true } },
            _count: { select: { tasks: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.member.findMany({
          where: { workspaceId: workspace.id },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.label.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
        prisma.invite.findMany({
          where: { workspaceId: workspace.id, acceptedAt: null },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const tasksDone = await prisma.task.findMany({
        where: { projectId: { in: projects.map((p) => p.id) }, completedAt: { not: null } },
        select: { projectId: true },
      });
      const doneMap = new Map<string, number>();
      for (const t of tasksDone) doneMap.set(t.projectId, (doneMap.get(t.projectId) ?? 0) + 1);

      return jsonOk({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        myRole,
        projects: projects.map<ProjectSummary>((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          color: p.color,
          archivedAt: p.archivedAt?.toISOString() ?? null,
          workspaceId: p.workspaceId,
          workspaceName: p.workspace.name,
          workspaceSlug: p.workspace.slug,
          createdAt: p.createdAt.toISOString(),
          tasksCount: p._count.tasks,
          doneCount: doneMap.get(p.id) ?? 0,
        })),
        members: members.map<MemberRow>((m) => ({
          id: m.id,
          role: m.role as Role,
          user: { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image },
          createdAt: m.createdAt.toISOString(),
        })),
        labels: labels.map<LabelDTO>((l) => ({ id: l.id, name: l.name, color: l.color })),
        invites:
          myRole === "OWNER" || myRole === "ADMIN"
            ? invites.map<InviteRow>((i) => ({
                id: i.id,
                email: i.email,
                role: i.role as Exclude<Role, "OWNER">,
                expiresAt: i.expiresAt.toISOString(),
                createdAt: i.createdAt.toISOString(),
                token: i.token,
              }))
            : [],
      });
    }

    // --- List mode ---
    const memberships = await prisma.member.findMany({
      where: { userId },
      include: { workspace: { include: { _count: { select: { projects: true } } } } },
      orderBy: { createdAt: "asc" },
    });

    const data: WorkspaceSummary[] = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      role: m.role as WorkspaceSummary["role"],
      projectsCount: m.workspace._count.projects,
      createdAt: m.workspace.createdAt.toISOString(),
    }));

    return jsonOk(data);
  } catch (error) {
    return handleError(error);
  }
}

/** POST /api/workspaces — create a workspace with default starter board. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createWorkspaceSchema.parse(await req.json());

    let slug = slugify(body.name) || "workspace";
    let suffix = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${slug}-${++suffix}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        slug,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });

    // Starter board
    const project = await prisma.project.create({
      data: { name: "First board", color: "#6366f1", workspaceId: workspace.id },
    });
    const columns = await Promise.all(
      ["To Do", "In Progress", "Done"].map((name, i) =>
        prisma.column.create({ data: { name, order: i, isDone: name === "Done", projectId: project.id } })
      )
    );
    await prisma.task.create({
      data: {
        title: "Create your first task",
        priority: "MEDIUM",
        order: 0,
        columnId: columns[0].id,
        projectId: project.id,
        createdById: userId,
      },
    });

    await logActivity({
      workspaceId: workspace.id,
      userId,
      type: "workspace_created",
      meta: { workspaceName: workspace.name },
    });

    const response: WorkspaceSummary = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      role: "OWNER",
      projectsCount: 1,
      createdAt: workspace.createdAt.toISOString(),
    };

    return jsonOk(response, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return handleError(badRequest("That name creates a duplicate slug, try another name"));
    }
    return handleError(error);
  }
}
