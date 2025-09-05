import jwt from "jsonwebtoken";
import apiService from "@/services/api";
import Cookies from "js-cookie";

export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || Cookies.get("accessToken") || null;
  }
  return null;
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return Cookies.get("refreshToken") || null;
  }
  return null;
};

export const setToken = (token: string): void => {
  if (typeof window !== "undefined") {
    // Use adminAuthToken for admin context
    Cookies.set("adminAuthToken", token, {
      expires: 1,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    // Optionally keep in localStorage for fallback
    localStorage.setItem("token", token);
  }
};

export const setRefreshToken = (refreshToken: string): void => {
  if (typeof window !== "undefined") {
    Cookies.set("refreshToken", refreshToken, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    localStorage.setItem("refreshToken", refreshToken);
  }
};

export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    Cookies.remove("adminAuthToken");
    Cookies.remove("refreshToken");
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded?.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

export const refreshToken = async (): Promise<string> => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiService.auth.refreshToken({ refreshToken });
    if (response.success && response.token) {
      setToken(response.token);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      return response.token;
    }
    throw new Error("Failed to refresh token: " + (response.message || "Unknown error"));
  } catch (error) {
    removeToken();
    throw error;
  }
};

export const getValidToken = async (): Promise<string> => {
  const token = getToken() || Cookies.get("adminAuthToken"); // Check adminAuthToken first
  if (!token) {
    throw new Error("No token available");
  }

  if (isTokenExpired(token)) {
    return await refreshToken();
  }

  return token;
};