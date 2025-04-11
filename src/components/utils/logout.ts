"use client";

import { signOut } from "next-auth/react";

export const handleClientLogout = () => {
  signOut({ callbackUrl: "/login" });
};
