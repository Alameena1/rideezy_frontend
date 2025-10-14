import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const createUserApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  const useTokenInterceptor = () => {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    useEffect(() => {
      const requestInterceptor = api.interceptors.request.use(
        async (config) => {
          const unauthenticatedRoutes = [
            "/api/auth/verify-otp",
            "/api/auth/resend-otp",
            "/api/auth/login",
            "/api/auth/signup",
            "/api/auth/refresh-token",
            "/api/auth/google-auth",
            "/admin/login",
          ];
          
          if (!config.url) return config;
          
          // Skip auth for unauthenticated routes
          if (unauthenticatedRoutes.some((route) => config.url!.includes(route))) {
            return config;
          }

          if (status === "loading") {
            console.log("⏳ Auth loading, waiting...");
            // Don't block the request, just continue without token
            return config;
          }

          if (status === "unauthenticated") {
            console.log("🚫 Unauthenticated for:", config.url);
            // Don't redirect here, let the component handle it
            throw new axios.Cancel("Unauthenticated");
          }

          // Use NextAuth session token
          const accessToken = (session?.user as any)?.accessToken;
          if (accessToken) {
            console.log("✅ Adding Authorization header for:", config.url);
            config.headers.Authorization = `Bearer ${accessToken}`;
          } else {
            console.log("❌ No access token in session for:", config.url);
            throw new axios.Cancel("No access token");
          }
          
          return config;
        },
        (error) => {
          console.error("🚫 Request interceptor error:", error);
          return Promise.reject(error);
        }
      );

      const responseInterceptor = api.interceptors.response.use(
        (response) => {
          console.log("✅ Response success:", response.status, response.config.url);
          return response;
        },
        async (error) => {
          if (axios.isCancel(error)) {
            console.log("🚫 Request canceled:", error.message);
            return Promise.reject(error);
          }

          const originalRequest = error.config;
          console.log("🚫 Response error:", {
            url: error.config?.url,
            status: error.response?.status,
            message: error.response?.data?.message
          });

          const unauthenticatedRoutes = [
            "/api/auth/verify-otp",
            "/api/auth/resend-otp",
            "/api/auth/login",
            "/api/auth/signup",
            "/api/auth/refresh-token",
            "/api/auth/google-auth",
            "/admin/login",
          ];

          // Handle blocked user
          if (
            error.response?.status === 403 &&
            error.response?.data?.message === "You have been blocked by the admin, please contact support"
          ) {
            console.log("🚫 User blocked, signing out");
            await signOut({ redirect: false });
            router.replace("/user/login?error=You%20have%20been%20blocked%20by%20the%20admin%2C%20please%20contact%20support");
            return Promise.reject(error);
          }

          // Handle token refresh
          if (
            error.response?.status === 401 &&
            error.response?.data?.message === "Access token expired, please refresh" &&
            originalRequest &&
            !originalRequest._retry &&
            !unauthenticatedRoutes.some((route) => originalRequest.url.includes(route))
          ) {
            console.log("🔄 Attempting token refresh");
            originalRequest._retry = true;
            
            try {
              const refreshToken = (session?.user as any)?.refreshToken;
              if (!refreshToken) {
                console.log("❌ No refresh token found");
                await signOut({ redirect: false });
                router.replace("/user/login?error=No%20refresh%20token%20found");
                throw new Error("No refresh token found");
              }

              const response = await axios.post(
                `${baseURL}/api/auth/refresh-token`,
                { refreshToken },
                { 
                  headers: { "Content-Type": "application/json" }, 
                  withCredentials: true 
                }
              );

              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
              if (!newAccessToken) {
                console.log("❌ Invalid refresh token response");
                await signOut({ redirect: false });
                router.replace("/user/login?error=Invalid%20refresh%20token%20response");
                throw new Error("Invalid refresh token response");
              }

              console.log("✅ Token refresh successful, updating session");
              await update({
                ...session,
                user: {
                  ...session?.user,
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken || (session?.user as any)?.refreshToken,
                },
              });

              // Update the header for the retried request
              api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              
              console.log("🔄 Retrying original request");
              return api(originalRequest);
            } catch (refreshError) {
              console.log("❌ Token refresh failed:", refreshError);
              await signOut({ redirect: false });
              router.replace("/user/login?error=Failed%20to%20refresh%20token");
              return Promise.reject(refreshError);
            }
          }

          // For other 401 errors, don't redirect automatically
          // Let the calling component handle the error
          return Promise.reject(error);
        }
      );

      return () => {
        console.log("🧹 Cleaning up interceptors");
        api.interceptors.request.eject(requestInterceptor);
        api.interceptors.response.eject(responseInterceptor);
      };
    }, [session, status, update, router]);

    return api;
  };

  return { api, useTokenInterceptor };
};

export const useApiInterceptors = createUserApiInstance(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).useTokenInterceptor;