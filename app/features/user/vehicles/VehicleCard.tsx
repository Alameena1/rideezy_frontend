import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"

interface Vehicle {
  _id: string
  vehicleName: string
  vehicleType: string
  licensePlate: string
  color?: string
  insuranceNumber?: string
  status: "Pending" | "Approved" | "Rejected"
  imageUrl: string
}

interface VehicleCardProps {
  vehicle: Vehicle
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "Rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
    }
  }

  return (
    <div className="overflow-hidden border rounded-lg">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-1/4 h-48 sm:h-auto">
          <img
            src={vehicle.imageUrl || "/placeholder.svg"}
            alt={vehicle.vehicleName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 p-4 sm:p-6 flex flex-col sm:flex-row justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">{vehicle.vehicleName}</h3>
                <Badge className={getStatusBadgeColor(vehicle.status)}>{vehicle.status}</Badge>
              </div>
              <p className="text-sm text-gray-500">{vehicle.vehicleType}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500 font-medium">License:</span> {vehicle.licensePlate}
              </div>
              <div>
                <span className="text-gray-500 font-medium">Color:</span> {vehicle.color || "N/A"}
              </div>
              <div>
                <span className="text-gray-500 font-medium">Insurance:</span> {vehicle.insuranceNumber || "N/A"}
              </div>
            </div>
          </div>
          <div className="flex sm:flex-col gap-2 mt-4 sm:mt-0">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Edit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
            <Button variant="destructive" size="sm" className="flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}