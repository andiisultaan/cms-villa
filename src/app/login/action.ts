"use server";

import { getUserByUsername } from "@/db/models/user";
import { compareTextWithHash } from "@/db/utils/bcrypt";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { z } from "zod";

// Define the return type for better type safety
type LoginResult = { error: string; success?: undefined } | { success: string; error?: undefined };

// Update the function signature to accept prevState
export const handleLogin = async (prevState: LoginResult | null, formData: FormData): Promise<LoginResult> => {
  const loginInputSchema = z.object({
    username: z.string().min(1, { message: "Username is required" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  });

  const username = formData.get("username");
  const password = formData.get("password");

  const parsedData = loginInputSchema.safeParse({ username, password });

  if (!parsedData.success) {
    const errPath = parsedData.error.issues[0].path[0];
    const errMessage = parsedData.error.issues[0].message;
    const errFinalMessage = `${errPath} - ${errMessage}`;

    return { error: errFinalMessage };
  }

  const user = await getUserByUsername(parsedData.data.username);

  if (!user || !compareTextWithHash(parsedData.data.password, user.password)) {
    return { error: "Invalid Credentials" };
  }

  const payload = {
    id: user._id,
    username: user.username,
  };

  const token = signToken(payload);

  cookies().set("token", token, {
    httpOnly: true,
    secure: false,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    sameSite: "strict",
  });

  return { success: "Login successful" };
};
