// middleware.ts
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
    return NextResponse.next();
  }



  // const userToken = request.cookies.get("authToken")?.value;
  // if (!userToken && isUserRoute) {
  //   return NextResponse.redirect(new URL("/user/login", request.url));
  // }



  // // Check admin authentication
  // const adminToken = request.cookies.get("adminAuthToken")?.value;
  // if (!adminToken && isAdminRoute) {
  //   return NextResponse.redirect(new URL("/admin/login", request.url));
  // }

  return NextResponse.next();
}


export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
