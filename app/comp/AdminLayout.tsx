"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation"; // Add useRouter
import Link from "next/link";
import { Menu, X, Home, Users, CheckSquare, Truck, LogOut } from "lucide-react";
import { adminApi } from "@/services/adminApi"; // Import adminApi

interface SidebarLinkProps {
  href: string;
  icon: ReactNode;
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ href, icon, active, children, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
      active ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`}
  >
    {icon}
    <span>{children}</span>
  </Link>
);

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); // Add router for programmatic navigation

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setIsSidebarOpen(false);
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

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = async () => {
    try {
      await adminApi.logout(); // Call the logout API
      closeSidebar(); // Close sidebar on mobile
      router.push("/admin/login"); // Redirect to login page
      router.refresh(); // Force refresh to ensure middleware re-evaluates
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect to login page even if API call fails
      router.push("/admin/login");
      router.refresh();
    }
  };

  const navigationItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: <Home size={18} /> },
    { name: "User Management", href: "/admin/usermanagement", icon: <Users size={18} /> },
    { name: "User Verification", href: "/admin/dashboard/user-verification", icon: <CheckSquare size={18} /> },
    { name: "Vehicle Verification", href: "/admin/vehicleverification", icon: <CheckSquare size={18} /> },
    { name: "Vehicle Management", href: "/admin/dashboard/vehicles", icon: <Truck size={18} /> },
  ];

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md z-10">
        <div className="flex items-center justify-between p-4">
          <button onClick={toggleSidebar} className="text-gray-400 hover:text-white focus:outline-none">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {isMobile && isSidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={closeSidebar} />
        )}

        <div
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${isMobile ? "fixed top-0 pt-16" : "relative"}
            w-64 h-full bg-gray-800 transition-transform duration-300 ease-in-out flex flex-col z-10`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="text-xl font-semibold text-gray-200">ezRides</div>
            {isMobile && (
              <button onClick={closeSidebar} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
            {navigationItems.map((item) => (
              <SidebarLink
                key={item.name}
                href={item.href}
                icon={item.icon}
                active={pathname === item.href}
                onClick={closeSidebar}
              >
                {item.name}
              </SidebarLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-gray-300 hover:bg-gray-700 hover:text-white w-full text-left"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-auto bg-gray-900 p-6 transition-all duration-300">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;