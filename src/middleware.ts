import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const loginUrl = new URL("/login", request.url);

  // Handle API routes
  if (path.startsWith("/api/") && !path.startsWith("/api/auth/") && path !== "/api/login") {
    // Exclude login endpoint
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", token.id as string);
      requestHeaders.set("x-user-username", token.username as string);
      requestHeaders.set("x-user-role", token.role as string);

      return NextResponse.next({
        headers: requestHeaders,
      });
    } catch (error) {
      console.error("Middleware error:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  }

  // Allow access to login page and NextAuth API routes without authentication
  if (path === "/login" || path === "/register" || path.startsWith("/api/auth/") || path.includes("_next") || path.includes("favicon.ico") || path === "/api/login") {
    return NextResponse.next();
  }

  // Check for token on all other routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // Save the original URL to redirect back after login
    const callbackUrl = encodeURIComponent(request.nextUrl.pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  try {
    // Add user data to headers for all routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", token.id as string);
    requestHeaders.set("x-user-username", token.username as string);
    requestHeaders.set("x-user-role", token.role as string);

    // Check role-based access for specific routes
    if (path.startsWith("/report") && token.role !== "admin" && token.role !== "owner") {
      // Redirect to dashboard if user doesn't have access
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next({
      headers: requestHeaders,
    });
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(loginUrl);
  }
}

// Apply this middleware to all routes except static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/api/:path*", // Include API routes
  ],
};
