import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/admin/login",
  "/user/login",
  "/user/signup",
  "/user/otp",
  "/user/forgot-password",
  "/user/reset-password",
  "/",
  "/about",
  "/contact",
];

const authRoutes = ["/user/login", "/user/signup", "/admin/login"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl?.pathname ?? "";
  
  if (!pathname) {
    console.error("Middleware: pathname is undefined or null", { 
      url: request.url,
      nextUrl: request.nextUrl 
    });
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin") && !publicRoutes.includes(pathname);
  const isUserRoute = pathname.startsWith("/user") && !publicRoutes.includes(pathname);
  const isPublicRoute = publicRoutes.includes(pathname) ||
    publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.includes(pathname);

  console.log("Middleware:", {
    pathname,
    isAdminRoute,
    isUserRoute,
    isPublicRoute,
    isAuthRoute,
    cookies: Object.fromEntries(
      request.cookies.getAll().map(cookie => [cookie.name, cookie.value])
    ),
  });

  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                      request.cookies.get('__Secure-next-auth.session-token')?.value ||
                      request.cookies.get('accessToken')?.value;

  if (isPublicRoute && !isAuthRoute) {
    console.log("Middleware: Allowing public route:", pathname);
    return NextResponse.next();
  }

  if (isAuthRoute && sessionToken) {
    console.log("Middleware: Authenticated user trying to access auth route, redirecting", { pathname, sessionToken });
    if (pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (pathname === "/user/login" || pathname === "/user/signup") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if ((isUserRoute || isAdminRoute) && !sessionToken) {
    console.log("Middleware: No session token, redirecting to login", { pathname });
    if (isUserRoute) {
      const loginUrl = new URL("/user/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    } else if (isAdminRoute) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  console.log("Middleware: Allowing request to proceed", { pathname });
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/user/:path*",
    "/profile/:path*",
    "/dashboard/:path*",
  ],
};