import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { handleError, badRequest } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

/**
 * Registration — creates the user plus an onboarding workspace with a
 * starter board ("Getting started") so new accounts never see an empty UI.
 */
export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw badRequest("An account with this email already exists");

    const passwordHash = await bcrypt.hash(body.password, 10);

    // Unique slug for the personal workspace
    let slug = slugify(`${body.name}-workspace`) || "my-workspace";
    let suffix = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${slug}-${++suffix}`;
    }

    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: `${body.name}'s Workspace`,
        slug,
        ownerId: user.id,
        members: { create: [{ userId: user.id, role: "OWNER" }] },
      },
    });

    // Starter board
    const starterProject = await prisma.project.create({
      data: { name: "Getting started", color: "#6366f1", workspaceId: workspace.id },
    });
    const columnsData: Prisma.ColumnCreateManyInput[] = [
      { name: "To Do", order: 0, projectId: starterProject.id },
      { name: "In Progress", order: 1, projectId: starterProject.id },
      { name: "Done", order: 2, isDone: true, projectId: starterProject.id },
    ];
    await prisma.column.createMany({ data: columnsData });
    const columns = await prisma.column.findMany({ where: { projectId: starterProject.id }, orderBy: { order: "asc" } });

    await prisma.task.createMany({
      data: [
        {
          title: "Invite a teammate (Members → Invite)",
          priority: "MEDIUM",
          order: 0,
          columnId: columns[0].id,
          projectId: starterProject.id,
          createdById: user.id,
        },
        {
          title: "Drag me to another column 🎉",
          priority: "HIGH",
          order: 1,
          columnId: columns[0].id,
          projectId: starterProject.id,
          createdById: user.id,
        },
        {
          title: "Try the ⌘K command palette",
          priority: "URGENT",
          order: 0,
          columnId: columns[1].id,
          projectId: starterProject.id,
          createdById: user.id,
        },
      ],
    });

    await logActivity({
      workspaceId: workspace.id,
      userId: user.id,
      type: "workspace_created",
      meta: { workspaceName: workspace.name },
    });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
