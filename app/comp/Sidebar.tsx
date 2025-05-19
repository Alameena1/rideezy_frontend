"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";

interface SidebarItem {
  icon: string;
  label: string;
  active: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeItem?: string;
  items: SidebarItem[];
  children?: ReactNode;
}

export default function Sidebar({
  isOpen,
  toggleSidebar,
  activeItem,
  items,
  children,
}: SidebarProps) {
  const router = useRouter();

  const handleItemClick = (label: string) => {
    toggleSidebar();
    switch (label) {
      case "Profile":
        router.push("/user/profile");
        break;
      case "Vehicles":
        router.push("/user/vehicles");
        break;
      case "Rides":
        router.push("/user/RideDetails");
        break;
      case "Subscription":
        router.push("/user/subscription");
        break;
      default:
        break;
    }
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-16 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute top-4 right-4 p-2 lg:hidden"
          onClick={toggleSidebar}
        >
          ✕
        </button>

        <div className="flex h-full flex-col items-center py-6">
          <nav className="flex-1 space-y-8 w-full">
            {items.map((item) => (
              <button
                key={item.label}
                className={`flex flex-col items-center justify-center w-full text-xs ${
                  item.active ? "text-blue-500" : "text-gray-400"
                }`}
                onClick={() => handleItemClick(item.label)}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          {children}
        </div>
      </aside>
    </>
  );
}