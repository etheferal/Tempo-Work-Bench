import type { Metadata } from "next";
import Providers from "@/components/providers";
import { getServerLocale } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tempo — Project & task management platform",
    template: "%s · Tempo",
  },
  description:
    "Tempo is a modern, full-stack project management platform: kanban boards, teams, activity feeds, analytics and a command palette — built with Next.js, Prisma and TypeScript.",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Tempo — Project & task management platform",
    description:
      "Kanban boards, team workspaces, invites, notifications, analytics and ⌘K — in one open-source platform.",
    type: "website",
  },
};

// Prevents theme flash before hydration
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("tempo-theme");
    var dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
