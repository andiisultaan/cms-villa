import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { verifyTokenJose } from "./lib/jwt";

const middleware = async (request: NextRequest) => {
  const cookieStore = cookies();
  const token = cookieStore.get("token");
  const loginUrl = new URL("/login", request.url);

  // Add custom header to all API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // For API routes, just pass through without modifying
    return NextResponse.next();
  }

  // Allow access to login page without a token
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // Check for token on all other routes
  if (!token?.value) {
    return NextResponse.redirect(loginUrl);
  }

  let tokenData;

  try {
    tokenData = await verifyTokenJose<{ id: string; username: string }>(token.value);
  } catch (error) {
    return NextResponse.redirect(loginUrl);
  }

  // Specific handling for /add-user route
  if (request.nextUrl.pathname === "/add-user") {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", tokenData.id);
    requestHeaders.set("x-user-username", tokenData.username);
    return NextResponse.next({
      headers: requestHeaders,
    });
  }

  // For all other routes, allow access if token is valid
  return NextResponse.next();
};

export default middleware;

// Apply this middleware to all routes except static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/api/:path*", // Include API routes
  ],
};
