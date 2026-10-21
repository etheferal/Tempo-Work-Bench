import Link from "next/link";
import {
  KanbanSquare,
  Users,
  Command,
  Activity,
  Moon,
  BarChart3,
  CalendarRange,
  Paperclip,
  Github,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getServerLocale, serverT } from "@/lib/i18n-server";
import type { TranslationKey } from "@/lib/dictionary";

const STACK = [
  "Next.js 14",
  "TypeScript",
  "Prisma",
  "SQLite",
  "NextAuth",
  "React Query",
  "@dnd-kit",
  "Zod",
  "Tailwind CSS",
  "Vitest",
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const locale = getServerLocale();
  const t = serverT(locale);

  const features: { key: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "landing.f1", icon: KanbanSquare },
    { key: "landing.f2", icon: CalendarRange },
    { key: "landing.f3", icon: Users },
    { key: "landing.f4", icon: Paperclip },
    { key: "landing.f5", icon: Command },
    { key: "landing.f6", icon: Activity },
    { key: "landing.f7", icon: BarChart3 },
    { key: "landing.f8", icon: Moon },
  ];
  const points: TranslationKey[] = [
    "landing.point1",
    "landing.point2",
    "landing.point3",
    "landing.point4",
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Tempo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg tracking-tight">Tempo</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {t("landing.openDashboard")} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex h-9 items-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {t("landing.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  {t("landing.getStart")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] opacity-60"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-2 lg:items-center lg:pt-28">
          <div className="animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t("landing.badge")}
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">{t("landing.heroDesc")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {!user && (
                <Link
                  href="/register"
                  className="flex h-11 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
                >
                  {t("landing.ctaPrimary")} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/login"
                className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-6 font-medium transition hover:bg-accent"
              >
                {t("landing.ctaDemo")}
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("landing.demoHint")}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">demo@tempo.app</code> /{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">demo1234</code>
            </p>
          </div>

          {/* Board mock */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent blur-2xl" />
            <div className="relative rounded-xl border border-border bg-card p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Backlog", cards: ["Research competitors", "Design pricing page"] },
                  { name: "In Progress", cards: ["Responsive navigation", "Refactor tokens"] },
                  { name: "Done", cards: ["Migrate blog to MDX", "Wire up contact form"] },
                ].map((col) => (
                  <div key={col.name} className="rounded-lg bg-muted/60 p-2.5">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">{col.name}</p>
                    <div className="space-y-2">
                      {col.cards.map((card) => (
                        <div
                          key={card}
                          className="rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-sm"
                        >
                          {card}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">{t("landing.featuresTitle")}</h2>
          <p className="mx-auto mt-3 max-w-md text-center text-muted-foreground">{t("landing.featuresDesc")}</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.key}
                className="rounded-xl border border-border bg-card p-6 transition hover:shadow-lg hover:shadow-border/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{t(`${f.key}.title` as TranslationKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`${f.key}.desc` as TranslationKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("landing.stackTitle")}
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
          <div className="mx-auto mt-10 grid max-w-xl gap-2 text-left">
            {points.map((point) => (
              <div key={point} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p className="text-sm text-muted-foreground">{t(point)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-6 w-6 rounded-md" />
            <span>{t("landing.footerLeft")}</span>
          </div>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition hover:text-foreground"
          >
            <Github className="h-4 w-4" /> {t("landing.footerRight")}
          </a>
        </div>
      </footer>
    </div>
  );
}
