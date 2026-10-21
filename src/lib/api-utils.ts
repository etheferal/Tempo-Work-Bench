import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "./constants";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest = (m = "Bad request") => new ApiError(400, m);
export const unauthorized = (m = "You must be signed in") => new ApiError(401, m);
export const forbidden = (m = "You don't have permission for this action") => new ApiError(403, m);
export const notFound = (m = "Not found") => new ApiError(404, m);

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Uniform error mapping for all route handlers. */
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api]", error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

/** 401 unless a session exists. Returns the user id. */
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user?.id) throw unauthorized();
  return user.id;
}

/** Ensures the user is a member of the workspace. Returns their role. */
export async function requireMemberOf(workspaceId: string, userId: string): Promise<Role> {
  const member = await prisma.member.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!member) throw forbidden("You are not a member of this workspace");
  return member.role as Role;
}

export function assertCanManage(role: Role) {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw forbidden("Only workspace admins can do this");
  }
}

/** Loads a project and verifies the caller's membership in its workspace. */
export async function requireProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });
  if (!project) throw notFound("Project not found");
  const role = await requireMemberOf(project.workspaceId, userId);
  return { project, role };
}

/** Loads a task with project+column and verifies access. */
export async function requireTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: true,
      assignee: true,
      labels: { include: { label: true } },
      project: { include: { workspace: { select: { id: true, name: true, slug: true } } } },
    },
  });
  if (!task) throw notFound("Task not found");
  const role = await requireMemberOf(task.project.workspaceId, userId);
  return { task, role };
}

/** Workspace-scope helpers built on Prisma relations. */
export const workspaceWhere = (userId: string) => ({
  members: { some: { userId } },
});
