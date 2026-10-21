import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerLocale, serverT } from "@/lib/i18n-server";
import JoinForm from "./join-form";

export const metadata = { title: "Join workspace" };

export default async function JoinPage({ params }: { params: { token: string } }) {
  const session = await getServerSession(authOptions);
  const t = serverT(getServerLocale());

  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { workspace: true, inviter: true },
  });

  const invalid = !invite || invite.acceptedAt !== null || invite.expiresAt < new Date();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Tempo" className="h-14 w-14 rounded-xl" />

      {invalid ? (
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">{t("join.invalid")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("join.invalidDesc")}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {t("join.goToTempo")}
          </Link>
        </div>
      ) : !session?.user ? (
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">{t("join.invitedTo", { name: invite.workspace.name })}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("join.invitedBy", { name: invite.inviter.name, role: invite.role.toLowerCase() })}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/login?callbackUrl=/join/${params.token}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground"
            >
              {t("join.signInAccept")}
            </Link>
            <Link
              href={`/register?callbackUrl=/join/${params.token}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border font-medium"
            >
              {t("join.createAccount")}
            </Link>
          </div>
        </div>
      ) : (
        <JoinForm token={params.token} />
      )}
    </div>
  );
}
