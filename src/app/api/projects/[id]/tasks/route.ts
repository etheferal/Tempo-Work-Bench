import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireProjectAccess } from "@/lib/api-utils";
import { createTaskSchema } from "@/lib/validations";
import { logActivity, notifyUser } from "@/lib/activity";

/** POST /api/projects/[id]/tasks — create a task in the first column. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = createTaskSchema.parse(await req.json());
    const { project } = await requireProjectAccess(params.id, userId);

    const firstColumn = await prisma.column.findFirst({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
    });
    if (!firstColumn) return jsonOk({ error: "This project has no columns yet" }, 400);

    const maxOrder = await prisma.task.aggregate({
      where: { columnId: firstColumn.id },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        priority: body.priority,
        recurrence: body.recurrence,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        assigneeId: body.assigneeId ?? null,
        columnId: firstColumn.id,
        projectId: project.id,
        createdById: userId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    await logActivity({
      workspaceId: project.workspaceId,
      userId,
      type: "task_created",
      projectId: project.id,
      taskId: task.id,
      meta: { taskTitle: task.title, projectName: project.name },
    });

    if (task.assigneeId && task.assigneeId !== userId) {
      await notifyUser({
        userId: task.assigneeId,
        type: "task_assigned",
        meta: {
          taskId: task.id,
          projectId: project.id,
          taskTitle: task.title,
          actorName: "Someone",
        },
      });
    }

    return jsonOk({ id: task.id }, 201);
  } catch (error) {
    return handleError(error);
  }
}
