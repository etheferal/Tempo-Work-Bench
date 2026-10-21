import Link from "next/link";
import type { ReactNode } from "react";

/** Split-screen shell for /login and /register. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <Link href="/" className="mb-10 flex items-center justify-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Tempo" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-semibold tracking-tight">Tempo</span>
          </Link>
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Tempo — open source under MIT
        </p>
      </div>

      {/* Gradient side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]"
        />
        <div className="absolute inset-0 flex flex-col justify-center gap-6 p-14 text-white">
          <blockquote className="max-w-md text-2xl font-medium leading-snug drop-shadow">
            &ldquo;Tempo keeps our kanban boards fast, our history clear, and our ⌘K muscle happy.&rdquo;
          </blockquote>
          <div className="space-y-3 text-white/85">
            {[
              "Workspaces with roles & invite links",
              "Optimistic drag & drop boards",
              "Activity feed, notifications & analytics",
            ].map((line) => (
              <p key={line} className="flex items-center gap-3 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
