import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireMemberOf, notFound, assertCanManage, badRequest } from "@/lib/api-utils";
import { inviteSchema } from "@/lib/validations";
import { genToken } from "@/lib/utils";
import type { InviteRow, Role } from "@/lib/constants";
import { addDays } from "date-fns";

/** POST /api/workspaces/[id]/invites — create an invite link (admin+). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = inviteSchema.parse(await req.json());

    const workspace = await prisma.workspace.findUnique({ where: { id: params.id } });
    if (!workspace) throw notFound("Workspace not found");
    const role = await requireMemberOf(workspace.id, userId);
    assertCanManage(role);

    // Already a member?
    const alreadyMember = await prisma.user.findFirst({
      where: { email: body.email, memberships: { some: { workspaceId: workspace.id } } },
    });
    if (alreadyMember) throw badRequest("This person is already a member of the workspace");

    const invite = await prisma.invite.create({
      data: {
        email: body.email,
        role: body.role,
        token: genToken(),
        workspaceId: workspace.id,
        inviterId: userId,
        expiresAt: addDays(new Date(), 7),
      },
    });

    const dto: InviteRow = {
      id: invite.id,
      email: invite.email,
      role: invite.role as Exclude<Role, "OWNER">,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      token: invite.token,
    };
    return jsonOk(dto, 201);
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/workspaces/[id]/invites?inviteId=… — revoke an invite. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const inviteId = req.nextUrl.searchParams.get("inviteId");
    if (!inviteId) throw badRequest("Missing inviteId");

    const role = await requireMemberOf(params.id, userId);
    assertCanManage(role);

    await prisma.invite.deleteMany({ where: { id: inviteId, workspaceId: params.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
