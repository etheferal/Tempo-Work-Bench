import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handleError,
  jsonOk,
  requireUserId,
  forbidden,
  notFound,
  requireMemberOf,
  assertCanManage,
} from "@/lib/api-utils";
import type { InviteRow, LabelDTO, MemberRow, ProjectSummary, Role } from "@/lib/constants";
import { updateWorkspaceSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

/**
 * GET /api/workspaces?slug=… — full workspace detail for the current member
 * (projects, members, labels, pending invites).
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) throw notFound("Missing slug");

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

    // Tasks done per project (cheap: counts in JS)
    const tasksDone = await prisma.task.findMany({
      where: { projectId: { in: projects.map((p) => p.id) }, completedAt: { not: null } },
      select: { projectId: true },
    });
    const doneMap = new Map<string, number>();
    for (const t of tasksDone) doneMap.set(t.projectId, (doneMap.get(t.projectId) ?? 0) + 1);

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
      tasksCount: p._count.tasks,
      doneCount: doneMap.get(p.id) ?? 0,
    }));

    const memberDtos: MemberRow[] = members.map((m) => ({
      id: m.id,
      role: m.role as Role,
      user: { id: m.user.id, name: m.user.name, email: m.user.email, image: m.user.image },
      createdAt: m.createdAt.toISOString(),
    }));

    const labelDtos: LabelDTO[] = labels.map((l) => ({ id: l.id, name: l.name, color: l.color }));

    const inviteDtos: InviteRow[] =
      myRole === "OWNER" || myRole === "ADMIN"
        ? invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role as Exclude<Role, "OWNER">,
            expiresAt: i.expiresAt.toISOString(),
            createdAt: i.createdAt.toISOString(),
            token: i.token,
          }))
        : [];

    return jsonOk({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      myRole,
      projects: projectDtos,
      members: memberDtos,
      labels: labelDtos,
      invites: inviteDtos,
    });
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/workspaces/[id] — rename / edit description (admin+). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = updateWorkspaceSchema.parse(await req.json());

    const workspace = await prisma.workspace.findUnique({ where: { id: params.id } });
    if (!workspace) throw notFound("Workspace not found");

    const role = await requireMemberOf(workspace.id, userId);
    assertCanManage(role);

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: { name: body.name ?? undefined, description: body.description ?? undefined },
    });

    await logActivity({
      workspaceId: workspace.id,
      userId,
      type: "workspace_updated",
      meta: { workspaceName: updated.name },
    });

    return jsonOk({ ok: true, slug: updated.slug });
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/workspaces/[id] — owner only. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();

    const workspace = await prisma.workspace.findUnique({ where: { id: params.id } });
    if (!workspace) throw notFound("Workspace not found");

    const role = await requireMemberOf(workspace.id, userId);
    if (role !== "OWNER") throw forbidden("Only the workspace owner can delete it");

    await prisma.workspace.delete({ where: { id: workspace.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
