import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const middleware = async (request: NextRequest) => {
  if (request.url.includes("/")) {
    const cookieStore = cookies();
    const token = cookieStore.get("token");
    const loginUrl = new URL("/login", request.url);
    if (!token?.value) {
      NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
      return NextResponse.redirect(loginUrl);
    }
  }
};
