"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Car, 
  MapPin, 
  Crown, 
  Users, 
  Wallet, 
  MessageCircle,
  X,
  ChevronRight
} from "lucide-react";

interface SidebarItem {
  icon: string;
  label: string;
  active: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeItem?: string;
  items?: SidebarItem[]; // Make items optional
  children?: ReactNode;
}

// Icon mapping for better UI
const iconMap: { [key: string]: ReactNode } = {
  "Profile": <User className="h-5 w-5" />,
  "Vehicles": <Car className="h-5 w-5" />,
  "Rides": <MapPin className="h-5 w-5" />,
  "Subscription": <Crown className="h-5 w-5" />,
  "Joined Ride": <Users className="h-5 w-5" />,
  "Wallet": <Wallet className="h-5 w-5" />,
  "Chat": <MessageCircle className="h-5 w-5" />,
};

// Default sidebar items as fallback
const defaultSidebarItems: SidebarItem[] = [
  { icon: "👤", label: "Profile", active: false },
  { icon: "🚗", label: "Vehicles", active: false },
  { icon: "🛣️", label: "Rides", active: false },
  { icon: "👑", label: "Subscription", active: false },
  { icon: "🤝", label: "Joined Ride", active: false },
  { icon: "💰", label: "Wallet", active: false },
  { icon: "💬", label: "Chat", active: false },
];

export default function Sidebar({
  isOpen,
  toggleSidebar,
  activeItem,
  items = defaultSidebarItems, // Provide default value
  children,
}: SidebarProps) {
  const router = useRouter();

  // Safe items with fallback
  const safeItems = items || defaultSidebarItems;

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
      case "Joined Ride":
        router.push("/user/joinedRideDetails");
        break;
      case "Wallet":
        router.push("/user/wallet");
        break;
      case "Chat":
        router.push("/user/chat"); 
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:relative lg:z-30 lg:translate-x-0 lg:w-64 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Rideezy</h1>
              <p className="text-gray-500 text-sm">User Dashboard</p>
            </div>
          </div>
          
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            onClick={toggleSidebar}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            
            {/* Safe mapping with fallback */}
            {safeItems && safeItems.length > 0 ? (
              safeItems.map((item) => (
                <button
                  key={item.label}
                  className={`flex items-center justify-between w-full p-3 rounded-lg transition-all duration-200 group ${
                    item.active 
                      ? "bg-blue-50 border border-blue-200 text-blue-700 shadow-sm" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                  }`}
                  onClick={() => handleItemClick(item.label)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      item.active 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 group-hover:bg-gray-200 text-gray-500 group-hover:text-gray-700"
                    }`}>
                      {iconMap[item.label] || <span className="text-lg">{item.icon}</span>}
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  
                  {item.active && (
                    <ChevronRight className="h-4 w-4 text-blue-500" />
                  )}
                </button>
              ))
            ) : (
              // Fallback UI when no items are available
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No menu items available</p>
              </div>
            )}
          </nav>

          {/* Additional Content */}
          {children && (
            <div className="mt-6 px-3">
              {children}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
            <Crown className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <h3 className="text-gray-900 font-semibold text-sm">Upgrade to Pro</h3>
            <p className="text-gray-600 text-xs mt-1">Unlock premium features</p>
            <button 
              onClick={() => handleItemClick("Subscription")}
              className="mt-2 w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}