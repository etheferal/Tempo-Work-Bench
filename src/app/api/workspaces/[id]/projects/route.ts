import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireMemberOf, notFound } from "@/lib/api-utils";
import { createProjectSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import type { ProjectSummary } from "@/lib/constants";

/** POST /api/workspaces/[id]/projects — create a project with default columns. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = createProjectSchema.parse(await req.json());

    const workspace = await prisma.workspace.findUnique({ where: { id: params.id } });
    if (!workspace) throw notFound("Workspace not found");
    await requireMemberOf(workspace.id, userId);

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        color: body.color,
        workspaceId: workspace.id,
      },
    });

    await Promise.all(
      ["To Do", "In Progress", "Done"].map((name, i) =>
        prisma.column.create({ data: { name, order: i, isDone: name === "Done", projectId: project.id } })
      )
    );

    await logActivity({
      workspaceId: workspace.id,
      userId,
      type: "project_created",
      projectId: project.id,
      meta: { projectName: project.name },
    });

    const dto: ProjectSummary = {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      archivedAt: null,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      createdAt: project.createdAt.toISOString(),
      tasksCount: 0,
      doneCount: 0,
    };

    return jsonOk(dto, 201);
  } catch (error) {
    return handleError(error);
  }
}

/** GET /api/workspaces/[id]/projects — list projects (members). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    await requireMemberOf(params.id, userId);

    const projects = await prisma.project.findMany({
      where: { workspaceId: params.id },
      include: { workspace: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });

    const dtos: ProjectSummary[] = projects.map((p) => ({
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

    return jsonOk(dtos);
  } catch (error) {
    return handleError(error);
  }
}
