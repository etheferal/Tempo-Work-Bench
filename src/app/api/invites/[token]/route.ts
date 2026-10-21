import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, notFound, badRequest } from "@/lib/api-utils";
import { getSessionUser } from "@/lib/auth";
import { logActivity, notifyUser } from "@/lib/activity";

/** GET /api/invites/[token] — public invite info for the join page. */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: params.token },
      include: { workspace: true, inviter: true },
    });
    if (!invite) throw notFound("This invite doesn't exist or was revoked");
    if (invite.acceptedAt) throw badRequest("This invite has already been used");
    if (invite.expiresAt < new Date()) throw badRequest("This invite has expired");

    return jsonOk({
      workspaceName: invite.workspace.name,
      workspaceId: invite.workspace.id,
      inviterName: invite.inviter.name,
      email: invite.email,
      role: invite.role,
      slug: invite.workspace.slug,
    });
  } catch (error) {
    return handleError(error);
  }
}

/** POST /api/invites/[token] — accept the invite as the logged-in user. */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) throw badRequest("Sign in first to accept this invite");
    const userId = sessionUser.id;

    const invite = await prisma.invite.findUnique({ where: { token: params.token }, include: { workspace: true } });
    if (!invite) throw notFound("This invite doesn't exist or was revoked");
    if (invite.acceptedAt) throw badRequest("This invite has already been used");
    if (invite.expiresAt < new Date()) throw badRequest("This invite has expired");

    const already = await prisma.member.findFirst({
      where: { userId, workspaceId: invite.workspaceId },
    });
    if (already) throw badRequest("You are already a member of this workspace");

    await prisma.$transaction([
      prisma.member.create({ data: { userId, workspaceId: invite.workspaceId, role: invite.role } }),
      prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    ]);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    await logActivity({
      workspaceId: invite.workspaceId,
      userId,
      type: "member_joined",
      meta: { memberName: user?.name ?? "A new member" },
    });
    await notifyUser({
      userId,
      type: "member_joined",
      meta: { workspaceName: invite.workspace.name },
    });

    return jsonOk({ slug: invite.workspace.slug });
  } catch (error) {
    return handleError(error);
  }
}
