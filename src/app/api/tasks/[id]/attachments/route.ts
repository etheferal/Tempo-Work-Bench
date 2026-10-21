import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { handleError, jsonOk, requireUserId, requireTaskAccess, notFound, badRequest } from "@/lib/api-utils";
import {
  MAX_ATTACHMENT_SIZE,
  buildStoredName,
  formatFileSize,
  isAllowedMime,
  sanitizeFileName,
} from "@/lib/attachments";
import type { AttachmentDTO } from "@/lib/constants";

/** Directory where attachment binaries live (git-ignored). */
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

/**
 * POST /api/tasks/[id]/attachments — multipart upload (field "file").
 * Max 5 MB, allow-listed mime types, sanitized ASCII filenames.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const { task } = await requireTaskAccess(params.id, userId);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("No file provided");
    if (file.size === 0) throw badRequest("The file is empty");
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw badRequest(`Files can be at most ${formatFileSize(MAX_ATTACHMENT_SIZE)}`);
    }

    const mime = file.type || "application/octet-stream";
    if (!isAllowedMime(mime)) throw badRequest("This file type is not allowed");

    const name = sanitizeFileName(file.name);
    if (!name) throw badRequest("The filename is not valid");

    const storedName = buildStoredName(path.extname(name));
    const dir = path.join(UPLOAD_ROOT, task.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, storedName), Buffer.from(await file.arrayBuffer()));

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        name,
        storedName,
        mime,
        size: file.size,
        uploadedById: userId,
      },
    });

    const dto: AttachmentDTO = {
      id: attachment.id,
      name: attachment.name,
      mime: attachment.mime,
      size: attachment.size,
      createdAt: attachment.createdAt.toISOString(),
    };
    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

/** DELETE /api/tasks/[id]/attachments?attachmentId=… — remove an attachment. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const attachmentId = req.nextUrl.searchParams.get("attachmentId");
    if (!attachmentId) throw badRequest("Missing attachmentId");

    const { task } = await requireTaskAccess(params.id, userId);
    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId: task.id },
    });
    if (!attachment) throw notFound("Attachment not found");

    await prisma.taskAttachment.delete({ where: { id: attachment.id } });
    // Best-effort disk cleanup — DB is the source of truth
    await fs.rm(path.join(UPLOAD_ROOT, task.id, attachment.storedName), { force: true }).catch(() => {});

    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
