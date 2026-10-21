import { PrismaClient } from "@prisma/client";
import path from "node:path";

/**
 * Prisma resolves relative SQLite URLs differently in different contexts:
 * the CLI resolves them against the prisma/ folder, while the generated
 * client resolves them against the process cwd at runtime. That mismatch
 * can silently point the app at a *different* (empty) database file.
 *
 * We normalize any relative `file:` URL against <cwd>/prisma so that
 * `npm run db:push`, `npm run db:seed` and the app itself always operate
 * on the exact same file, regardless of how the process was started.
 * Absolute URLs (e.g. the Docker setup) are left untouched.
 */
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:")) return url;

  const sqlitePath = url.slice("file:".length);
  if (path.isAbsolute(sqlitePath)) return url;

  return "file:" + path.resolve(process.cwd(), "prisma", sqlitePath);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
