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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, CheckCircle2 } from "lucide-react";
import { clientApiService } from "@/services/client/client-api";
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
        console.log("🔄 Connecting socket for user:", user._id);
        connect(user._id);
      }
    } else if (status === "unauthenticated") {
      setIsUserLoggedIn(false);
    }
  }, [status, session, user?._id, isConnected, connect]);

  useEffect(() => {
    if (socket && user?._id) {
      console.log("🔌 Socket connected, setting up notification listener for user:", user._id);
      
      const handleNewNotification = (notification: any) => {
        console.log("📢 New notification received via socket:", notification);
        setUnreadNotifications((prev) => {
          const exists = prev.some((n) => n._id === notification._id);
          if (!exists) {
            console.log("➕ Adding new notification to state");
            return [...prev, { ...notification, _id: notification._id || Date.now().toString() }];
          }
          console.log("⏭️ Notification already exists, skipping");
          return prev;
        });
      };

      socket.on("newNotification", handleNewNotification);
      
      // Test socket connection
      socket.emit("ping", (response: any) => {
        console.log("📡 Socket ping response:", response);
      });

      return () => {
        console.log("🧹 Cleaning up socket listener");
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, user?._id]);

  const fetchNotifications = async (userId: string | undefined) => {
    if (!userId) {
      console.warn("⚠️ No userId provided for fetching notifications");
      return;
    }

    try {
      console.log("📡 Fetching notifications for user:", userId);
      const response = await clientApiService.notification.getUserNotifications(userId);
      console.log("📋 Full notifications response:", response);
      
      // Handle different response formats
      let notifications = [];
      if (response.data && Array.isArray(response.data.notifications)) {
        notifications = response.data.notifications;
      } else if (Array.isArray(response.notifications)) {
        notifications = response.notifications;
      } else if (Array.isArray(response.data)) {
        notifications = response.data;
      } else if (response.success && Array.isArray(response.data)) {
        notifications = response.data;
      } else {
        console.warn("⚠️ Unexpected notifications response format:", response);
      }
      
      console.log("✅ Processed notifications:", notifications);
      const unread = notifications.filter((n: any) => !n.isRead);
      console.log("🔔 Unread notifications:", unread);
      setUnreadNotifications(unread);
    } catch (error: any) {
      console.error("❌ Failed to fetch notifications:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
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
      console.log("📝 Marking notification as read:", notificationId);
      await clientApiService.notification.markAsRead(notificationId);
      setUnreadNotifications(unreadNotifications.filter((n: any) => n._id !== notificationId));
      console.log("✅ Notification marked as read");
    } catch (error) {
      console.error("❌ Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log("📝 Marking all notifications as read");
      
      // Mark all notifications as read in parallel
      const markPromises = unreadNotifications.map(notification => 
        clientApiService.notification.markAsRead(notification._id)
      );
      
      await Promise.all(markPromises);
      
      // Clear all unread notifications from state
      setUnreadNotifications([]);
      console.log("✅ All notifications marked as read");
    } catch (error) {
      console.error("❌ Failed to mark all notifications as read:", error);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-6 w-6" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 p-2" align="end">
                {/* Header with Mark All as Read button */}
                {unreadNotifications.length > 0 && (
                  <>
                    <div className="flex items-center justify-between p-2 border-b">
                      <span className="text-sm font-medium text-gray-700">
                        {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Mark all as read
                      </Button>
                    </div>
                  </>
                )}

                {/* Notifications list */}
                {unreadNotifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {unreadNotifications.map((notification: any) => (
                      <div
                        key={notification._id}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                      >
                        {/* Notification content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-medium text-gray-900 capitalize">
                              {notification.type?.replace(/_/g, ' ')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification._id)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-100"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-400 block mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No unread notifications</p>
                  </div>
                )}

                {/* View All Notifications link */}
                {unreadNotifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      {/* <Link 
                        href="/user/notifications" 
                        className="w-full text-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        View all notifications
                      </Link> */}
                    </DropdownMenuItem>
                  </>
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