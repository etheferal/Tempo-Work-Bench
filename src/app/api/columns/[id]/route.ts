import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, notFound, badRequest } from "@/lib/api-utils";
import { updateColumnSchema } from "@/lib/validations";

/** PATCH /api/columns/[id] — rename and/or toggle "done" column. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = updateColumnSchema.parse(await req.json());

    const column = await prisma.column.findUnique({ where: { id: params.id }, include: { project: true } });
    if (!column) throw notFound("Column not found");

    // Access check via the column's project
    const member = await prisma.member.findFirst({
      where: { userId, workspaceId: column.project.workspaceId },
    });
    if (!member) throw badRequest("You are not a member of this workspace");

    await prisma.column.update({
      where: { id: column.id },
      data: { name: body.name ?? undefined, isDone: body.isDone ?? undefined },
    });

    // Keep completedAt in sync with the done-column flag
    if (body.isDone !== undefined) {
      if (body.isDone) {
        await prisma.task.updateMany({
          where: { columnId: column.id, completedAt: null },
          data: { completedAt: new Date() },
        });
      } else {
        await prisma.task.updateMany({
          where: { columnId: column.id },
          data: { completedAt: null },
        });
      }
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/columns/[id] — deletes the column and its tasks (cascade). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();

    const column = await prisma.column.findUnique({ where: { id: params.id }, include: { project: true } });
    if (!column) throw notFound("Column not found");

    const member = await prisma.member.findFirst({
      where: { userId, workspaceId: column.project.workspaceId },
    });
    if (!member) throw badRequest("You are not a member of this workspace");

    const remaining = await prisma.column.count({ where: { projectId: column.projectId } });
    if (remaining <= 1) throw badRequest("A board needs at least one column");

    await prisma.column.delete({ where: { id: column.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
