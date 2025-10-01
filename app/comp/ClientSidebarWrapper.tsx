"use client";

import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("./Sidebar"), {
  ssr: false,
  loading: () => (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-16">
      <div className="flex h-full flex-col items-center py-6">
        <nav className="flex-1 space-y-8 w-full">
          <button className="flex flex-col items-center justify-center w-full text-xs text-gray-400">
            <span className="text-xl mb-1">👤</span>
            <span>Profile</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full text-xs text-gray-400">
            <span className="text-xl mb-1">🚗</span>
            <span>Vehicles</span>
          </button>
          {/* Add other sidebar items as needed */}
        </nav>
      </div>
    </aside>
  ),
});

export default function ClientSidebarWrapper({ isOpen, toggleSidebar, activeItem, items }: {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeItem?: string;
  items: { icon: string; label: string; active: boolean }[];
}) {
  return <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} activeItem={activeItem} items={items} />;
}