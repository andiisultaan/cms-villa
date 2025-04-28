import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Define constants for better maintainability
const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/login"];
const STATIC_PATHS = ["_next", "favicon.ico"];

// Helper function to check if a path is public
const isPublicPath = (path: string): boolean => {
  return PUBLIC_PATHS.some(publicPath => path === publicPath || path.startsWith(publicPath + "/")) || STATIC_PATHS.some(staticPath => path.includes(staticPath));
};

// Helper function to add user data to headers
const addUserDataToHeaders = (request: NextRequest, token: any) => {
  const requestHeaders = new Headers(request.headers);

  // Only set headers if the values exist in the token
  if (token.id) requestHeaders.set("x-user-id", token.id as string);
  if (token.username) requestHeaders.set("x-user-username", token.username as string);
  if (token.role) requestHeaders.set("x-user-role", token.role as string);

  return requestHeaders;
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow access to public paths without authentication
  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  try {
    // Get token for authentication
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Handle unauthenticated requests
    if (!token) {
      // For API routes, return 401 Unauthorized
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 });
      }

      // For page routes, redirect to login with callback URL
      const callbackUrl = encodeURIComponent(request.nextUrl.pathname);
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
    }

    // Add user data to headers
    const requestHeaders = addUserDataToHeaders(request, token);

    // Handle role-based access control
    if (path.startsWith("/report") && token.role !== "admin" && token.role !== "owner") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Continue with the request with added headers
    return NextResponse.next({
      headers: requestHeaders,
    });
  } catch (error) {
    console.error("Middleware authentication error:", error);

    // For API routes, return 500 Internal Server Error
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    // For page routes, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Apply this middleware to all routes except static files
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/api/:path*"],
};
