"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn, useSession, signOut } from "next-auth/react";
import { clientApiService, useApiInterceptors } from "@/services/client/client-api";
import Cookies from "js-cookie";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });
  const [loading, setLoading] = useState(false);

  // Apply API interceptors
  useApiInterceptors();

  useEffect(() => {
    // Clear any stale session on mount
    const clearStaleSession = async () => {
      if (status === "authenticated") {
        console.log("LoginPage: Clearing stale session");
        await signOut({ redirect: false });
        Cookies.remove("next-auth.session-token");
        Cookies.remove("__Secure-next-auth.session-token");
      }
    };
    clearStaleSession();

    // Handle error from query params
    if (searchParams) {
      const error = searchParams.get("error");
      if (error) {
        setErrors((prev) => ({
          ...prev,
          general: error === "AuthenticationFailed" ? "Authentication failed. Please try again." : decodeURIComponent(error),
        }));
      }
    }

    // Only redirect if not loading and authenticated
    if (status === "authenticated" && !loading) {
      console.log("LoginPage: User authenticated, redirecting to /");
      router.push("/");
    }
  }, [status, router, searchParams, loading]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
  };

  const validateForm = () => {
    const newErrors = { ...errors };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      console.log("LoginPage: Submitting credentials", { email: formData.email.trim(), passwordLength: formData.password.length });
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      if (result?.error) {
        console.error("Next-auth signIn error:", result.error);
        setErrors({ ...errors, general: result.error || "Invalid email or password" });
      } else {
        console.log("Login success, redirecting to /");
        router.push("/");
      }
    } catch (error: any) {
      console.error("Login error:", error.message);
      setErrors({ ...errors, general: error.message || "Login failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    console.log("Initiating Google sign-in");
    signIn("google", { callbackUrl: "/" });
  };

  const handleForgotPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    router.push("/user/forgot-password");
  };

  if (status === "authenticated" && !loading) {
    return null;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 p-8 md:p-10 order-2 md:order-1">
          <div className="flex items-center justify-center md:justify-start mb-8">
            <div className="bg-blue-600 text-white p-2 rounded-lg mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Rideezy</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back</h2>
          <p className="text-gray-600 mb-8">Log in to your account to continue</p>

          {errors.general && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email ? "border-red-300 bg-red-50" : "border-gray-300"
                } text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50`}
                placeholder="your.email@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.password ? "border-red-300 bg-red-50" : "border-gray-300"
                } text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50`}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 block text-sm text-gray-700"
              >
                Remember me
              </label>
            </div>

            <div className="space-y-6">
              <button
                type="submit"
                className="w-full not-allowed"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Log In"}
              </button>

              <div className="flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-3 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              <button
                type="button"
                onClick={handleSignIn}
                className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg flex items-center justify-center space-x-3 shadow-sm hover:bg-gray-100 transition-all disabled:opacity-50"
                disabled={loading}
              >
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  alt="Google Logo"
                  width={20}
                  height={20}
                />
                <span className="text-gray-700 font-medium">
                  Continue with Google
                </span>
              </button>

              <p className="text-center text-gray-600">
                Don't have an account?{" "}
                <Link href="/user/signup" className="text-blue-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>

        <div className="hidden md:block w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 relative order-1 md:order-2">
          <div className="absolute inset-0 bg-black opacity-20 z-0"></div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Welcome Back!</h2>
              <p className="text-blue-100 mb-8">
                Log in to continue your ride-sharing journey and connect with fellow travelers.
              </p>

              <div className="space-y-4">
                {[
                  "View your upcoming and past rides",
                  "Manage your profile and preferences",
                  "Connect with your regular travel buddies",
                  "Access exclusive member benefits",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-blue-400 bg-opacity-30 flex items-center justify-center mr-3">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-white text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-white italic text-sm">
                  I find the most reliable carpool buddies through this app. It's changed how I commute forever!
                </p>
                <p className="text-blue-200 text-sm mt-2">
                  — Michael T., Active Member
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}