import { Calendar } from "lucide-react";

interface RideHeaderProps {
  currentDate: string;
}

export default function RideHeader({ currentDate }: RideHeaderProps) {
  return (
    <div className="text-center space-y-2">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Your Rides
      </h1>
      <p className="text-gray-600 text-lg">Manage and track your ride schedules</p>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Calendar className="h-4 w-4" />
        <span>{currentDate}</span>
      </div>
    </div>
  );
}