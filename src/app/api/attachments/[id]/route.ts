import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { handleError, requireUserId, requireTaskAccess, notFound } from "@/lib/api-utils";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

/**
 * GET /api/attachments/[id] — streams an attachment to workspace members only.
 * Images/PDF render inline; everything else downloads.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: params.id },
      include: { task: true },
    });
    if (!attachment) throw notFound("Attachment not found");

    // Access check — attachments inherit the task's workspace membership
    await requireTaskAccess(attachment.taskId, userId);

    const filePath = path.join(UPLOAD_ROOT, attachment.taskId, attachment.storedName);
    const data = await fs.readFile(filePath).catch(() => null);
    if (!data) throw notFound("File is no longer available");

    const inline = attachment.mime.startsWith("image/") || attachment.mime === "application/pdf";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.mime,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${attachment.name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
