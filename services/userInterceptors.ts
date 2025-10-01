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
            "/auth/verify-otp",
            "/auth/resend-otp",
            "/auth/login",
            "/auth/signup",
            "/auth/refresh-token",
            "/auth/google-auth",
          ];
          if (!config.url) return config;
          if (unauthenticatedRoutes.some((route) => config.url!.includes(route))) {
            return config;
          }

          if (status === "loading") return config;
          if (status === "unauthenticated") {
            router.replace("/user/login?error=Please%20log%20in");
            return config;
          }

          const accessToken = session?.user?.accessToken;
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          } else {
            router.replace("/user/login?error=No%20access%20token");
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      const responseInterceptor = api.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          const unauthenticatedRoutes = [
            "/auth/verify-otp",
            "/auth/resend-otp",
            "/auth/login",
            "/auth/signup",
            "/auth/refresh-token",
            "/auth/google-auth",
          ];

          if (
            error.response?.status === 403 &&
            error.response?.data?.message === "You have been blocked by the admin, please contact support"
          ) {
            await signOut({ redirect: false });
            router.replace("/user/login?error=You%20have%20been%20blocked%20by%20the%20admin%2C%20please%20contact%20support");
            return Promise.reject(error);
          }

          if (
            error.response?.status === 401 &&
            error.response?.data?.message === "Access token expired, please refresh" &&
            originalRequest &&
            !originalRequest._retry &&
            !unauthenticatedRoutes.some((route) => originalRequest.url.includes(route))
          ) {
            originalRequest._retry = true;
            try {
              const refreshToken = session?.user?.refreshToken;
              if (!refreshToken) {
                await signOut({ redirect: false });
                router.replace("/user/login?error=No%20refresh%20token%20found");
                throw new Error("No refresh token found");
              }

              const response = await axios.post(
                `${baseURL}/auth/refresh-token`,
                { refreshToken },
                { headers: { "Content-Type": "application/json" }, withCredentials: true }
              );

              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
              if (!newAccessToken) {
                await signOut({ redirect: false });
                router.replace("/user/login?error=Invalid%20refresh%20token%20response");
                throw new Error("Invalid refresh token response");
              }

              await update({
                ...session,
                user: {
                  ...session?.user,
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken || session?.user?.refreshToken,
                },
              });

              api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return api(originalRequest);
            } catch (refreshError) {
              await signOut({ redirect: false });
              router.replace("/user/login?error=Failed%20to%20refresh%20token");
              return Promise.reject(refreshError);
            }
          }

          return Promise.reject(error);
        }
      );

      return () => {
        api.interceptors.request.eject(requestInterceptor);
        api.interceptors.response.eject(responseInterceptor);
      };
    }, [session, status, update, router]);

    return api;
  };

  return { api, useTokenInterceptor };
};

export const useApiInterceptors = createUserApiInstance(
  process.env.NEXT_PUBLIC_API_BASE_URL || ""
).useTokenInterceptor;