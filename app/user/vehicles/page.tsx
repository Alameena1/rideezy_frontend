"use client"
import { useState, useEffect } from "react"
import Navbar from "@/app/components/Navbar"
import Sidebar from "@/app/components/Sidebar"
import Footer from "@/app/components/Footer"
import useAuth from "@/app/hooks/useAuth"
import { apiService } from "@/services/api"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import VehicleForm from "../../features/user/vehicles/VehicleForm"
import VehicleList from "../../features/user/vehicles/VehicleList"
import ErrorAlert from "../../features/user/vehicles/ErrorAlert"

interface Vehicle {
  _id: string
  vehicleName: string
  vehicleType: string
  licensePlate: string
  color?: string
  insuranceNumber?: string
  vehicleImage?: string
  documentImage?: string
  status: "Pending" | "Approved" | "Rejected"
  imageUrl: string
}

export default function VehicleDetails() {
  useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isAddingVehicle, setIsAddingVehicle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const sidebarItems = [
    { icon: "👤", label: "Profile", active: false },
    { icon: "🚗", label: "Vehicles", active: true },
    { icon: "📄", label: "Documents", active: false },
    { icon: "👑", label: "Subscription", active: false },
  ]

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    setIsLoading(true)
    try {
      const response = await apiService.getVehicles()
      const fetchedVehicles = response.data.data.map((vehicle: any) => ({
        ...vehicle,
        imageUrl: vehicle.vehicleImage || "/placeholder.svg?height=200&width=300",
      }))
      setVehicles(fetchedVehicles)
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      setError("Failed to fetch vehicles. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVehicle = (newVehicle: Vehicle) => {
    setVehicles([...vehicles, newVehicle])
    setIsAddingVehicle(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} items={sidebarItems} />
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}
        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold">Your Vehicles</CardTitle>
                    <CardDescription>{currentDate}</CardDescription>
                  </div>
                  <button
                    onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                    className={`flex items-center gap-2 px-4 py-2 rounded ${isAddingVehicle ? "border border-gray-300" : "bg-blue-600 text-white"}`}
                  >
                    {isAddingVehicle ? "Cancel" : "Register New Vehicle"}
                  </button>
                </div>
              </CardHeader>
              <div className="p-6">
                {error && <ErrorAlert message={error} />}
                {isAddingVehicle ? (
                  <VehicleForm
                    onSubmit={handleAddVehicle}
                    onCancel={() => setIsAddingVehicle(false)}
                    setError={setError}
                  />
                ) : (
                  <VehicleList vehicles={vehicles} isLoading={isLoading} />
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}