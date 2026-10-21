import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireTaskAccess } from "@/lib/api-utils";
import { moveTaskSchema } from "@/lib/validations";
import { applyMoveFlat } from "@/lib/board";
import { computeNextDueAt, type Recurrence } from "@/lib/recurrence";
import { logActivity, notifyUser } from "@/lib/activity";

/**
 * POST /api/tasks/[id]/move — drag & drop persistence.
 * Body: { columnId, index }. Uses the same `applyMoveFlat` as the client,
 * then persists the new order/column and keeps `completedAt` in sync with
 * the destination column's `isDone` flag.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = moveTaskSchema.parse(await req.json());
    const { task } = await requireTaskAccess(params.id, userId);

    const targetColumn = await prisma.column.findUnique({ where: { id: body.columnId } });
    if (!targetColumn || targetColumn.projectId !== task.projectId) {
      return jsonOk({ error: "Target column not found" }, 404);
    }

    // Load the project's tasks (id, columnId, order) and compute the new state
    const projectTasks = await prisma.task.findMany({
      where: { projectId: task.projectId },
      select: { id: true, columnId: true, order: true },
    });

    const before = new Map(projectTasks.map((t) => [t.id, t]));
    const after = applyMoveFlat(projectTasks, task.id, body.columnId, body.index);

    const now = new Date();
    await prisma.$transaction(
      after
        .filter((t) => {
          const prev = before.get(t.id);
          return !prev || prev.columnId !== t.columnId || prev.order !== t.order;
        })
        .map((t) =>
          prisma.task.update({
            where: { id: t.id },
            data: {
              columnId: t.columnId,
              order: t.order,
              ...(t.id === task.id
                ? { completedAt: targetColumn.isDone ? task.completedAt ?? now : null }
                : {}),
            },
          })
        )
    );

    // Log completion state changes
    if (targetColumn.isDone && !task.completedAt) {
      await logActivity({
        workspaceId: task.project.workspaceId,
        userId,
        type: "task_completed",
        projectId: task.projectId,
        taskId: task.id,
        meta: { taskTitle: task.title, projectName: task.project.name },
      });

      // Recurring task → spawn the next occurrence (pure math in lib/recurrence)
      const recurrence = task.recurrence as Recurrence;
      if (recurrence !== "NONE") {
        const nextDue = computeNextDueAt(task.dueAt, recurrence);
        const openColumn = await prisma.column.findFirst({
          where: { projectId: task.projectId, isDone: false },
          orderBy: { order: "asc" },
        });

        if (nextDue && openColumn) {
          const maxOrder = await prisma.task.aggregate({
            where: { columnId: openColumn.id },
            _max: { order: true },
          });

          const spawned = await prisma.task.create({
            data: {
              title: task.title,
              description: task.description,
              priority: task.priority,
              recurrence: task.recurrence,
              dueAt: nextDue,
              assigneeId: task.assigneeId,
              columnId: openColumn.id,
              projectId: task.projectId,
              createdById: userId,
              order: (maxOrder._max.order ?? -1) + 1,
              labels: { create: task.labels.map((tl) => ({ labelId: tl.labelId })) },
            },
          });

          await logActivity({
            workspaceId: task.project.workspaceId,
            userId,
            type: "task_recreated",
            projectId: task.projectId,
            taskId: spawned.id,
            meta: { taskTitle: spawned.title, projectName: task.project.name },
          });

          if (spawned.assigneeId && spawned.assigneeId !== userId) {
            const actor = await prisma.user.findUnique({ where: { id: userId } });
            await notifyUser({
              userId: spawned.assigneeId,
              type: "task_assigned",
              meta: {
                taskId: spawned.id,
                projectId: spawned.projectId,
                taskTitle: spawned.title,
                actorName: actor?.name ?? "Someone",
              },
            });
          }
        }
      }
    } else if (!targetColumn.isDone && task.completedAt) {
      await logActivity({
        workspaceId: task.project.workspaceId,
        userId,
        type: "task_reopened",
        projectId: task.projectId,
        taskId: task.id,
        meta: { taskTitle: task.title, projectName: task.project.name },
      });
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
