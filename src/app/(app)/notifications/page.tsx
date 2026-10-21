"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications, useMarkNotifications } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { tr as trLocale } from "date-fns/locale";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotifications();
  const { locale, t } = useI18n();

  const notifications = data?.notifications ?? [];
  const today = format(new Date(), "yyyy-MM-dd");
  const todayItems = notifications.filter((n) => format(parseISO(n.createdAt), "yyyy-MM-dd") === today);
  const earlierItems = notifications.filter((n) => format(parseISO(n.createdAt), "yyyy-MM-dd") !== today);

  function sentence(n: (typeof notifications)[number]) {
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
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("common.notifications")}</h1>
        {(data?.unreadCount ?? 0) > 0 && (
          <Button variant="outline" size="sm" onClick={() => markRead.mutate({ all: true })}>
            {t("notif.markAll")}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <EmptyState icon={Bell} title={t("notif.empty")} description={t("notif.emptyDesc")} />
      )}

      {(["today", "earlier"] as const).map((section) => {
        const items = section === "today" ? todayItems : earlierItems;
        if (items.length === 0) return null;
        return (
          <div key={section}>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {section === "today" ? t("notif.today") : t("notif.earlier")}
            </p>
            <Card className="divide-y divide-border overflow-hidden">
              {items.map((n) => (
                <Link
                  key={n.id}
                  href={n.meta?.taskId ? `/p/${n.meta.projectId}?task=${n.meta.taskId}` : "/dashboard"}
                  className={cn("block px-4 py-3.5 transition hover:bg-accent/50", !n.readAt && "bg-primary/5")}
                  onClick={() => !n.readAt && markRead.mutate({ id: n.id })}
                >
                  <p className="text-sm">
                    <b className="font-medium">{n.meta?.actorName ?? "Someone"}</b> {sentence(n)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(parseISO(n.createdAt), "d MMM yyyy · HH:mm", { locale: locale === "tr" ? trLocale : undefined })}
                  </p>
                </Link>
              ))}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
