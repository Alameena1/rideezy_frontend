"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clientApiService, useApiInterceptors } from "@/services/client/client-api";

interface User {
  _id: string;
  driverId?: string;
  email?: string;
  name?: string;
  fullName?: string;
  role: "user" | "admin";
}

interface CustomUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "user" | "admin";
  accessToken: string;
  refreshToken?: string;
}

const useAuth = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useApiInterceptors();

  const logout = async () => {
    console.log("Logging out user");
    try {
      if (session?.user?.refreshToken) {
        await clientApiService.auth.logout(session.user.refreshToken);
      }
      await signOut({ redirect: false });
      setIsAuthenticated(false);
      setUser(null);
      console.log("Logout successful, redirecting to /user/login");
      router.replace("/user/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      router.replace("/user/login");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      console.log("Checking auth, sessionStatus:", status, { session: session ? "present" : "missing" });

      if (status === "loading") {
        setIsLoading(true);
        return;
      }

      if (status === "authenticated" && session?.user) {
        const customUser = session.user as CustomUser;
        console.log("Authenticated user:", {
          id: customUser.id,
          email: customUser.email,
          role: customUser.role,
          accessToken: customUser.accessToken ? "present" : "missing",
          refreshToken: customUser.refreshToken ? "present" : "missing",
        });

        if (customUser.role !== "user" && customUser.role !== "admin") {
          console.log("Invalid role, logging out");
          logout();
          return;
        }

        // Check for admin routes
        const isAdminRoute = window.location.pathname.startsWith("/admin");
        if (isAdminRoute && customUser.role !== "admin") {
          console.log("Non-admin user attempting to access admin route, redirecting to /");
          router.replace("/?error=Unauthorized%20access");
          return;
        }

        try {
          console.log("Fetching user profile...");
          const response = await clientApiService.user.getProfile();
          const profileData = response.data;
          console.log("Profile fetch response:", profileData);

          if (profileData && profileData._id) {
            if (profileData.status === "Blocked") {
              console.log("User is blocked, logging out");
              logout();
              return;
            }

            const newUser: User = {
              _id: profileData._id || customUser.id,
              driverId: customUser.id,
              email: profileData.email || customUser.email,
              name: profileData.fullName || profileData.name || customUser.name,
              fullName: profileData.fullName || profileData.name || customUser.email,
              role: customUser.role,
            };
            console.log("Setting user from profile data:", newUser);
            setUser(newUser);
            setIsAuthenticated(true);
          } else {
            console.warn("Invalid profile data response:", profileData);
            throw new Error("Invalid profile data");
          }
        } catch (error: any) {
          console.error("Profile fetch failed:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
          setIsAuthenticated(false);
          setUser(null);
          if (error.response?.status === 401) {
            router.replace("/user/login?error=Session%20expired");
          } else {
            router.replace("/user/login?error=Failed%20to%20fetch%20profile");
          }
        }
      } else if (status === "unauthenticated") {
        console.log("No session, setting unauthenticated");
        setIsAuthenticated(false);
        setUser(null);
        if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/user")) {
          router.replace("/user/login?error=Please%20log%20in%20to%20access%20this%20page");
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [status, session, router]);

  return { user, isAuthenticated, isLoading, logout };
};

export default useAuth;