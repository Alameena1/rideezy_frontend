// app/admin/layout.tsx - ENHANCED WITH SHADCN
"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, Home, Users, CheckSquare, Truck, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface SidebarLinkProps {
  href: string;
  icon: ReactNode;
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  collapsed?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ 
  href, 
  icon, 
  active, 
  children, 
  onClick, 
  collapsed = false 
}) => (
  <TooltipProvider>
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative",
            "hover:bg-gray-700/80 hover:shadow-md",
            active 
              ? "bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg border-l-4 border-l-blue-500" 
              : "text-gray-300",
            collapsed ? "justify-center" : "px-3"
          )}
        >
          <div className={cn(
            "transition-transform duration-200",
            active ? "scale-110" : "group-hover:scale-105"
          )}>
            {icon}
          </div>
          {!collapsed && (
            <span className="font-medium tracking-wide">{children}</span>
          )}
          
          {/* Active indicator dot for collapsed state */}
          {collapsed && active && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
        </Link>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="bg-gray-800 border-gray-700 text-white">
          {children}
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
);

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setIsSidebarOpen(false);
        setIsCollapsed(false);
      } else {
        setIsMobile(false);
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeSidebar = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleLogout = async () => {
    try {
      console.log("🔄 Starting admin logout...");
      await signOut({ 
        redirect: false,
        callbackUrl: "/admin/login"
      });
      
      console.log("✅ NextAuth signOut completed");
      localStorage.removeItem("admin-data");
      
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("❌ Logout failed:", error);
      router.push("/admin/login");
      router.refresh();
    }
  };

  const navigationItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: <Home size={20} />, },
    { name: "User Management", href: "/admin/usermanagement", icon: <Users size={20} />, },
    { name: "User Verification", href: "/admin/userIdVerification", icon: <CheckSquare size={20} />,},
    { name: "Vehicle Verification", href: "/admin/vehicleverification", icon: <CheckSquare size={20} />,},
    { name: "Subscription", href: "/admin/subscriptionmanagement", icon: <Truck size={20} />,},
    { name: "Ride Management", href: "/admin/ridemanagement", icon: <Truck size={20} /> },
  ];

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-gray-700 transition-all duration-300",
        isCollapsed && "flex-col gap-2"
      )}>
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          isCollapsed && "flex-col"
        )}>
          <div className={cn(
            "text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent transition-all duration-300",
            isCollapsed ? "text-2xl" : "text-xl"
          )}>
            RE
          </div>
          {!isCollapsed && (
            <div className="text-lg font-semibold text-gray-200">RideEzy</div>
          )}
        </div>
        
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-white"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-2 px-3">
        {navigationItems.map((item) => (
          <SidebarLink
            key={item.name}
            href={item.href}
            icon={item.icon}
            active={pathname === item.href}
            onClick={closeSidebar}
            collapsed={isCollapsed && !isMobile}
          >
            <div className="flex items-center justify-between w-full">
              <span>{item.name}</span>
            </div>
          </SidebarLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "flex items-center gap-3 w-full justify-start text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200",
            isCollapsed && !isMobile && "justify-center"
          )}
        >
          <LogOut size={20} />
          {(!isCollapsed || isMobile) && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 shadow-lg z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            {isMobile ? (
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Menu size={24} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 bg-gray-800 border-gray-700 p-0">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50"
              >
                <Menu size={24} />
              </Button>
            )}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">
              Welcome back, Admin
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div
            className={cn(
              "bg-gray-800/90 backdrop-blur-md border-r border-gray-700 transition-all duration-300 ease-in-out flex flex-col shadow-xl",
              isCollapsed ? "w-16" : "w-64"
            )}
          >
            {sidebarContent}
          </div>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          !isMobile && !isCollapsed ? "ml-0" : "",
          !isMobile && isCollapsed ? "ml-0" : ""
        )}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;