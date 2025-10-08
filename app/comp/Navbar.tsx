"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Check, 
  CheckCircle2, 
  LogOut, 
  User, 
  Car, 
  Users, 
  Shield,
  Home,
  Menu,
  X
} from "lucide-react";
import { clientApiService } from "@/services/client/client-api";
import useAuth from "../hooks/useAuth";
import { useSocketStore } from "../stores/socketStore";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { socket, isConnected, connect } = useSocketStore();

  // Memoized notification handler to prevent unnecessary re-renders
  const handleNewNotification = useCallback((notification: any) => {
    console.log("📢 New notification received via socket:", notification);
    
    // Use functional update to ensure we have the latest state
    setUnreadNotifications((prev) => {
      const exists = prev.some((n) => n._id === notification._id);
      if (!exists) {
        console.log("➕ Adding new notification to state");
        return [...prev, { ...notification, _id: notification._id || Date.now().toString() }];
      }
      console.log("⏭️ Notification already exists, skipping");
      return prev;
    });
  }, []);

  const fetchNotifications = useCallback(async (userId: string | undefined) => {
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
  }, []);

  // Authentication effect
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
  }, [status, session, user?._id, isConnected, connect, fetchNotifications]);

  // Socket effect - separated from auth effect
  useEffect(() => {
    if (socket && user?._id) {
      console.log("🔌 Socket connected, setting up notification listener for user:", user._id);
      
      // Set up event listeners
      socket.on("newNotification", handleNewNotification);
      
      // Test socket connection
      socket.emit("ping", (response: any) => {
        console.log("📡 Socket ping response:", response);
      });

      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up socket listener");
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, user?._id, handleNewNotification]);

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
      setUnreadNotifications(prev => prev.filter((n: any) => n._id !== notificationId));
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

  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return "U";
  };

  const NavigationLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`${mobile ? 'flex flex-col space-y-4' : 'hidden md:flex items-center space-x-8'}`}>
      <Link 
        href="/" 
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Home className="h-4 w-4" />
        Home
      </Link>
      <Link 
        href="/user/ride" 
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Car className="h-4 w-4" />
        Start Ride
      </Link>
      <Link 
        href="/user/JoinRide" 
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Users className="h-4 w-4" />
        Join Ride
      </Link>
      <Link 
        href="/safety" 
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Shield className="h-4 w-4" />
        Safety
      </Link>
    </div>
  );

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RideEzy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationLinks />

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn && !isLoading && (
              <>
                {/* Notifications Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                      <Bell className="h-5 w-5 text-gray-600" />
                      {unreadNotifications.length > 0 && (
                        <Badge 
                          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white"
                        >
                          {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-96 p-0" align="end">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                      <div>
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <p className="text-sm text-gray-500">
                          {unreadNotifications.length} unread {unreadNotifications.length !== 1 ? 'notifications' : 'notification'}
                        </p>
                      </div>
                      {unreadNotifications.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark all read
                        </Button>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                      {unreadNotifications.length > 0 ? (
                        unreadNotifications.map((notification: any) => (
                          <div
                            key={notification._id}
                            className="flex items-start gap-3 p-4 hover:bg-gray-50 border-b border-gray-100 group transition-colors"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {notification.type?.replace(/_/g, ' ')}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification._id)}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-green-100"
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                              </div>
                              <p className="text-sm text-gray-600 mb-2 break-words">
                                {notification.message}
                              </p>
                              <span className="text-xs text-gray-400">
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                          <Bell className="h-12 w-12 mb-3 text-gray-300" />
                          <p className="text-sm">No unread notifications</p>
                          <p className="text-xs text-gray-400 mt-1">We'll notify you when something arrives</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {unreadNotifications.length > 0 && (
                      <div className="p-3 border-t bg-gray-50">
                        <DropdownMenuItem asChild className="w-full justify-center cursor-pointer">
                       
                        </DropdownMenuItem>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 h-10 px-3 rounded-full hover:bg-gray-100">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.image} alt={user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700 hidden lg:block">
                        {user?.name || 'User'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/user/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/user/vehicles" className="flex items-center gap-2 cursor-pointer">
                        <Car className="h-4 w-4" />
                        My Vehicles
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/user/wallet" className="flex items-center gap-2 cursor-pointer">
                        <Users className="h-4 w-4" />
                        Wallet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-red-600 cursor-pointer focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {!isLoggedIn && (
              <div className="flex items-center space-x-3">
                <Link href="/user/login">
                  <Button variant="ghost" className="text-gray-700 hover:text-blue-600">
                    Login
                  </Button>
                </Link>
                <Link href="/user/signup">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {isLoggedIn && !isLoading && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                    <Bell className="h-5 w-5 text-gray-600" />
                    {unreadNotifications.length > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white"
                      >
                        {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 p-0" align="end">
                  {/* Same notification content as desktop but adjusted for mobile */}
                  <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                    <div>
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <p className="text-sm text-gray-500">
                        {unreadNotifications.length} unread
                      </p>
                    </div>
                    {unreadNotifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark all
                      </Button>
                    )}
                  </div>
                  {/* ... rest of notification content ... */}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <div className="flex flex-col h-full">
                  {/* User Info */}
                  {isLoggedIn && user && (
                    <div className="flex items-center space-x-3 p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  )}

                  {/* Mobile Navigation */}
                  <div className="flex-1 p-4">
                    <NavigationLinks mobile />
                  </div>

                  {/* Mobile Actions */}
                  <div className="p-4 border-t space-y-3">
                    {isLoggedIn ? (
                      <>
                        <Link href="/user/profile" className="block">
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <User className="h-4 w-4" />
                            Profile
                          </Button>
                        </Link>
                        <Button 
                          onClick={handleLogout}
                          variant="outline" 
                          className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Link href="/user/login" className="block">
                          <Button variant="outline" className="w-full">
                            Login
                          </Button>
                        </Link>
                        <Link href="/user/signup" className="block">
                          <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                            Sign Up
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;