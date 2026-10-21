import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireTaskAccess } from "@/lib/api-utils";
import { updateTaskSchema } from "@/lib/validations";
import { logActivity, notifyUser } from "@/lib/activity";
import type { Priority, TaskDetailDTO } from "@/lib/constants";

/** GET /api/tasks/[id] — full task detail (checklist, comments, members). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { task } = await requireTaskAccess(params.id, userId);

    const [checklist, comments, members, labels, attachments] = await Promise.all([
      prisma.checklistItem.findMany({ where: { taskId: task.id }, orderBy: { order: "asc" } }),
      prisma.comment.findMany({ where: { taskId: task.id }, include: { author: true }, orderBy: { createdAt: "asc" } }),
      prisma.member.findMany({
        where: { workspaceId: task.project.workspaceId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.label.findMany({ where: { workspaceId: task.project.workspaceId }, orderBy: { name: "asc" } }),
      prisma.taskAttachment.findMany({ where: { taskId: task.id }, orderBy: { createdAt: "asc" } }),
    ]);

    const dto: TaskDetailDTO = {
      id: task.id,
      title: task.title,
      description: task.description,
      recurrence: task.recurrence,
      order: task.order,
      priority: task.priority as Priority,
      dueAt: task.dueAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      assignee: task.assignee
        ? { id: task.assignee.id, name: task.assignee.name, email: task.assignee.email, image: task.assignee.image }
        : null,
      labels: task.labels.map((tl) => ({ id: tl.labelId, name: tl.label.name, color: tl.label.color })),
      workspaceLabels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
      commentCount: comments.length,
      checklistCount: checklist.length,
      checklistDoneCount: checklist.filter((c) => c.done).length,
      projectId: task.projectId,
      projectName: task.project.name,
      projectColor: task.project.color,
      columnId: task.columnId,
      columnName: task.column.name,
      workspaceId: task.project.workspaceId,
      checklist: checklist.map((c) => ({ id: c.id, content: c.content, done: c.done, order: c.order })),
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: { id: c.author.id, name: c.author.name, email: c.author.email, image: c.author.image },
      })),
      attachments: attachments.map((a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        size: a.size,
        createdAt: a.createdAt.toISOString(),
      })),
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
      })),
    };

    return jsonOk(dto);
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/tasks/[id] — update any subset of editable fields. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = updateTaskSchema.parse(await req.json());
    const { task } = await requireTaskAccess(params.id, userId);

    const data: {
      title?: string;
      description?: string | null;
      priority?: Priority;
      recurrence?: string;
      assigneeId?: string | null;
      dueAt?: Date | null;
    } = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.recurrence !== undefined) data.recurrence = body.recurrence;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;

    const updated = await prisma.task.update({ where: { id: task.id }, data });

    // Assignment changed → notify the new assignee
    if (body.assigneeId !== undefined && updated.assigneeId && updated.assigneeId !== task.assigneeId) {
      if (updated.assigneeId !== userId) {
        const actor = await prisma.user.findUnique({ where: { id: userId } });
        await notifyUser({
          userId: updated.assigneeId,
          type: "task_assigned",
          meta: {
            taskId: updated.id,
            projectId: updated.projectId,
            taskTitle: updated.title,
            actorName: actor?.name ?? "Someone",
          },
        });
        await logActivity({
          workspaceId: task.project.workspaceId,
          userId,
          type: "task_assigned",
          projectId: task.projectId,
          taskId: task.id,
          meta: { taskTitle: updated.title, projectName: task.project.name },
        });
      }
    }

    return jsonOk({ ok: true, id: updated.id });
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/tasks/[id]. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { task } = await requireTaskAccess(params.id, userId);

    await prisma.task.delete({ where: { id: task.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
