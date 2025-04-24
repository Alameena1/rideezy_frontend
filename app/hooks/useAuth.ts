"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiService } from "../../services/api";
import Cookies from "js-cookie";
import axios from "axios";

const useAuth = () => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      console.log("Checking auth, sessionStatus:", sessionStatus);

      // Case 1: NextAuth session (Google login)
      if (sessionStatus === "authenticated" && session?.user) {
        console.log("Google login detected, storing tokens");
        const accessToken = session.user.access_token;
        const refreshToken = session.user.refresh_token;
        if (accessToken) {
          Cookies.set("accessToken", accessToken, { expires: 1, secure: true, sameSite: "strict" });
        }
        if (refreshToken) {
          Cookies.set("refreshToken", refreshToken, { expires: 7, secure: true, sameSite: "strict" });
        }
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Case 2: Custom login (check token validity)
      if (sessionStatus === "unauthenticated" || sessionStatus === "loading") {
        const token = Cookies.get("accessToken");
        console.log("Custom login check, token:", token ? "present" : "missing");
        if (token) {
          try {
            console.log("Validating token with apiService.getProfile");
            const profileData = await apiService.getProfile();
            console.log("Profile data received:", profileData);
            if (profileData?.success && profileData.data) {
              setIsAuthenticated(true);
            } else {
              console.warn("Invalid profile data response:", profileData);
              throw new Error("Invalid profile data");
            }
          } catch (error: any) {
            console.error("Token validation failed:", error);
            if (axios.isAxiosError(error)) {
              console.error("Axios error details:", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
              });
            }
            // Only clear tokens and redirect on 401 (Unauthorized)
            if (error.response?.status === 401) {
              console.log("Token invalid, clearing cookies and redirecting");
              Cookies.remove("accessToken");
              Cookies.remove("refreshToken");
              router.push("/user/login");
            }
          }
        } else {
          console.log("No token found, redirecting to login");
          router.push("/user/login");
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [sessionStatus, session, router]);

  return { session, isAuthenticated, isLoading };
};

export default useAuth;