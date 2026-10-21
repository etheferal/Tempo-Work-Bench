"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, CheckCheck, LogOut, Menu, Moon, Search, Settings, Sun, User as UserIcon } from "lucide-react";
import { useTheme } from "@/components/providers";
import { useI18n } from "@/lib/i18n";
import { useMarkNotifications, useNotifications } from "@/lib/hooks";
import { parseMeta } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/constants";
import { Avatar, Button } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, relativeTime } from "@/lib/utils";

export default function Topbar() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotifications();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const unread = notifications?.unreadCount ?? 0;

  function openPalette() {
    window.dispatchEvent(new CustomEvent("tempo:open-command"));
  }

  function notificationSentence(n: NotificationDTO) {
    const title = n.meta?.taskTitle ?? "";
    switch (n.type) {
      case "task_assigned":
        return t("topbar.assignedYou", { title });
      case "comment_added":
        return t("topbar.commentedOn", { title });
      default:
        return t("topbar.addedYou");
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
      {/* Mobile nav fallback: open palette as primary navigation */}
      <Button variant="ghost" size="icon" className="md:hidden" onClick={openPalette} aria-label="Menu">
        <Menu className="h-4 w-4" />
      </Button>

      <button
        onClick={openPalette}
        className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-input bg-muted/60 px-3 text-sm text-muted-foreground transition hover:bg-accent md:flex"
      >
        <Search className="h-4 w-4" />
        <span>{t("topbar.search")}</span>
        <kbd className="ml-auto rounded border border-border bg-card px-1.5 font-mono text-[11px]">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Language switcher */}
        <div
          className="flex items-center rounded-lg border border-border p-0.5"
          role="group"
          aria-label={t("topbar.language")}
          title={t("topbar.language")}
        >
          <button
            onClick={() => setLocale("en")}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition",
              locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("tr")}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition",
              locale === "tr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            TR
          </button>
        </div>

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={t("topbar.themeToggle")}
          title={t("topbar.themeToggle")}
          suppressHydrationWarning
        >
          {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-accent" aria-label={t("common.notifications")}>
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">{t("common.notifications")}</span>
              {unread > 0 && (
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
                  onClick={() => markRead.mutate({ all: true })}
                >
                  <CheckCheck className="h-3.5 w-3.5" /> {t("topbar.markAllRead")}
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {(notifications?.notifications ?? []).slice(0, 6).map((n) => (
                <Link
                  key={n.id}
                  href={n.meta?.taskId ? `/p/${n.meta.projectId}?task=${n.meta.taskId}` : "/notifications"}
                  className={cn(
                    "flex flex-col gap-0.5 border-b border-border px-3 py-2.5 text-sm transition hover:bg-accent",
                    !n.readAt && "bg-primary/5"
                  )}
                >
                  <span className="line-clamp-2">
                    <b className="font-medium">{n.meta?.actorName ?? "Someone"}</b>{" "}
                    {notificationSentence(n)}
                  </span>
                  <span className="text-xs text-muted-foreground">{relativeTime(n.createdAt, locale)}</span>
                </Link>
              ))}
              {notifications && notifications.notifications.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("topbar.caughtUp")}</p>
              )}
            </div>
            <Link
              href="/notifications"
              className="block border-t border-border px-3 py-2 text-center text-sm font-medium text-primary transition hover:bg-accent"
            >
              {t("topbar.viewAll")}
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-lg p-0.5 transition hover:bg-accent" aria-label="Account menu">
              <Avatar
                name={session?.user?.name ?? "?"}
                src={session?.user?.image}
                className="h-8 w-8"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium">{session?.user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon /> {t("topbar.profileSettings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/notifications")}>
              <Settings /> {t("common.notifications")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem danger onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut /> {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
