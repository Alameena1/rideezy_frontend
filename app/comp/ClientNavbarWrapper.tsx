// app/comp/ClientNavbarWrapper.tsx
"use client";

import dynamic from 'next/dynamic';

// Dynamically import Navbar with no SSR to avoid server-side hook usage
const Navbar = dynamic(() => import('./Navbar'), {
  ssr: false,
  loading: () => (
    <nav className="bg-gray-300 p-4 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">RideEzy</div>
        <div className="flex items-center space-x-4">
          <div>Loading...</div>
        </div>
      </div>
    </nav>
  )
});

export default function ClientNavbarWrapper() {
  return <Navbar />;
}