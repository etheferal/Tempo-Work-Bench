/**
 * Pure helpers for task attachments — validated with unit tests.
 * Everything the upload endpoint trusts is decided here.
 */

import { slugify } from "./utils";

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB

/** Images, documents and archives. SVG is intentionally excluded (XSS vector). */
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/zip",
] as const;

export function isAllowedMime(mime: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

/** Extensions that may be kept; anything else is dropped from the name. */
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt", "md", "csv", "zip"];

/**
 * Turns a user-supplied filename into a safe, ASCII, filesystem-friendly name
 * while keeping the extension. Path traversal (`../../x`), unusual characters
 * and non-allow-listed extensions are neutralized; returns "" when nothing
 * safe remains.
 */
export function sanitizeFileName(input: string): string {
  const base = input.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const rawExt = dot > 0 ? base.slice(dot).toLowerCase() : "";
  const stem = dot > 0 ? base.slice(0, dot) : base;

  const extMatch = rawExt.match(/^\.([a-z0-9]{1,10})$/);
  const ext = extMatch && ALLOWED_EXTENSIONS.includes(extMatch[1]) ? rawExt : "";

  // Dots inside the stem (e.g. "report.v2") read better as dashes
  const safeStem = slugify(stem.replace(/\./g, " "));
  if (!safeStem && !ext) return "";
  const name = (safeStem || "file") + ext;
  return name.slice(0, 100);
}

/** "1.2 KB"-style human file sizes. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / (102.4 * 1024)) / 10} MB`;
}

/** The on-disk name: random id + safe extension. */
export function buildStoredName(extension: string): string {
  const ext = extension.match(/^(\.[a-z0-9]{1,10})$/)?.[1] ?? "";
  return `${crypto.randomUUID().replace(/-/g, "")}${ext}`;
}
