import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/user");

  console.log("Middleware:", { pathname, isAdminRoute, isUserRoute });

  if (
    pathname === "/admin/login" ||
    pathname === "/user/login" ||
    pathname === "/user/signup" ||
    pathname === "/user/otp"
  ) {
    const userToken = request.cookies.get("accessToken")?.value;
    const adminToken = request.cookies.get("adminAuthToken")?.value;
    console.log("Login page:", { userToken, adminToken });

    if (pathname === "/admin/login" && adminToken) {
      console.log("Admin already logged in, redirecting to dashboard");
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (
      (pathname === "/user/login" || pathname === "/user/signup" || pathname === "/user/otp") &&
      userToken
    ) {
      console.log("User already logged in, redirecting to dashboard");
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const userToken = request.cookies.get("accessToken")?.value;
  if (isUserRoute && !userToken) {
    console.log("No user token, redirecting to user login");
    return NextResponse.redirect(new URL("/user/login", request.url));
  }

  const adminToken = request.cookies.get("adminAuthToken")?.value;
  console.log("Admin route check:", { isAdminRoute, adminToken, cookies: request.cookies.getAll() });
  if (isAdminRoute && !adminToken) {
    console.log("No admin token, redirecting to admin login");
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};