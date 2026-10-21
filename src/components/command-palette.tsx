"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Bell,
  CornerDownLeft,
  FolderKanban,
  Languages,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useSearch, useWorkspaces } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/dictionary";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ReactNode;
  action: () => void;
}

const ICONS = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  workspace: <FolderKanban className="h-4 w-4" />,
  project: <FolderKanban className="h-4 w-4" />,
  task: <BarChart3 className="h-4 w-4" />,
  notifications: <Bell className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  theme: <Moon className="h-4 w-4" />,
  language: <Languages className="h-4 w-4" />,
  signout: <LogOut className="h-4 w-4" />,
};

export default function CommandPalette() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: workspaces } = useWorkspaces();
  const searchResults = useSearch(query).data;

  // Global shortcut: ⌘K / Ctrl+K toggles, Escape closes
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("tempo:open-command", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("tempo:open-command", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus after the dialog mounts
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = [
      { id: "nav-dashboard", label: t("common.dashboard"), group: t("palette.groupNavigation"), icon: ICONS.dashboard, action: () => router.push("/dashboard") },
      { id: "nav-notif", label: t("common.notifications"), group: t("palette.groupNavigation"), icon: ICONS.notifications, action: () => router.push("/notifications") },
      { id: "nav-settings", label: t("common.settings"), group: t("palette.groupNavigation"), icon: ICONS.settings, action: () => router.push("/settings") },
    ];
    const actions: PaletteItem[] = [
      {
        id: "act-theme",
        label: t("palette.switchTheme", { mode: theme === "dark" ? t("palette.lightMode") : t("palette.darkMode") }),
        group: t("palette.groupActions"),
        icon: theme === "dark" ? ICONS.theme : <Sun className="h-4 w-4" />,
        action: toggleTheme,
      },
      {
        id: "act-language",
        label: t("palette.changeLanguage"),
        hint: locale === "en" ? "TR" : "EN",
        group: t("palette.groupActions"),
        icon: ICONS.language,
        action: () => setLocale(locale === "en" ? ("tr" as Locale) : ("en" as Locale)),
      },
      { id: "act-signout", label: t("common.signOut"), group: t("palette.groupActions"), icon: ICONS.signout, action: () => signOut({ callbackUrl: "/" }) },
    ];
    const wsItems: PaletteItem[] =
      workspaces?.map((ws) => ({
        id: `ws-${ws.id}`,
        label: ws.name,
        hint: "Workspace",
        group: t("palette.groupWorkspaces"),
        icon: ICONS.workspace,
        action: () => router.push(`/w/${ws.slug}`),
      })) ?? [];

    const search: PaletteItem[] = [];
    if (searchResults) {
      for (const p of searchResults.projects.slice(0, 4)) {
        search.push({
          id: `sp-${p.id}`,
          label: p.name,
          hint: p.workspaceName,
          group: t("palette.groupProjects"),
          icon: ICONS.project,
          action: () => router.push(`/p/${p.id}`),
        });
      }
      for (const tk of searchResults.tasks.slice(0, 6)) {
        search.push({
          id: `st-${tk.id}`,
          label: tk.title,
          hint: tk.projectName,
          group: t("palette.groupTasks"),
          icon: ICONS.task,
          action: () => router.push(`/p/${tk.projectId}?task=${tk.id}`),
        });
      }
    }

    return [...nav, ...actions, ...wsItems, ...search];
  }, [router, workspaces, searchResults, theme, toggleTheme, locale, setLocale, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.group !== t("palette.groupProjects") && i.group !== t("palette.groupTasks"));
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q));
  }, [items, query, t]);

  useEffect(() => setActiveIndex(0), [query]);

  function run(item: PaletteItem) {
    setOpen(false);
    item.action();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) run(item);
    }
  }

  if (!open) return null;

  let lastGroup = "";
  const rendered = filtered.map((item, index) => {
    const showGroup = item.group !== lastGroup;
    lastGroup = item.group;
    return (
      <div key={item.id}>
        {showGroup && (
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item.group}
          </p>
        )}
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
            index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => run(item)}
        >
          <span className="text-muted-foreground">{item.icon}</span>
          <span className="truncate">{item.label}</span>
          {item.hint && <span className="ml-auto truncate text-xs text-muted-foreground">{item.hint}</span>}
          {index === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </button>
      </div>
    );
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-label="Command palette"
        className="relative w-[min(94vw,36rem)] animate-scale-in overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("palette.placeholder")}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {rendered.length > 0 ? (
            rendered
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("palette.noResults")} &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
