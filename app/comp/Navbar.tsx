"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Cookies from "js-cookie";

const Navbar = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check for accessToken in cookies
  useEffect(() => {
    const token = Cookies.get("accessToken");
    setIsUserLoggedIn(!!token);
  }, []);

  // Update login state when session changes (Google login)
  useEffect(() => {
    if (status === "authenticated") {
      setIsUserLoggedIn(true);
    } else if (status === "unauthenticated") {
      // Only set to false if no cookie-based token exists
      const token = Cookies.get("accessToken");
      setIsUserLoggedIn(!!token);
    }
  }, [status]);

  const handleLogout = () => {
 
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    setIsUserLoggedIn(false);

    if (session) {
      // Handle Google logout via NextAuth
      signOut({ callbackUrl: "/user/login" });
    } else {
      // Redirect for regular login
      router.push("/user/login");
    }
  };

  const isLoggedIn = session || isUserLoggedIn;

  return (
    <nav className="bg-gray-300 p-4 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">
          RideEzy
        </Link>
        <div className="hidden md:flex space-x-20">
          <Link href="/user/ride" className="hover:text-blue-600">Start Ride</Link>
          <Link href="/business" className="hover:text-blue-600">Business</Link>
          <Link href="/safety" className="hover:text-blue-600">Safety</Link>
        </div>
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <Link href="/user/profile">
                <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-blue-700">
                  Profile
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/user/login">
                <button className="px-4 py-2 rounded hover:bg-gray-100">
                  Login
                </button>
              </Link>
              <Link href="/user/signup">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Sign Up
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;