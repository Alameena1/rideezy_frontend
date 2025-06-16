import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/user");

  console.log("Middleware:", { pathname, isAdminRoute, isUserRoute });

  // Handle login, signup, OTP, forgot-password, and reset-password routes
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

    // Redirect authenticated users to subscriptions page, unless on /user/login with a success message
    const successMessage = request.nextUrl.searchParams.get("success");
    if (
      (pathname === "/user/login" || pathname === "/user/signup" || pathname === "/user/otp") &&
      userToken &&
      !(pathname === "/user/login" && successMessage) // Allow /user/login with success message
    ) {
      console.log("User already logged in, redirecting to subscriptions page");
      return NextResponse.redirect(new URL("/user/subscription", request.url));
    }

    return NextResponse.next();
  }

  // Protect user routes: redirect to login if no user token
  const userToken = request.cookies.get("accessToken")?.value;
  if (isUserRoute && !userToken) {
    console.log("No user token, redirecting to user login");
    return NextResponse.redirect(new URL("/user/login", request.url));
  }

  // Protect admin routes: redirect to admin login if no admin token
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