import { getSession } from "next-auth/react";

export const getToken = async (): Promise<string | null> => {
  try {
    const session = await getSession();
    return (session?.user as any)?.accessToken || null;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const session = await getSession();
    return (session?.user as any)?.refreshToken || null;
  } catch (error) {
    console.error("Error getting refresh token:", error);
    return null;
  }
};

export const refreshToken = async (): Promise<string | null> => {
  try {
    const session = await getSession();
    const refreshToken = (session?.user as any)?.refreshToken;
    
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    return data.accessToken || null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};