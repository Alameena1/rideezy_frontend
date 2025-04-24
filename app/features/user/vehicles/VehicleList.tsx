// VehicleList.tsx
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import VehicleCard from "./VehicleCard"
import EmptyState from "./EmptyState"

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

interface VehicleListProps {
  vehicles: Vehicle[]
  isLoading: boolean
  onDelete?: (vehicleId: string) => void // Add onDelete prop
}

export default function VehicleList({ vehicles, isLoading, onDelete }: VehicleListProps) {
  const [activeTab, setActiveTab] = useState("all")

  const filteredVehicles =
    activeTab === "all" ? vehicles : vehicles.filter((vehicle) => vehicle.status.toLowerCase() === activeTab)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Vehicles</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <EmptyState />
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No vehicles found in this category</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredVehicles.map((vehicle) => (
                <VehicleCard 
                  key={vehicle._id} 
                  vehicle={vehicle} 
                  onDelete={onDelete} // Pass onDelete prop
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}