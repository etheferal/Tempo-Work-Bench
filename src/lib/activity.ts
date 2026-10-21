import { prisma } from "./prisma";
import type { ActivityType, NotificationType } from "./constants";

/** Writes an activity record (fire-and-forget friendly). */
export async function logActivity(input: {
  workspaceId: string;
  userId: string;
  type: ActivityType;
  projectId?: string | null;
  taskId?: string | null;
  meta?: Record<string, string> | null;
}) {
  await prisma.activity.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}

/** Creates an in-app notification for a user. */
export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  meta?: Record<string, string> | null;
}) {
  if (!input.userId) return;
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}
