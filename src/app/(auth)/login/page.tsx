"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { loginSchema, type LoginInput } from "@/lib/validations";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setAuthError(null);
    const res = await signIn("credentials", { ...values, redirect: false });
    if (res?.error) {
      setAuthError(t("auth.invalid"));
      return;
    }
    toast.success(t("auth.welcomeBackToast"));
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.welcomeBack")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t("auth.signInPrompt")}{" "}
        <span className="text-foreground">
          {t("auth.demo")}{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">demo@tempo.app</code> /{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">demo1234</code>
        </span>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {t("common.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            {...register("email")}
          />
          {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            {t("common.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            {...register("password")}
          />
          {errors.password && <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>}
        </div>

        {authError && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{authError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth.signIn")}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("auth.createOne")}
        </Link>
      </p>
    </div>
  );
}
