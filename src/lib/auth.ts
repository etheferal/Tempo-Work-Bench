import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "./validations";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "tempo-dev-secret-do-not-use-in-production",
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: { email: { label: "Email" }, password: { label: "Password" } },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      return session;
    },
  },
};

/** Returns the logged-in user (id, name, email) or null. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
