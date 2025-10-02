"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function AdminLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if already authenticated as admin
    if (status === "authenticated" && session?.user) {
      const user = session.user as any;
      console.log("🔄 Session check:", { 
        role: user.role, 
        isAdmin: user.role === "admin" 
      });
      
      if (user.role === "admin") {
        console.log("✅ Admin already authenticated, redirecting to dashboard");
        router.replace("/admin/dashboard");
      } else {
        console.log("❌ User is not admin, redirecting to home");
        router.replace("/");
      }
    }
  }, [status, session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("🔄 Admin login attempt starting...", { 
        email: formData.email,
        timestamp: new Date().toISOString() 
      });
      
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        isAdmin: "true", // This tells NextAuth to use admin endpoint
        redirect: false,
      });

      console.log("📝 SignIn result:", {
        error: result?.error,
        status: result?.status,
        url: result?.url,
        ok: result?.ok
      });

      if (result?.error) {
        console.error("❌ Admin login failed:", result.error);
        setError(result.error);
        setLoading(false);
      } else if (result?.ok) {
        console.log("✅ Admin login successful, checking session...");
        // The useEffect will handle the redirect when session updates
        // Force a session refresh
        window.location.reload();
      } else {
        console.warn("⚠️ Unexpected signIn result:", result);
        setError("Unexpected response from server");
        setLoading(false);
      }

    } catch (err: any) {
      console.error("💥 Admin login exception:", {
        message: err.message,
        stack: err.stack
      });
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (status === "authenticated") {
    const user = session.user as any;
    if (user.role === "admin") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
          <div className="text-white text-xl">Redirecting to admin dashboard...</div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-100">Admin Login</h1>
          <p className="mt-2 text-gray-400">Rideezy Administration</p>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 text-red-300 rounded-md border border-red-800">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="admin@rideezy.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            > 
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </div>
              ) : (
                "Sign in as Admin"
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Need access? Contact your system administrator
          </p>
          <button
            onClick={() => router.push("/user/login")}
            className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Back to User Login
          </button>
        </div>
      </div>
    </div>
  );
}