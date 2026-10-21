import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireProjectAccess } from "@/lib/api-utils";
import { createColumnSchema } from "@/lib/validations";

/** POST /api/projects/[id]/columns — add a column at the end. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = createColumnSchema.parse(await req.json());
    const { project } = await requireProjectAccess(params.id, userId);

    const maxOrder = await prisma.column.aggregate({
      where: { projectId: project.id },
      _max: { order: true },
    });

    const column = await prisma.column.create({
      data: {
        name: body.name,
        order: (maxOrder._max.order ?? -1) + 1,
        projectId: project.id,
      },
    });

    return jsonOk({ id: column.id, name: column.name, order: column.order, isDone: column.isDone }, 201);
  } catch (error) {
    return handleError(error);
  }
}
