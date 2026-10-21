import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, notFound, requireTaskAccess } from "@/lib/api-utils";
import { checklistUpdateSchema } from "@/lib/validations";

/** PATCH /api/checklist/[id] — toggle / rename a checklist item. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = checklistUpdateSchema.parse(await req.json());

    const item = await prisma.checklistItem.findUnique({ where: { id: params.id }, include: { task: true } });
    if (!item) throw notFound("Checklist item not found");
    await requireTaskAccess(item.task.id, userId);

    await prisma.checklistItem.update({
      where: { id: item.id },
      data: { done: body.done ?? undefined, content: body.content ?? undefined },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/checklist/[id]. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();

    const item = await prisma.checklistItem.findUnique({ where: { id: params.id }, include: { task: true } });
    if (!item) throw notFound("Checklist item not found");
    await requireTaskAccess(item.task.id, userId);

    await prisma.checklistItem.delete({ where: { id: item.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
