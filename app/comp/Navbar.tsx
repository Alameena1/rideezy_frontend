"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { clientApiService } from "@/services/client-api";
import useAuth from "../hooks/useAuth";
import { useSocketStore } from "../stores/socketStore";

const Navbar = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { socket, isConnected, connect } = useSocketStore();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      setIsUserLoggedIn(true);
      fetchNotifications(session.user.id);
      if (user?._id && !isConnected) {
        connect(user._id);
      }
    } else if (status === "unauthenticated") {
      setIsUserLoggedIn(false);
    }
  }, [status, session, user?._id, isConnected, connect]);

  useEffect(() => {
    if (socket && user?._id) {
      const handleNewNotification = (notification: any) => {
        setUnreadNotifications((prev) => {
          const exists = prev.some((n) => n._id === notification._id);
          return exists ? prev : [...prev, { ...notification, _id: notification._id || Date.now().toString() }];
        });
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, user?._id]);

  const fetchNotifications = async (userId: string | undefined) => {
    if (!userId) {
      console.warn("No userId provided for fetching notifications");
      return;
    }

    try {
      const response = await clientApiService.notification.getUserNotifications(userId);
      console.log("Notifications response:", response);
      const { notifications } = response.data || { notifications: [] };
      const unread = notifications.filter((n: any) => !n.isRead);
      setUnreadNotifications(unread);
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error.response?.status, error.response?.data || error.message);
      setUnreadNotifications([]);
    }
  };

  const handleLogout = async () => {
    try {
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
      setIsUserLoggedIn(false);
      setUnreadNotifications([]);
      if (session) {
        await signOut({ callbackUrl: "/user/login" });
      } else {
        router.push("/user/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      router.push("/user/login");
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await clientApiService.notification.markAsRead(notificationId);
      setUnreadNotifications(unreadNotifications.filter((n: any) => n._id !== notificationId));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const isLoggedIn = isAuthenticated || isUserLoggedIn;

  return (
    <nav className="bg-gray-300 p-4 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">
          RideEzy
        </Link>
        <div className="hidden md:flex space-x-20">
          <Link href="/user/ride" className="hover:text-blue-600">
            Start Ride
          </Link>
          <Link href="/user/JoinRide" className="hover:text-blue-600">
            Join Ride
          </Link>
          <Link href="/safety" className="hover:text-blue-600">
            Safety
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {isLoggedIn && !isLoading && (
            <DropdownMenu key={unreadNotifications.length}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-6 w-6" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 p-2">
                {unreadNotifications.length > 0 ? (
                  unreadNotifications.map((notification: any) => (
                    <DropdownMenuItem
                      key={notification._id}
                      className="p-2 text-sm hover:bg-gray-100"
                      onClick={() => markAsRead(notification._id)}
                    >
                      {notification.message}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="p-2 text-sm text-gray-500">
                    No unread notifications
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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