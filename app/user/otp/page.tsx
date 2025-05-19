// src/pages/user/otp.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation"; 
import Head from "next/head";
import { apiService } from "@/services/api"; 

type OtpArray = [string, string, string, string, string, string];

interface VerificationResponse {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

interface ResendOtpResponse {
  success: boolean;
  message: string;
}

export default function VerifyOTP(): JSX.Element {
  const [otp, setOtp] = useState<OtpArray>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(30);
  const [email, setEmail] = useState<string>("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array.from({ length: 6 }, () => null));
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const queryEmail = searchParams.get("email");
    if (queryEmail) {
      setEmail(queryEmail);
    }

    inputRefs.current[0]?.focus();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp] as OtpArray;
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (/^\d{6}$/.test(pastedData)) {
      setOtp([...pastedData] as OtpArray);
      inputRefs.current[5]?.focus();
    }
  };

  const verifyOtp = async (otpValue: string): Promise<VerificationResponse> => {
    try {
      const response = await apiService.auth.verifyOtp({ email, otp: otpValue });
      return { success: true, message: response.message, redirectUrl: "/user/login" };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Verification failed. Please try again." };
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp(otpValue);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => router.push(response.redirectUrl!), 1500);
      } else {
        setError(response.message);
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const requestNewOtp = async (): Promise<ResendOtpResponse> => {
    try {
      const response = await apiService.auth.resendOtp({ email });
      return { success: true, message: response.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to resend OTP." };
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;
    setError("");
    setResendSuccess("");
    setResendLoading(true);

    try {
      const response = await requestNewOtp();
      if (response.success) {
        setResendSuccess(response.message);
        setCountdown(30);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(response.message);
      }
    } catch {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Verify OTP</title>
        <meta name="description" content="Verify your account with a one-time password" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Verify Your Account</h2>
          <p className="text-center text-sm text-gray-600">
            We sent a verification code to{" "}
            <span className="font-medium text-indigo-600">{email || "your email"}</span>
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {resendSuccess && <p className="text-green-500 text-center">{resendSuccess}</p>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            {success && <p className="text-green-500 text-center">Verification successful! Redirecting...</p>}

            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="h-12 w-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  required
                  aria-label={`Digit ${index + 1} of OTP`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-2 px-4 bg-indigo-600 text-white rounded-md ${
                loading || success ? "opacity-70 cursor-not-allowed" : "hover:bg-indigo-700"
              }`}
            >
              {loading ? "Verifying..." : success ? "Verified!" : "Verify"}
            </button>

            <p className="text-center text-gray-500">
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={resendOTP}
                disabled={countdown > 0 || resendLoading}
                className={`text-indigo-600 ${(countdown > 0 || resendLoading) ? "opacity-50 cursor-not-allowed" : "hover:text-indigo-500"}`}
              >
                {resendLoading ? "Resending..." : `Resend ${countdown > 0 ? `(${countdown}s)` : ""}`}
              </button>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}