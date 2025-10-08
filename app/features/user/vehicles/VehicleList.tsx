"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import VehicleCard from "./VehicleCard";
import EmptyState from "./EmptyState";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insuranceNumber?: string;
  status: "Pending" | "Approved" | "Rejected";
  imageUrl: string;
  mileage: number;
  seatCapacity: number;
}

interface VehicleListProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  onDelete?: (vehicleId: string) => void;
  onReapply?: (vehicleId: string) => void;
}

export default function VehicleList({ vehicles, isLoading, onDelete, onReapply }: VehicleListProps) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredVehicles =
    activeTab === "all" ? vehicles : vehicles.filter((vehicle) => vehicle.status.toLowerCase() === activeTab);

  const getStatusCount = (status: string) => {
    return vehicles.filter(vehicle => vehicle.status.toLowerCase() === status).length;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="all" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                All Vehicles
                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-blue-100 text-blue-700">
                  {vehicles.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="approved" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Approved
                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-green-100 text-green-700">
                  {getStatusCount("approved")}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="pending" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Pending
                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-yellow-100 text-yellow-700">
                  {getStatusCount("pending")}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="rejected" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Rejected
                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-red-100 text-red-700">
                  {getStatusCount("rejected")}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 border-0 shadow-sm">
                    <div className="flex animate-pulse space-x-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <EmptyState />
            ) : filteredVehicles.length === 0 ? (
              <Card className="text-center py-12 border-0 bg-gray-50">
                <CardContent>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Car className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No vehicles found</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    No vehicles match the selected filter. Try a different category.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle._id}
                    vehicle={vehicle}
                    onDelete={onDelete}
                    onReapply={onReapply}
                  />
                ))}
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}