import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { verify } from "argon2";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Auth.js v5 note (see docs/architecture.md §2.3): the Credentials provider
 * does not support the adapter's database session strategy, so this uses JWT
 * sessions instead. Immediate revocation (required for suspend/ban) is
 * recovered by re-checking the user's live status/role from the database on
 * every `session` callback invocation — a suspended user's *next* request
 * gets a null session even though the JWT itself hasn't expired.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await verify(user.passwordHash, parsed.data.password);
        if (!valid) return null;

        if (user.status !== "ACTIVE") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return session;

      // Live re-check on every request: catches suspend/ban/role changes
      // without waiting for JWT expiry.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { id: true, status: true, role: true, username: true, email: true },
      });

      if (!dbUser || dbUser.status !== "ACTIVE") {
        return { ...session, user: undefined, expires: session.expires };
      }

      session.user = {
        ...session.user,
        id: dbUser.id,
        role: dbUser.role,
        name: dbUser.username,
        email: dbUser.email,
      };
      return session;
    },
  },
});
