import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import type { Priority } from "./constants";
import { PRIORITY_META } from "./constants";

/** date-fns locale for our two UI languages (undefined = English default). */
export function localeFor(locale?: string) {
  return locale === "tr" ? trLocale : undefined;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatDate(iso: string | Date | null | undefined, locale?: string) {
  if (!iso) return "";
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return format(date, "d MMM yyyy", { locale: localeFor(locale) });
}

export function relativeTime(iso: string | Date, locale?: string) {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: localeFor(locale) });
}

/** Human label for a due date: "Today", "Tomorrow", "3 Sept" + tone for styling. */
export function dueLabel(
  dueAt: string | null,
  locale?: string
): { text: string; tone: "overdue" | "soon" | "normal" } | null {
  if (!dueAt) return null;
  const date = parseISO(dueAt);
  if (isPast(date) && !isToday(date)) {
    return { text: format(date, "d MMM", { locale: localeFor(locale) }), tone: "overdue" };
  }
  if (isToday(date)) return { text: locale === "tr" ? "Bugün" : "Today", tone: "soon" };
  if (isTomorrow(date)) return { text: locale === "tr" ? "Yarın" : "Tomorrow", tone: "soon" };
  return { text: format(date, "d MMM", { locale: localeFor(locale) }), tone: "normal" };
}

export function priorityMeta(priority: Priority) {
  return PRIORITY_META[priority];
}

export function genToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function parseMeta<T = Record<string, string>>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
