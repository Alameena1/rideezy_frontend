"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { clientApiService, useApiInterceptors } from "@/services/client/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Shield, 
  Users, 
  Star, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  ArrowRight,
  Sparkles
} from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Apply API interceptors
  useApiInterceptors();

  useEffect(() => {
    setIsMounted(true);
    
    // Handle error from query params
    const error = searchParams.get("error");
    if (error) {
      setErrors((prev) => ({
        ...prev,
        general: error === "AuthenticationFailed" ? "Authentication failed. Please try again." : decodeURIComponent(error),
      }));
    }

    // Redirect if authenticated
    if (status === "authenticated" && !loading) {
      console.log("LoginPage: User authenticated, redirecting to /");
      router.replace("/");
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
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Login error:", error.message);
      setErrors({ ...errors, general: error.message || "Login failed" });
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (status === "authenticated") {
    return null;
  }

  const features = [
    {
      icon: <Car className="h-5 w-5" />,
      text: "10K+ Rides Daily"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      text: "Verified Drivers"
    },
    {
      icon: <Users className="h-5 w-5" />,
      text: "500K+ Community"
    },
    {
      icon: <Star className="h-5 w-5" />,
      text: "4.9 Star Rating"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Shapes */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-float-slow"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Brand & Features */}
          <div className="text-white space-y-8">
            <div className="space-y-4">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-4 py-2 text-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                Welcome to RideEzy
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Your Journey
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block">
                  Starts Here
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
                Join thousands of riders and drivers in our trusted community. Safe, reliable, and affordable rides await.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                  <div className="text-purple-400">
                    {feature.icon}
                  </div>
                  <span className="text-sm text-gray-300">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            {/* <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 max-w-md">
              <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 italic mb-3">
                "RideEzy transformed my daily commute. The community is amazing and I always feel safe!"
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full"></div>
                <div>
                  <p className="text-white text-sm font-medium">Sarah Johnson</p>
                  <p className="text-gray-400 text-xs">Regular Rider</p>
                </div>
              </div>
            </div> */}
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
              <CardHeader className="space-y-4 text-center pb-8">
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <Car className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-white">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-gray-300 mt-2">
                    Sign in to your account to continue
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {errors.general && (
                  <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                    <AlertDescription className="text-white">
                      {errors.general}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        className="bg-white/5 border-white/20 text-white placeholder-gray-400 focus:bg-white/10 focus:border-purple-400 transition-all"
                        placeholder="your.email@example.com"
                        autoComplete="email"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-400">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="password" className="text-white">
                          Password
                        </Label>
                        <Button
                          type="button"
                          variant="link"
                          onClick={handleForgotPassword}
                          disabled={loading}
                          className="text-purple-300 hover:text-purple-200 p-0 h-auto text-sm disabled:opacity-50"
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleChange}
                          disabled={loading}
                          className="bg-white/5 border-white/20 text-white placeholder-gray-400 focus:bg-white/10 focus:border-purple-400 transition-all pr-10"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={togglePasswordVisibility}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-gray-400"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-red-400">{errors.password}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                      }
                      disabled={loading}
                      className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                    />
                    <Label htmlFor="rememberMe" className="text-gray-300 text-sm">
                      Remember me for 30 days
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Continue</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-gray-400">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSignIn}
                  variant="outline"
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white rounded-xl py-3 transition-all"
                  disabled={loading}
                  size="lg"
                >
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                    alt="Google Logo"
                    width={20}
                    height={20}
                    className="mr-3"
                  />
                  <span className="font-medium">Google</span>
                </Button>

                <div className="text-center">
                  <p className="text-gray-400">
                    Don't have an account?{" "}
                    <Link 
                      href="/user/signup" 
                      className="text-purple-300 hover:text-purple-200 font-semibold transition-colors"
                    >
                      Sign up now
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Animation Elements */}
      {isMounted && (
        <>
          <div className="absolute top-20 left-10 animate-bounce">
            <div className="w-6 h-6 bg-purple-400/30 rounded-full"></div>
          </div>
          <div className="absolute top-40 right-20 animate-bounce delay-100">
            <div className="w-4 h-4 bg-pink-400/30 rounded-full"></div>
          </div>
          <div className="absolute bottom-40 left-20 animate-bounce delay-200">
            <div className="w-5 h-5 bg-blue-400/30 rounded-full"></div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(90deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-15px) scale(1.1); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}