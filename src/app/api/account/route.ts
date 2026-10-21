import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, badRequest } from "@/lib/api-utils";
import { profileSchema, passwordSchema } from "@/lib/validations";

/** PATCH /api/account — update profile and/or change password. */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as Record<string, unknown>;

    const updates: { name?: string; image?: string | null; passwordHash?: string } = {};

    if (body.name !== undefined || body.image !== undefined) {
      const profile = profileSchema.parse({ name: body.name, image: body.image });
      updates.name = profile.name;
      updates.image = profile.image === "" ? null : profile.image;
    }

    if (body.currentPassword || body.newPassword) {
      const pw = passwordSchema.parse({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw badRequest("Account not found");
      const valid = await bcrypt.compare(pw.currentPassword, user.passwordHash);
      if (!valid) throw badRequest("Your current password is incorrect");
      updates.passwordHash = await bcrypt.hash(pw.newPassword, 10);
    }

    if (Object.keys(updates).length === 0) throw badRequest("Nothing to update");

    await prisma.user.update({ where: { id: userId }, data: updates });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
