import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireTaskAccess } from "@/lib/api-utils";
import { commentSchema } from "@/lib/validations";
import { logActivity, notifyUser } from "@/lib/activity";

/** POST /api/tasks/[id]/comments — add a comment; notifies the assignee. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = commentSchema.parse(await req.json());
    const { task } = await requireTaskAccess(params.id, userId);

    const comment = await prisma.comment.create({
      data: { taskId: task.id, authorId: userId, content: body.content },
      include: { author: true },
    });

    const [author] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      logActivity({
        workspaceId: task.project.workspaceId,
        userId,
        type: "comment_added",
        projectId: task.projectId,
        taskId: task.id,
        meta: { taskTitle: task.title, projectName: task.project.name },
      }),
    ]);

    if (task.assigneeId && task.assigneeId !== userId) {
      await notifyUser({
        userId: task.assigneeId,
        type: "comment_added",
        meta: {
          taskId: task.id,
          projectId: task.projectId,
          taskTitle: task.title,
          actorName: author?.name ?? "Someone",
        },
      });
    }

    return jsonOk(
      {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
          image: comment.author.image,
        },
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
