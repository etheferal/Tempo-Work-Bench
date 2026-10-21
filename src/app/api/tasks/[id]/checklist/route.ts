import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireTaskAccess } from "@/lib/api-utils";
import { checklistCreateSchema } from "@/lib/validations";

/** POST /api/tasks/[id]/checklist — add a checklist item at the end. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = checklistCreateSchema.parse(await req.json());
    const { task } = await requireTaskAccess(params.id, userId);

    const maxOrder = await prisma.checklistItem.aggregate({
      where: { taskId: task.id },
      _max: { order: true },
    });

    const item = await prisma.checklistItem.create({
      data: {
        taskId: task.id,
        content: body.content,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    return jsonOk({ id: item.id, content: item.content, done: item.done, order: item.order }, 201);
  } catch (error) {
    return handleError(error);
  }
}
