import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireTaskAccess } from "@/lib/api-utils";
import { taskLabelToggleSchema } from "@/lib/validations";

/**
 * POST /api/tasks/[id]/labels — toggles a label on the task
 * (adds if missing, removes if present).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = taskLabelToggleSchema.parse(await req.json());
    const { task } = await requireTaskAccess(params.id, userId);

    // Label must belong to the same workspace
    const label = await prisma.label.findFirst({
      where: { id: body.labelId, workspaceId: task.project.workspaceId },
    });
    if (!label) return jsonOk({ error: "Label not found" }, 404);

    const existing = await prisma.taskLabel.findUnique({
      where: { taskId_labelId: { taskId: task.id, labelId: label.id } },
    });

    if (existing) {
      await prisma.taskLabel.delete({ where: { taskId_labelId: { taskId: task.id, labelId: label.id } } });
      return jsonOk({ ok: true, attached: false });
    }

    await prisma.taskLabel.create({ data: { taskId: task.id, labelId: label.id } });
    return jsonOk({ ok: true, attached: true });
  } catch (error) {
    return handleError(error);
  }
}
