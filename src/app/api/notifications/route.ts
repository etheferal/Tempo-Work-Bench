import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId } from "@/lib/api-utils";
import { parseMeta } from "@/lib/utils";
import type { NotificationDTO, NotificationType } from "@/lib/constants";

/** GET /api/notifications — latest notifications + unread count. */
export async function GET() {
  try {
    const userId = await requireUserId();

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    const dtos: NotificationDTO[] = notifications.map((n) => ({
      id: n.id,
      type: n.type as NotificationType,
      meta: parseMeta(n.meta),
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));

    return jsonOk({ notifications: dtos, unreadCount });
  } catch (error) {
    return handleError(error);
  }
}

/** PATCH /api/notifications — mark one ({id}) or all ({all:true}) as read. */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };

    if (body.all || !body.id) {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      await prisma.notification.updateMany({
        where: { id: body.id, userId },
        data: { readAt: new Date() },
      });
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
