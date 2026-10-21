"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut, Moon, Sun } from "lucide-react";
import { useUpdateAccount } from "@/lib/hooks";
import { useTheme } from "@/components/providers";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/dictionary";
import { Avatar, Button, Card, Input, Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const update = useUpdateAccount();
  const router = useRouter();

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setName(session?.user?.name ?? "");
    setImage(session?.user?.image ?? "");
  }, [session?.user?.name, session?.user?.image]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ name, image: image || null });
      toast.success(t("settings.profileUpdated"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ currentPassword, newPassword });
      toast.success(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function switchLocale(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

      {/* Profile */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={session?.user?.name ?? "?"} src={image || session?.user?.image} className="h-14 w-14 text-lg" />
          <div>
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="name">{t("settings.displayName")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </div>
          <div>
            <Label htmlFor="avatar">{t("settings.avatarUrl")}</Label>
            <Input id="avatar" type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
          </div>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("settings.saveProfile")}
          </Button>
        </form>
      </Card>

      {/* Password */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold">{t("settings.changePassword")}</h2>
        <form onSubmit={changePassword} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="current">{t("settings.currentPassword")}</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="new">{t("settings.newPassword")}</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("settings.updatePassword")}
          </Button>
        </form>
      </Card>

      {/* Appearance & language */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold">{t("settings.appearance")}</h2>

        {/* Language */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5">
          <span className="text-sm">{t("settings.language")}</span>
          <div className="flex gap-1 rounded-lg bg-card p-1">
            <button
              onClick={() => switchLocale("en")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                locale !== "tr" && "bg-accent"
              )}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => switchLocale("tr")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                locale === "tr" && "bg-accent"
              )}
            >
              🇹🇷 Türkçe
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5">
          <span className="text-sm">{t("settings.theme")}</span>
          <div className="flex gap-1 rounded-lg bg-card p-1">
            <button
              onClick={() => theme === "dark" && toggleTheme()}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                theme !== "dark" && "bg-accent"
              )}
            >
              <Sun className="h-3.5 w-3.5" /> {t("settings.light")}
            </button>
            <button
              onClick={() => theme !== "dark" && toggleTheme()}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                theme === "dark" && "bg-accent"
              )}
            >
              <Moon className="h-3.5 w-3.5" /> {t("settings.dark")}
            </button>
          </div>
        </div>
      </Card>

      {/* Session */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t("settings.session")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("settings.signedInAs", { email: session?.user?.email ?? "" })}</p>
          </div>
          <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="h-4 w-4" /> {t("common.signOut")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
