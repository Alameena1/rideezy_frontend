
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    general: ""
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^\d{10}$/;
    return re.test(phone.replace(/[-()\s]/g, ''));
  };

  const checkPasswordStrength = (password: string) => {
    let score = 0;

   
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

  
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return Math.min(score, 5); 
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));


    setErrors(prev => ({ ...prev, [name]: "", general: "" }));

 
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const validateForm = () => {
    const newErrors = { ...errors };
    let isValid = true;

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
      isValid = false;
    } else if (!validatePhone(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({ ...errors, general: "" });

    try {
      const response = await fetch(" http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      router.push(`/user/otp?email=${formData.email}`);

    }catch (err: unknown) {
      let message = "An unexpected error occurred.";
    
      if (err instanceof Error) {
        message = err.message;
      }
    
      setErrors(prev => ({ ...prev, general: message }));
    }
     finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      window.location.href = "/api/auth/google";
    }catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect with Google. Please try again.";
    
      setErrors(prev => ({ ...prev, general: errorMessage }));
      setLoading(false);
    }
    
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        <div className="hidden md:block w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 relative">
          <div className="absolute inset-0 bg-black opacity-20 z-0"></div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Join our Ride-Sharing Community</h2>
              <p className="text-blue-100 mb-8">Share rides, save money, and reduce your carbon footprint - all with a few taps!</p>

              <div className="space-y-4">
                {[
                  "Connect with nearby passengers and drivers",
                  "Split costs fairly among passengers",
                  "Track your ride in real-time",
                  "Safe, reliable, and affordable transportation"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-blue-400 bg-opacity-30 flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <span className="text-white text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-white italic text-sm">This ride-sharing service has saved me thousands on my daily commute and helped me make new friends along the way!</p>
                <p className="text-blue-200 text-sm mt-2">— Sarah K., Active Member</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-10">
          <div className="flex items-center justify-center md:justify-start mb-8">
            <div className="bg-blue-600 text-white p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Rideezy</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Create your account</h2>
          <p className="text-gray-600 mb-8">Start sharing rides in just a few steps</p>

          {errors.general && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.fullName ? "border-red-300 bg-red-50" : "border-gray-300"
                  } text-blue-500 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="Enter your full name"
              />

              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.email ? "border-red-300 bg-red-50" : "border-gray-300"
                  }  text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="your.email@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.phoneNumber ? "border-red-300 bg-red-50" : "border-gray-300"
                  }  text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="Enter your phone number"
              />
              {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.password ? "border-red-300 bg-red-50" : "border-gray-300"
                  }  text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="Create a secure password"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}

              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Password strength:</span>
                    <span className="text-xs font-medium">
                      {passwordStrength === 0 && "Very weak"}
                      {passwordStrength === 1 && "Weak"}
                      {passwordStrength === 2 && "Fair"}
                      {passwordStrength === 3 && "Good"}
                      {passwordStrength === 4 && "Strong"}
                      {passwordStrength === 5 && "Very strong"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength <= 1 ? "bg-red-500" :
                          passwordStrength <= 2 ? "bg-orange-500" :
                            passwordStrength <= 3 ? "bg-yellow-500" :
                              passwordStrength <= 4 ? "bg-green-500" :
                                "bg-emerald-500"
                        }`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.confirmPassword ? "border-red-300 bg-red-50" : "border-gray-300"
                  }  text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>
            <div className="space-y-6">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </button>

              <div className="flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-3 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg flex items-center justify-center space-x-3 shadow-sm hover:bg-gray-100 transition-all disabled:opacity-50"
                disabled={loading}
              >
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  alt="Google Logo"
                  width={20}
                  height={20}
                />
                <span className="text-gray-700 font-medium">Sign Up with Google</span>
              </button>

              <p className="text-center text-gray-600">
                Already have an account?{" "}
                <Link href="/user/login" className="text-blue-600 hover:underline">
                  Login
                </Link>
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  )      
}