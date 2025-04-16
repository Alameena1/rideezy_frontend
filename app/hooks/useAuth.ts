"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const useAuth = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      localStorage.setItem("accessToken", session.user.access_token || "");
      localStorage.setItem("refreshToken", session.user.refresh_token || "");
    }

    if (status === "unauthenticated") {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/user/login");
      }
    }
  }, [status, session, router]);

  return { session, status };
};

export default useAuth;