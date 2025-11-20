import axios from "axios";
import { useSession, signOut, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export interface InterceptorConfig {
  baseURL: string;
  userType: 'user' | 'admin';
  authRoutes: string[];
  loginRoute: string;
  refreshRoute: string;
}

export const createUnifiedApiInstance = (config: InterceptorConfig) => {
  const api = axios.create({
    baseURL: config.baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: config.userType === 'user',
  });

  // Client-side interceptor hook (for React components)
  const useTokenInterceptor = () => {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    useEffect(() => {
      const requestInterceptor = api.interceptors.request.use(
        async (requestConfig) => {
          // Skip auth for unauthenticated routes
          if (config.authRoutes.some(route => requestConfig.url?.includes(route))) {
            return requestConfig;
          }

          if (status === "loading") {
            console.log("⏳ Auth loading, waiting...");
            return requestConfig;
          }

          if (status === "unauthenticated") {
            console.log("🚫 Unauthenticated for:", requestConfig.url);
            throw new axios.Cancel("Unauthenticated");
          }

          // Use NextAuth session token
          const accessToken = (session?.user as any)?.accessToken;
          if (accessToken) {
            console.log(`✅ Adding Authorization header for ${config.userType}:`, requestConfig.url);
            requestConfig.headers.Authorization = `Bearer ${accessToken}`;
          } else {
            console.log(`❌ No access token in session for ${config.userType}:`, requestConfig.url);
            throw new axios.Cancel("No access token");
          }
          
          return requestConfig;
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

          // Handle blocked user (both user and admin)
          if (
            error.response?.status === 403 &&
            (
              error.response?.data?.message === "You have been blocked by the admin, please contact support" ||
              error.response?.data?.message === "Your account has been blocked. Contact support."
            )
          ) {
            console.log(`🚫 ${config.userType} blocked, signing out`);
            await signOut({ redirect: false });
            router.replace(`${config.loginRoute}?error=You%20have%20been%20blocked%2C%20please%20contact%20support`);
            return Promise.reject(error);
          }

          // Handle token refresh
          if (
            error.response?.status === 401 &&
            error.response?.data?.message?.includes("expired") &&
            originalRequest &&
            !originalRequest._retry &&
            !config.authRoutes.some(route => originalRequest.url?.includes(route))
          ) {
            console.log("🔄 Attempting token refresh");
            originalRequest._retry = true;
            
            try {
              const refreshToken = (session?.user as any)?.refreshToken;
              if (!refreshToken) {
                console.log("❌ No refresh token found");
                if (process.env.NODE_ENV === 'development') {
                  console.log("Development mode: Ignoring missing refresh token");
                  return Promise.reject(error);
                }
                await signOut({ redirect: false });
                router.replace(config.loginRoute);
                throw new Error("No refresh token found");
              }

              const response = await axios.post(
                config.refreshRoute,
                { refreshToken },
                { 
                  headers: { "Content-Type": "application/json" }, 
                  withCredentials: config.userType === 'user' 
                }
              );

              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
              if (!newAccessToken) {
                console.log("❌ Invalid refresh token response");
                if (process.env.NODE_ENV === 'development') {
                  console.log("Development mode: Ignoring invalid refresh token");
                  return Promise.reject(error);
                }
                await signOut({ redirect: false });
                router.replace(config.loginRoute);
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
              if (process.env.NODE_ENV === 'development') {
                console.log("Development mode: Ignoring token refresh failure");
                return Promise.reject(error);
              }
              await signOut({ redirect: false });
              router.replace(config.loginRoute);
              return Promise.reject(refreshError);
            }
          }

          // For other 401 errors, don't redirect automatically in development
          if (error.response?.status === 401) {
            console.log("🔧 Development mode: Ignoring 401 error during hot reload");
            if (process.env.NODE_ENV === 'development') {
              return Promise.reject(error);
            }
          }

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

  // Server-side interceptor (for API routes and server components)
  const setupServerInterceptor = (getToken: () => Promise<string | null>) => {
    api.interceptors.request.use(
      async (requestConfig) => {
        // Skip auth for unauthenticated routes
        if (config.authRoutes.some(route => requestConfig.url?.includes(route))) {
          return requestConfig;
        }

        try {
          const token = await getToken();
          if (token) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
            console.log(`🔐 ${config.userType} API: Using token for request`);
          } else {
            console.warn(`⚠️ ${config.userType} API: No token found`);
          }
          
          return requestConfig;
        } catch (error) {
          console.error(`Failed to get ${config.userType} token:`, error);
          return requestConfig;
        }
      },
      (error) => Promise.reject(error)
    );

    return api;
  };

  return { api, useTokenInterceptor, setupServerInterceptor };
};

// Pre-configured instances
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// User instance configuration
export const userApiConfig: InterceptorConfig = {
  baseURL: API_BASE_URL,
  userType: 'user',
  authRoutes: [
    "/api/auth/verify-otp",
    "/api/auth/resend-otp",
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/refresh-token",
    "/api/auth/google-auth",
    "/admin/login",
  ],
  loginRoute: "/user/login",
  refreshRoute: `${API_BASE_URL}/api/auth/refresh-token`
};

// Admin instance configuration
export const adminApiConfig: InterceptorConfig = {
  baseURL: API_BASE_URL,
  userType: 'admin',
  authRoutes: ["/admin/login", "/admin/refresh-token", "/admin/logout"],
  loginRoute: "/admin/login",
  refreshRoute: `${API_BASE_URL}/admin/refresh-token`
};

// Create instances (no parameters needed)
export const createUserApiInstance = () => createUnifiedApiInstance(userApiConfig);
export const createAdminApiInstance = () => createUnifiedApiInstance(adminApiConfig);

// Export the unified function for flexibility
export default createUnifiedApiInstance;