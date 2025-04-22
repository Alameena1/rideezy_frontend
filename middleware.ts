import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/user");


  if (
    pathname === "/admin/login" ||
    pathname === "/user/login" ||
    pathname === "/user/signup" ||
    pathname === "/user/otp"
  ) {
    const userToken = request.cookies.get("accessToken")?.value;
    if (userToken) {
      const referrer = request.headers.get("referer") || "/"; 
      const redirectUrl = new URL(referrer, request.url);
  
      if (redirectUrl.pathname.startsWith("/user")) {
        return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next(); 
  }

  const userToken = request.cookies.get("accessToken")?.value;
  if (isUserRoute && !userToken) {
    return NextResponse.redirect(new URL("/user/login", request.url));
  }

  const adminToken = request.cookies.get("adminAuthToken")?.value;
  if (isAdminRoute && !adminToken) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};