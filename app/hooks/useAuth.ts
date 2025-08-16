"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiService } from "../../services/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { getValidToken, removeToken } from "@/app/utils/auth";

interface User {
  _id: string;
  driverId?: string;
  email?: string;
  name?: string;
  fullName?: string; 
}

const useAuth = () => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const logout = () => {
    console.log("Logging out user");
    removeToken();
    setIsAuthenticated(false);
    setUser(null);
    router.push("/user/login");
  };

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      console.log("Checking auth, sessionStatus:", sessionStatus);

      try {
        if (sessionStatus === "authenticated" && session?.user) {
          console.log("Google login detected, storing tokens");
          const accessToken = session.user.access_token;
          const refreshToken = session.user.refresh_token;
          let decodedUser: any = null;

          if (accessToken) {
            Cookies.set("accessToken", accessToken, {
              expires: 1,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              path: "/",
            });
            try {
              decodedUser = jwtDecode(accessToken);
              console.log("Decoded Google access token userId:", decodedUser?.userId || decodedUser?.sub);
            } catch (error) {
              console.error("Error decoding Google access token:", error);
            }
          }
          if (refreshToken) {
            Cookies.set("refreshToken", refreshToken, {
              expires: 7,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              path: "/",
            });
          }

          const newUser: User = {
            _id: decodedUser?.userId || decodedUser?.sub || session.user.id,
            driverId: decodedUser?.userId,
            email: session.user.email || decodedUser?.email,
            name: session.user.name,
            fullName: session.user.name, // Added for consistency
          };
          console.log("Setting user from Google login:", newUser);
          setUser(newUser);
          setIsAuthenticated(true);

          const profileData = await apiService.user.getProfile();
          if (profileData?.success && profileData.data) {
            if (profileData.data.status === "Blocked") {
              console.log("User is blocked, logging out");
              logout();
              return;
            }
          } else {
            console.warn("Invalid profile data response for Google login:", profileData);
            throw new Error("Invalid profile data");
          }
        } else {
          const token = await getValidToken();
          console.log("Token from getValidToken:", token ? "present" : "missing");

          if (token) {
            let decodedUser: any = null;
            try {
              decodedUser = jwtDecode(token);
              console.log("Decoded token userId:", decodedUser?.userId || decodedUser?.sub);
            } catch (error) {
              console.error("Error decoding token:", error);
              throw new Error("Invalid token format");
            }

            const profileData = await apiService.user.getProfile();
            console.log("Profile data received:", profileData);

            if (profileData?.success && profileData.data) {
              if (profileData.data.status === "Blocked") {
                console.log("User is blocked, logging out");
                logout();
                return;
              }

              const newUser: User = {
                _id: profileData.data._id || decodedUser.userId,
                driverId: decodedUser.userId,
                email: profileData.data.email || decodedUser.email,
                name: profileData.data.name,
                fullName: profileData.data.name || decodedUser.name, // Added for consistency
              };
              console.log("Setting user from profile data:", newUser);
              setUser(newUser);
              setIsAuthenticated(true);
            } else {
              console.warn("Invalid profile data response:", profileData);
              throw new Error("Invalid profile data");
            }
          } else {
            console.log("No valid token found, redirecting to login");
            logout();
          }
        }
      } catch (error: any) {
        console.error("Authentication check failed:", error);
        setIsAuthenticated(false);
        console.log("Redirecting to login due to authentication failure");
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [sessionStatus, session, router]);

  return { user, isAuthenticated, isLoading, logout };
};

export default useAuth;