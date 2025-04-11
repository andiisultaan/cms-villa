import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserByUsername } from "@/db/models/user";
import { compareTextWithHash } from "@/db/utils/bcrypt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      console.log("Missing username or password");
      return NextResponse.json({ error: "Username dan password diperlukan" }, { status: 400 });
    }

    // Find user by username from database
    const user = await getUserByUsername(username);

    // If user not found
    if (!user) {
      console.log(`User not found: ${username}`);
      return NextResponse.json({ error: "Username salah" }, { status: 401 });
    }

    // Verify password using bcryptjs
    const isPasswordValid = compareTextWithHash(password, user.password);

    // If password is wrong
    if (!isPasswordValid) {
      console.log(`Invalid password for user: ${username}`);
      return NextResponse.json({ error: "password salah" }, { status: 401 });
    }

    // Create user object without password to store in token
    const userWithoutPassword = {
      id: user._id.toString(),
      username: user.username,
      role: user.role || "user", // Default role if none exists
    };

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat login",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
