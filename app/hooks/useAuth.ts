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

  // Apply API interceptors
  useApiInterceptors();

  const logout = async () => {
    console.log("Logging out user");
    try {
      // Call backend logout endpoint to invalidate refresh token
      if (session?.user?.refreshToken) {
        await clientApiService.auth.logout(session.user.refreshToken);
      }

      // Clear next-auth session cookies (no need for access/refresh cookies)
      Cookies.remove("next-auth.session-token");
      Cookies.remove("__Secure-next-auth.session-token");

      // Clear next-auth session
      await signOut({ redirect: false });

      setIsAuthenticated(false);
      setUser(null);

      console.log("Logout successful, redirecting to /user/login");
      router.push("/user/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      router.push("/user/login");
    }
  };

  useEffect(() => {
  const checkAuth = async () => {
    setIsLoading(status === "loading");
    console.log("Checking auth, sessionStatus:", status);

    if (status === "authenticated" && session?.user) {
      const customUser = session.user as CustomUser;
      console.log("Authenticated user:", customUser);

      if (customUser.role !== "user" && customUser.role !== "admin") {
        console.log("Invalid role, logging out");
        logout();
        return;
      }

      try {
        const response = await clientApiService.user.getProfile();
        const profileData = response.data;

        // Check if profileData is valid
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
      } catch (error) {
        console.error("Profile fetch failed:", error);
        logout();
      }
    } else if (status === "unauthenticated") {
      console.log("No session, setting unauthenticated");
      setIsAuthenticated(false);
      setUser(null);
    }

    setIsLoading(false);
  };

  checkAuth();
}, [status, session, router]);

  return { user, isAuthenticated, isLoading, logout };
};

export default useAuth;