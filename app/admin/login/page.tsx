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
    <div className="flex min-h-screen items-center justify-center bg-gray-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        {/* Moving Road */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-800 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gray-600 road-line">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400 dashed-line animate-road-move"></div>
          </div>
        </div>

        {/* Floating Cars */}
        <div className="car-container car-1">
          <div className="car-body">
            <div className="car-top bg-red-500"></div>
            <div className="car-bottom bg-red-600"></div>
            <div className="car-wheel wheel-front"></div>
            <div className="car-wheel wheel-back"></div>
            <div className="car-window"></div>
          </div>
        </div>

        <div className="car-container car-2">
          <div className="car-body">
            <div className="car-top bg-blue-500"></div>
            <div className="car-bottom bg-blue-600"></div>
            <div className="car-wheel wheel-front"></div>
            <div className="car-wheel wheel-back"></div>
            <div className="car-window"></div>
          </div>
        </div>

        <div className="car-container car-3">
          <div className="car-body">
            <div className="car-top bg-green-500"></div>
            <div className="car-bottom bg-green-600"></div>
            <div className="car-wheel wheel-front"></div>
            <div className="car-wheel wheel-back"></div>
            <div className="car-window"></div>
          </div>
        </div>

        {/* Floating Particles */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}></div>
          ))}
        </div>

        {/* Animated Grid */}
        <div className="absolute inset-0 grid-pattern opacity-10"></div>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 relative z-10 transform transition-all duration-300 hover:shadow-purple-500/10">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-gray-800 animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-100 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Admin Login
          </h1>
          <p className="mt-2 text-gray-400">Rideezy Administration Portal</p>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 text-red-300 rounded-lg border border-red-800/50 backdrop-blur-sm transform transition-all duration-300 animate-shake">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="transform transition-all duration-300 hover:scale-[1.02]">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  Email Address
                </div>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg shadow-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder="admin@rideezy.com"
                disabled={loading}
              />
            </div>

            <div className="transform transition-all duration-300 hover:scale-[1.02]">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Password
                </div>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg shadow-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          <div className="transform transition-all duration-300 hover:scale-[1.02]">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium transform hover:shadow-lg hover:shadow-indigo-500/25"
            > 
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 7l6 5-6 5V7z" />
                  </svg>
                  Sign in as Admin
                </div>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-gray-700/50">
          <p className="text-sm text-gray-400">
            Secure Admin Access Only
          </p>
          <button
            onClick={() => router.push("/user/login")}
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-all duration-300 transform hover:scale-105 flex items-center justify-center mx-auto"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to User Login
          </button>
        </div>
      </div>

      <style jsx>{`
        .road-line {
          background: linear-gradient(90deg, transparent 0%, #4B5563 50%, transparent 100%);
        }
        
        .dashed-line {
          background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 20px,
            #F59E0B 20px,
            #F59E0B 40px
          );
        }

        .animate-road-move {
          animation: roadMove 2s linear infinite;
        }

        @keyframes roadMove {
          0% { transform: translateX(-40px); }
          100% { transform: translateX(0); }
        }

        .car-container {
          position: absolute;
          bottom: 40px;
          animation: drive 20s linear infinite;
        }

        .car-1 {
          left: -100px;
          animation-delay: 0s;
          animation-duration: 25s;
        }

        .car-2 {
          left: -100px;
          animation-delay: 8s;
          animation-duration: 30s;
        }

        .car-3 {
          left: -100px;
          animation-delay: 15s;
          animation-duration: 35s;
        }

        .car-body {
          position: relative;
          width: 80px;
          height: 30px;
          transform: perspective(100px) rotateX(10deg);
        }

        .car-top {
          position: absolute;
          top: 0;
          left: 15px;
          width: 50px;
          height: 15px;
          border-radius: 10px 10px 0 0;
        }

        .car-bottom {
          position: absolute;
          top: 15px;
          width: 80px;
          height: 15px;
          border-radius: 15px 20px 20px 15px;
        }

        .car-wheel {
          position: absolute;
          bottom: -5px;
          width: 12px;
          height: 12px;
          background: #1F2937;
          border: 2px solid #4B5563;
          border-radius: 50%;
          animation: wheelSpin 1s linear infinite;
        }

        .wheel-front {
          left: 15px;
        }

        .wheel-back {
          right: 15px;
        }

        .car-window {
          position: absolute;
          top: 3px;
          left: 20px;
          width: 40px;
          height: 8px;
          background: #1E40AF;
          border-radius: 5px;
        }

        @keyframes drive {
          0% { transform: translateX(-100px) scale(0.8); opacity: 0; }
          5% { transform: translateX(-50px) scale(0.9); opacity: 1; }
          90% { transform: translateX(calc(100vw + 50px)) scale(1); opacity: 1; }
          100% { transform: translateX(calc(100vw + 100px)) scale(1.1); opacity: 0; }
        }

        @keyframes wheelSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .particles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #60A5FA;
          border-radius: 50%;
          animation: float 20s linear infinite;
          opacity: 0.3;
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}