"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAcceptInvite, useInviteInfo } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/primitives";

export default function JoinForm({ token }: { token: string }) {
  const { data } = useInviteInfo(token);
  const accept = useAcceptInvite();
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  async function acceptInvite() {
    setError(null);
    try {
      const res = await accept.mutateAsync(token);
      toast.success(t("join.welcomed"));
      router.push(`/w/${res.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("join.acceptFailed"));
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
      <h1 className="text-lg font-semibold">
        {t("join.question", { name: data?.workspaceName ?? "…" })}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("join.invitedBy", {
          name: data?.inviterName ?? t("join.inviterFallback"),
          role: (data?.role ?? t("join.roleFallback")).toLowerCase(),
        })}
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <Button onClick={acceptInvite} disabled={accept.isPending} className="mt-6 w-full">
        {accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("join.accept")}
      </Button>
    </div>
  );
}
