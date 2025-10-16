import { Badge } from "@/components/ui/badge";
import { Clock, Navigation, AlertTriangle, X } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const baseClasses = "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium";
  
  switch (status) {
    case "Pending":
      return (
        <Badge className={`${baseClasses} bg-blue-100 text-blue-800 border-blue-200`}>
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>
      );
    case "Started":
      return (
        <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-200`}>
          <Navigation className="h-3 w-3" />
          In Progress
        </Badge>
      );
    case "Completed":
      return (
        <Badge className={`${baseClasses} bg-gray-100 text-gray-800 border-gray-200`}>
          Completed
        </Badge>
      );
    case "EmergencyStopped":
      return (
        <Badge className={`${baseClasses} bg-orange-100 text-orange-800 border-orange-200`}>
          <AlertTriangle className="h-3 w-3" />
          Emergency Stop
        </Badge>
      );
    case "Cancelled":
      return (
        <Badge className={`${baseClasses} bg-red-100 text-red-800 border-red-200`}>
          <X className="h-3 w-3" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}