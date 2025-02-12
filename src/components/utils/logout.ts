"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const handleLogout = async () => {
  const cookieStore = cookies();
  cookieStore.get("token");
  cookieStore.delete("token");

  redirect("/login");
};
