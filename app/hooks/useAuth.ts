"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiService } from "../../services/api";
import Cookies from "js-cookie";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

interface User {
  govId: any;
  driverId?: string;
  email?: string;
  name?: string;
}

const useAuth = () => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      console.log("Checking auth, sessionStatus:", sessionStatus);

      const token = Cookies.get("accessToken");
      let decodedUser: any = null;

      if (token) {
        try {
          decodedUser = jwtDecode(token);
          console.log("Decoded token:", decodedUser);
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      }

      if (sessionStatus === "authenticated" && session?.user) {
        console.log("Google login detected, storing tokens");
        const accessToken = session.user.access_token || token;
        const refreshToken = session.user.refresh_token;
        if (accessToken) {
          Cookies.set("accessToken", accessToken, { expires: 1, secure: true, sameSite: "strict" });
          decodedUser = decodedUser || jwtDecode(accessToken);
        }
        if (refreshToken) {
          Cookies.set("refreshToken", refreshToken, { expires: 7, secure: true, sameSite: "strict" });
        }
        const newUser = {
          _id: decodedUser?.userId || decodedUser?.sub, // Adjust based on token structure
          driverId: decodedUser?.userId,
          email: session.user.email || decodedUser?.email,
          name: session.user.name,
        };
        console.log("Setting user from Google login:", newUser);
        setUser(newUser);
        setIsAuthenticated(true);
      } else if (sessionStatus === "unauthenticated" || sessionStatus === "loading") {
        console.log("Custom login check, token:", token ? "present" : "missing");
        if (token && decodedUser?.userId) {
          try {
            console.log("Validating token with apiService.getProfile");
            const profileData = await apiService.user.getProfile();
            console.log("Profile data received:", profileData);
            if (profileData?.success && profileData.data) {
              const newUser = {
                _id: profileData.data._id || decodedUser.userId, // Use _id from profile if available
                driverId: decodedUser.userId,
                email: profileData.data.email || decodedUser.email,
              };
              console.log("Setting user from profile data:", newUser);
              setUser(newUser);
              setIsAuthenticated(true);
            } else {
              console.warn("Invalid profile data response:", profileData);
              throw new Error("Invalid profile data");
            }
          } catch (error: any) {
            console.error("Token validation failed:", error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              console.log("Token invalid, clearing cookies and redirecting");
              Cookies.remove("accessToken");
              Cookies.remove("refreshToken");
              router.push("/user/login");
            }
          }
        } else {
          console.log("No valid token found, redirecting to login");
          router.push("/user/login");
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [sessionStatus, session, router]);

  return { user, isAuthenticated, isLoading };
};

export default useAuth;

