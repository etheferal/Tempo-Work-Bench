import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireMemberOf, assertCanManage, badRequest } from "@/lib/api-utils";
import { memberUpdateSchema } from "@/lib/validations";

/** PATCH /api/workspaces/[id]/members — change a member's role (admin+). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = memberUpdateSchema.parse(await req.json());

    const role = await requireMemberOf(params.id, userId);
    assertCanManage(role);

    if (body.userId === userId) {
      throw badRequest("You can't change your own role");
    }

    const target = await prisma.member.findFirst({ where: { userId: body.userId, workspaceId: params.id } });
    if (!target) throw badRequest("Member not found");
    if (target.role === "OWNER") throw badRequest("The workspace owner's role can't be changed");

    await prisma.member.update({
      where: { userId_workspaceId: { userId: body.userId, workspaceId: params.id } },
      data: { role: body.role },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/workspaces/[id]/members?userId=… — remove a member (admin+). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const targetUserId = req.nextUrl.searchParams.get("userId");
    if (!targetUserId) throw badRequest("Missing userId");

    const role = await requireMemberOf(params.id, userId);
    assertCanManage(role);
    if (targetUserId === userId) throw badRequest("You can't remove yourself");

    const target = await prisma.member.findFirst({ where: { userId: targetUserId, workspaceId: params.id } });
    if (!target) throw badRequest("Member not found");
    if (target.role === "OWNER") throw badRequest("The workspace owner can't be removed");

    await prisma.member.deleteMany({ where: { userId: targetUserId, workspaceId: params.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
