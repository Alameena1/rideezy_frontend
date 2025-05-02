// app/comp/MainLayout.tsx
"use client";

import { ReactNode, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

interface SidebarItem {
  icon: string;
  label: string;
  active: boolean;
}

interface MainLayoutProps {
  children: ReactNode;
  activeItem: string;
}

export default function MainLayout({ children, activeItem }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sidebarItems: SidebarItem[] = [
    { icon: "👤", label: "Profile", active: activeItem === "Profile" },
    { icon: "🚗", label: "Vehicles", active: activeItem === "Vehicles" },
    { icon: "🛞", label: "Rides", active: activeItem === "Rides" },
    { icon: "👑", label: "Subscription", active: activeItem === "Subscription" },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          items={sidebarItems}
          activeItem={activeItem}
        />
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={toggleSidebar}
          ></div>
        )}
        <main className="flex-1 p-4 lg:p-8">
          <button
            className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-md bg-white shadow-md"
            onClick={toggleSidebar}
          >
            <div className="w-6 flex flex-col gap-1">
              <span className="h-0.5 w-full bg-gray-600 block"></span>
              <span className="h-0.5 w-full bg-gray-600 block"></span>
              <span className="h-0.5 w-full bg-gray-600 block"></span>
            </div>
          </button>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}