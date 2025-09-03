import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/user");

  console.log("Middleware:", { pathname, isAdminRoute, isUserRoute });

  // Handle public routes (login, signup, etc.)
  if (
    pathname === "/admin/login" ||
    pathname === "/user/login" ||
    pathname === "/user/signup" ||
    pathname === "/user/otp" ||
    pathname === "/user/forgot-password" ||
    pathname === "/user/reset-password"
  ) {
    const userToken = request.cookies.get("accessToken")?.value;
    const adminToken = request.cookies.get("adminAuthToken")?.value;
    console.log("Public page:", { pathname, userToken, adminToken });

    // Redirect authenticated admins to admin dashboard
    if (pathname === "/admin/login" && adminToken) {
      console.log("Admin already logged in, redirecting to admin dashboard");
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // Redirect authenticated users to homepage if logged in
    const referer = request.headers.get("referer") || "/";
    if (
      (pathname === "/user/login" || pathname === "/user/signup" || pathname === "/user/otp") &&
      userToken
    ) {
      console.log("User already logged in, redirecting to referer or homepage");
      return NextResponse.redirect(new URL(referer.split("/user/login")[0] || "/", request.url));
    }

    return NextResponse.next();
  }

  // Protect user routes: redirect to login if no user token
  const userToken = request.cookies.get("accessToken")?.value;
  if (isUserRoute && !userToken && !pathname.includes("login") && !pathname.includes("signup") && !pathname.includes("otp") && !pathname.includes("forgot-password") && !pathname.includes("reset-password")) {
    console.log("No user token, redirecting to user login");
    return NextResponse.redirect(new URL("/user/login", request.url));
  }

  // Protect admin routes: redirect to admin login if no admin token
  const adminToken = request.cookies.get("adminAuthToken")?.value;
  console.log("Admin route check:", { isAdminRoute, adminToken, cookies: request.cookies.getAll() });
  if (isAdminRoute && !adminToken && !pathname.includes("login")) {
    console.log("No admin token, redirecting to admin login");
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};