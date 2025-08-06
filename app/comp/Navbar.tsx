"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { apiService } from "../../services/api";
import useAuth from "../hooks/useAuth";
import { io } from "socket.io-client";

const Navbar = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user, isAuthenticated, isLoading } = useAuth();
  const socket = useRef<any>(null);
  const retryCount = useRef(0);
  const maxRetries = 5;

const connectSocket = () => {
  if (socket.current) {
    socket.current.disconnect();
  }

  if (retryCount.current >= maxRetries) {
    console.error(`Max retry attempts (${maxRetries}) reached for Socket.IO connection to ws://localhost:3001/`);
    return;
  }

  const token = Cookies.get("accessToken");
  socket.current = io("http://localhost:3001", {
    withCredentials: true,
    transports: ["websocket"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: maxRetries,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000, // Add timeout of 10 seconds
  });

  const handleConnect = () => {
    console.log("Socket.IO connected at", new Date().toISOString());
    retryCount.current = 0;
    if (user?._id) {
      socket.current.emit("join", user._id, (error?: string) => {
        if (error) console.error("Join error:", error);
        else console.log("Joined Socket.IO room for user:", user._id);
      });
      fetchNotifications(user._id); // Fetch missed notifications on connect
    }
  };

  const handleNewNotification = (notification: any) => {
  console.log("Handler active, received notification:", notification);
  setUnreadNotifications((prev) => {
    const exists = prev.some((n) => n._id === notification._id);
    return exists ? prev : [...prev, { ...notification, _id: notification._id || Date.now().toString() }]; // Ensure _id is present
  });
  console.log("New notification received, updated state:", unreadNotifications);
};

  const handleDisconnect = (reason: string) => {
    console.log("Socket.IO disconnected at", new Date().toISOString(), "Reason:", reason);
    socket.current = null;
    if (user?._id && retryCount.current < maxRetries) {
      retryCount.current += 1;
      console.log(`Retrying Socket.IO connection (Attempt ${retryCount.current}/${maxRetries})...`);
      setTimeout(connectSocket, Math.min(2000 * Math.pow(2, retryCount.current), 5000));
    }
  };

  socket.current.on("connect", handleConnect);
  socket.current.on("newNotification", handleNewNotification);
  socket.current.on("disconnect", handleDisconnect);

  return () => {
    if (socket.current) {
      socket.current.off("connect", handleConnect);
      socket.current.off("newNotification", handleNewNotification);
      socket.current.off("disconnect", handleDisconnect);
      socket.current.disconnect();
    }
  };
};

  useEffect(() => {
    const token = Cookies.get("accessToken");
    setIsUserLoggedIn(!!token);
    console.log("Cookie Token:", token);
    console.log("User on mount:", user);

    if (token && user?._id) {
      fetchNotifications(user._id);
      connectSocket();
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [user?._id]);

  useEffect(() => {
    console.log("useEffect triggered, status:", status, "session:", session, "user:", user);
    if (status === "authenticated" && session?.user?.id) {
      setIsUserLoggedIn(true);
      console.log("Authenticated, userId from session:", session.user.id);
      fetchNotifications(session.user.id || user?._id);
      if (user?._id && !socket.current?.connected) {
        connectSocket();
      }
    } else if (status === "unauthenticated") {
      const token = Cookies.get("accessToken");
      setIsUserLoggedIn(!!token);
      console.log("Unauthenticated, Token:", token);
      if (socket.current) {
        socket.current.disconnect();
      }
    }
  }, [status, session, user?._id]);

  const fetchNotifications = async (userId: string | undefined) => {
    if (!userId) {
      console.error("No userId provided for fetching notifications");
      return;
    }
    console.log("Fetching notifications for userId:", userId);
    if (!apiService.notification) {
      console.error("notificationApi not initialized");
      return;
    }
    try {
      const response = await apiService.notification.getUserNotifications(userId);
      console.log("API Response:", response);
      const { notifications } = response;
      const unread = notifications.filter((n: any) => !n.isRead);
      setUnreadNotifications((prev) => {
        const isDifferent = JSON.stringify(prev) !== JSON.stringify(unread);
        return isDifferent ? unread : prev;
      });
      console.log("Unread Notifications set to:", unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleLogout = () => {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    setIsUserLoggedIn(false);
    setUnreadNotifications([]);
    if (socket.current) {
      socket.current.disconnect();
    }
    if (session) {
      signOut({ callbackUrl: "/user/login" });
    } else {
      router.push("/user/login");
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.notification.markAsRead(notificationId);
      setUnreadNotifications(unreadNotifications.filter((n: any) => n._id !== notificationId));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const isLoggedIn = isAuthenticated || isUserLoggedIn;
  console.log("isLoggedIn:", isLoggedIn, "Unread Count:", unreadNotifications.length);

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