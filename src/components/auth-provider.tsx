"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type React from "react";

export function AuthProvider({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

// Hook untuk menggunakan autentikasi
export { useSession as useAuth } from "next-auth/react";
