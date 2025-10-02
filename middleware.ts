import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const publicRoutes = [
  "/admin/login",
  "/user/login", 
  "/user/signup",
  "/user/otp",
  "/user/forgot-password",
  "/user/reset-password",
  "/auth/login",
  "/auth/error",
  "/",
  "/about",
  "/contact",
];

const authRoutes = ["/user/login", "/user/signup", "/admin/login", "/auth/login"];

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error("❌ JWT verification failed:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl?.pathname ?? "";
  
  if (!pathname) {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isUserRoute = pathname.startsWith("/user") && !publicRoutes.includes(pathname);
  const isPublicRoute = publicRoutes.includes(pathname) ||
    publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.includes(pathname);

  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                      request.cookies.get('__Secure-next-auth.session-token')?.value;

  console.log("🛡️ Middleware:", {
    pathname,
    isAdminRoute,
    isUserRoute,
    isPublicRoute,
    isAuthRoute,
    hasSessionToken: !!sessionToken,
  });

  // Allow public routes
  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Check if authenticated user is trying to access auth routes
  if (isAuthRoute && sessionToken) {
    console.log("🛡️ Authenticated user trying to access auth route", { pathname });
    
    const tokenData = await verifyJWT(sessionToken);
    const userRole = (tokenData as any)?.role;
    
    if (pathname === "/admin/login" && userRole === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if ((pathname === "/user/login" || pathname === "/auth/login") && userRole === "user") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Check for protected routes without session
  if ((isUserRoute || isAdminRoute) && !sessionToken) {
    console.log("🛡️ No session token, redirecting to login", { pathname });
    
    if (isUserRoute) {
      const loginUrl = new URL("/user/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("error", "Please%20log%20in%20to%20access%20this%20page");
      return NextResponse.redirect(loginUrl);
    } else if (isAdminRoute) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Check role-based access for admin routes
  if (isAdminRoute && sessionToken) {
    const tokenData = await verifyJWT(sessionToken);
    const userRole = (tokenData as any)?.role;
    
    if (userRole !== "admin") {
      console.log("🛡️ Non-admin user attempting to access admin route", { pathname, userRole });
      return NextResponse.redirect(new URL("/?error=Unauthorized%20access", request.url));
    }
  }

  console.log("🛡️ Allowing request to proceed", { pathname });
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/user/:path*", 
    "/profile/:path*",
    "/dashboard/:path*",
    "/auth/:path*",
  ],
};