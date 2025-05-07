import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react"; // Added import for React
import { AuthProvider } from "@/components/auth-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export const fetchCache = "force-no-store";

const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Gonjong Harau | Administration",
  description: "Manage your villa reservations",
  icons: {
    icon: "/assets/logo.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <AuthProvider session={session}>{children}</AuthProvider>
      </body>
    </html>
  );
}
