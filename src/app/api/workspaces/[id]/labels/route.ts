import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireMemberOf, badRequest } from "@/lib/api-utils";
import { labelSchema } from "@/lib/validations";
import type { LabelDTO } from "@/lib/constants";

/** GET /api/workspaces/[id]/labels — list labels. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    await requireMemberOf(params.id, userId);

    const labels = await prisma.label.findMany({ where: { workspaceId: params.id }, orderBy: { name: "asc" } });
    const dtos: LabelDTO[] = labels.map((l) => ({ id: l.id, name: l.name, color: l.color }));
    return jsonOk(dtos);
  } catch (error) {
    return handleError(error);
  }
}

/** POST /api/workspaces/[id]/labels — create a label. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = labelSchema.parse(await req.json());
    await requireMemberOf(params.id, userId);

    const exists = await prisma.label.findFirst({ where: { workspaceId: params.id, name: body.name } });
    if (exists) throw badRequest("A label with this name already exists");

    const label = await prisma.label.create({
      data: { name: body.name, color: body.color, workspaceId: params.id },
    });
    const dto: LabelDTO = { id: label.id, name: label.name, color: label.color };
    return jsonOk(dto, 201);
  } catch (error) {
    return handleError(error);
  }
}
