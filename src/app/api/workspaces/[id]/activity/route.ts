import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireMemberOf } from "@/lib/api-utils";
import { parseMeta } from "@/lib/utils";
import type { ActivityDTO, ActivityType } from "@/lib/constants";

/** GET /api/workspaces/[id]/activity — recent activity feed. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    await requireMemberOf(params.id, userId);

    const activities = await prisma.activity.findMany({
      where: { workspaceId: params.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const dtos: ActivityDTO[] = activities.map((a) => ({
      id: a.id,
      type: a.type as ActivityType,
      meta: parseMeta(a.meta),
      createdAt: a.createdAt.toISOString(),
      user: { id: a.user.id, name: a.user.name, email: a.user.email, image: a.user.image },
    }));

    return jsonOk(dtos);
  } catch (error) {
    return handleError(error);
  }
}
