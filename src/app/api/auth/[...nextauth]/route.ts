import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "username", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log(`NextAuth authorize attempt for: ${credentials?.username}`);

          // Panggil API login
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: credentials?.username,
              password: credentials?.password,
            }),
          });

          const data = await res.json();

          console.log(`API response status: ${res.status}`);
          console.log(`API response data:`, data);

          // Jika respons tidak ok atau ada error dalam respons
          if (!res.ok || data.error) {
            console.error("Auth error:", data.error || "Unknown error");
            return null;
          }

          // Pastikan user memiliki semua properti yang diperlukan
          if (data && data.id && data.username) {
            console.log(`NextAuth authorize successful for: ${data.username}, role: ${data.role}`);
            return data;
          }

          console.log("User data incomplete:", data);
          return null;
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Menambahkan data user ke token JWT
      if (user) {
        console.log(`JWT callback - adding user data to token for: ${user.username}`);
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      // Menambahkan data user dari token ke session
      if (token && session.user) {
        console.log(`Session callback - adding token data to session for: ${token.username}`);
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
