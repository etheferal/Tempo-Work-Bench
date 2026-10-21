import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handleError,
  jsonOk,
  requireUserId,
  requireProjectAccess,
  assertCanManage,
} from "@/lib/api-utils";
import { updateProjectSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import type { BoardDTO, BoardTaskDTO, Priority, Role } from "@/lib/constants";

/** GET /api/projects/[id] — the full board (columns + tasks) for a project. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { project, role } = await requireProjectAccess(params.id, userId);

    const columns = await prisma.column.findMany({
      where: { projectId: project.id },
      include: {
        tasks: {
          include: {
            assignee: true,
            labels: { include: { label: true } },
            _count: { select: { comments: true, checklist: true } },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    // checklist done counts in one query
    const checklistDone = await prisma.checklistItem.groupBy({
      by: ["taskId"],
      where: { task: { projectId: project.id }, done: true },
      _count: { _all: true },
    });
    const doneMap = new Map(checklistDone.map((c) => [c.taskId, c._count._all]));

    const board: BoardDTO = {
      id: project.id,
      name: project.name,
      color: project.color,
      workspace: project.workspace,
      role: role as Role,
      columns: columns.map((col) => ({
        id: col.id,
        name: col.name,
        order: col.order,
        isDone: col.isDone,
        tasks: col.tasks
          .sort((a, b) => a.order - b.order)
          .map<BoardTaskDTO>((t) => ({
            id: t.id,
            title: t.title,
            order: t.order,
            priority: t.priority as Priority,
            dueAt: t.dueAt?.toISOString() ?? null,
            completedAt: t.completedAt?.toISOString() ?? null,
            createdAt: t.createdAt.toISOString(),
            assignee: t.assignee
              ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email, image: t.assignee.image }
              : null,
            labels: t.labels.map((tl) => ({ id: tl.label.id, name: tl.label.name, color: tl.label.color })),
            commentCount: t._count.comments,
            checklistCount: t._count.checklist,
            checklistDoneCount: doneMap.get(t.id) ?? 0,
          })),
      })),
    };

    return jsonOk(board);
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/projects/[id] — rename / archive / unarchive. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = updateProjectSchema.parse(await req.json());
    const { project } = await requireProjectAccess(params.id, userId);

    const data: { name?: string; description?: string | null; color?: string; archivedAt?: Date | null } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.color !== undefined) data.color = body.color;
    if (body.archived !== undefined) data.archivedAt = body.archived ? new Date() : null;

    await prisma.project.update({ where: { id: project.id }, data });

    if (body.archived !== undefined) {
      await logActivity({
        workspaceId: project.workspaceId,
        userId,
        type: body.archived ? "project_archived" : "project_unarchived",
        projectId: project.id,
        meta: { projectName: body.name ?? project.name },
      });
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/projects/[id] — workspace admins only. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { project, role } = await requireProjectAccess(params.id, userId);
    assertCanManage(role);

    await prisma.project.delete({ where: { id: project.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
