// app/auth-error/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("An error occurred during authentication.");

  useEffect(() => {
    if (searchParams) {
      const error = searchParams.get("error");
      if (error) {
        switch (error) {
          case "AuthenticationFailed":
            setErrorMessage("Authentication failed. Please try again.");
            break;
          case "CredentialsSignin":
            setErrorMessage("Invalid email or password.");
            break;
          case "OAuthSignin":
          case "OAuthCallback":
            setErrorMessage("Google authentication failed. Please try again.");
            break;
          default:
            setErrorMessage(decodeURIComponent(error));
        }
      }
    }
    // Redirect to login after 3 seconds
    const timer = setTimeout(() => {
      const redirectUrl = `/user/login${searchParams && searchParams.get("error") ? `?error=${encodeURIComponent(searchParams.get("error")!)}` : ""}`;
      router.push(redirectUrl);
    }, 3000);
    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Authentication Error</h1>
        <p className="text-red-600 mb-4">{errorMessage}</p>
        <p className="text-gray-600">You will be redirected to the login page shortly...</p>
      </div>
    </div>
  );
}