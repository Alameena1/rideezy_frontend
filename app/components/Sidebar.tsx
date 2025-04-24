"use client";

import { ReactNode } from "react"; 
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SidebarItem {
  icon: string;
  label: string;
  active: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeItem?: string;
  items?: SidebarItem[];
  children?: ReactNode;
}

export default function Sidebar({
  isOpen,
  toggleSidebar,
  activeItem = "Profile",
  items: customItems,
  children,
}: SidebarProps) {
  const router = useRouter(); 

  const defaultItems: SidebarItem[] = [
    { icon: "👤", label: "Profile", active: false },
    { icon: "🚗", label: "Vehicles", active: false },
    { icon: "📄", label: "Documents", active: false },
    { icon: "👑", label: "Subscription", active: false },
  ];

  const finalItems = customItems || defaultItems;

  const itemsWithActive = finalItems.map((item) => ({
    ...item,
    active: item.label === activeItem,
  }));

  const handleItemClick = (label: string) => {
    toggleSidebar(); 
    switch (label) {
      case "Vehicles":
        router.push("/user/vehicles");
        break;
      case "Profile":
        router.push("/user/profile");
        break;
      case "Documents":
        router.push("/documents");
        break;
      case "Subscription":
        router.push("/subscription");
        break;
      default:
        break;
    }
  };

  return (
    <>
      <button
        className="fixed top-20 left-4 z-40 p-2 rounded-md bg-white shadow-md lg:hidden"
        onClick={toggleSidebar}
      >
        <div className="w-6 flex-col gap-1">
          <span className="h-0.5 w-full bg-gray-600 block"></span>
          <span className="h-0.5 w-full bg-gray-600 block"></span>
          <span className="h-0.5 w-full bg-gray-600 block"></span>
        </div>
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-16 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          className="absolute top-4 right-4 p-2 lg:hidden"
          onClick={toggleSidebar}
        >
          ✕
        </button>

        <div className="flex h-full flex-col items-center py-6">
          <nav className="flex-1 space-y-8 w-full">
            {itemsWithActive.map((item) => (
              <button
                key={item.label}
                className={`flex flex-col items-center justify-center w-full text-xs ${item.active ? "text-blue-500" : "text-gray-400"}`}
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

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
}