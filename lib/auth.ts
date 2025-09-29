// lib/auth.ts (excerpt)
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { getPool, sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        // Fetch user record
        const pool = await getPool();
        const rs = await pool.request().input("email", sql.NVarChar(255), email)
          .query(`
            select id, email, full_name, role, password_hash
            from dbo.Users
            where email = @email
          `);

        const user = rs.recordset?.[0];
        if (!user) return null;

        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) return null;

        // Return a safe user object for JWT/session
        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.name = (user as any).name;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).role = token.role;
      if (session.user) {
        session.user.name = String(token.name ?? session.user.name ?? "");
      }
      return session;
    },
  },
};
