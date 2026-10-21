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
import { registerSchema, type RegisterInput } from "@/lib/validations";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setApiError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setApiError(body.error ?? "Could not create your account");
      return;
    }
    // Auto sign-in
    const session = await signIn("credentials", { email: values.email, password: values.password, redirect: false });
    if (session?.error) {
      router.push("/login");
      return;
    }
    toast.success(t("auth.accountCreated"));
    router.push("/dashboard");
    router.refresh();
  }

  const inputCls =
    "flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.registerTitle")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.registerPrompt")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            {t("common.name")}
          </label>
          <input id="name" autoComplete="name" placeholder="Ada Lovelace" className={inputCls} {...register("name")} />
          {errors.name && <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {t("common.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={inputCls}
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
            autoComplete="new-password"
            placeholder={t("auth.passwordHint")}
            className={inputCls}
            {...register("password")}
          />
          {errors.password && <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>}
        </div>

        {apiError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{apiError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth.createAccount")}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
