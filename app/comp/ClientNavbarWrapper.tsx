"use client";

import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("./Navbar"), {
  ssr: false,
  loading: () => (
    <nav className="bg-gray-300 p-4 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">RideEzy</div>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 rounded hover:bg-gray-100">Login</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Sign Up</button>
        </div>
      </div>
    </nav>
  ),
});

export default function ClientNavbarWrapper() {
  return <Navbar />;
}