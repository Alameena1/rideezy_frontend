"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, Car } from "lucide-react";
import VehicleCard from "./VehicleCard";
import EmptyState from "./EmptyState";
import { useVehicleStore } from "../../../stores/vehicleStore";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insurance?: {
    number: string;
    image: string;
    startDate: string;
    endDate: string;
    status: 'Active' | 'Expired' | 'Pending';
  };
  pollution?: {
    number: string;
    image: string;
    startDate: string;
    endDate: string;
    status: 'Active' | 'Expired' | 'Pending';
  };
  status: "Pending" | "Approved" | "Rejected";
  vehicleImage: string;
  mileage: number;
  seatCapacity: number;
}

interface VehicleListProps {
  onDelete?: (vehicleId: string) => void;
  onReapply?: (vehicleId: string) => void;
}

export default function VehicleList({ onDelete, onReapply }: VehicleListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const { 
    vehicles, 
    isLoading, 
    pagination, 
    searchTerm,
    fetchVehicles, 
    setSearchTerm 
  } = useVehicleStore();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  // Fetch vehicles when page changes or search term changes
  useEffect(() => {
    fetchVehicles(pagination.currentPage, 10, debouncedSearch);
  }, [pagination.currentPage, debouncedSearch, fetchVehicles]);

  const handlePageChange = (page: number) => {
    fetchVehicles(page, 10, debouncedSearch);
  };

  const handleSearch = (search: string) => {
    setLocalSearchTerm(search);
    // Reset to first page when searching
    if (search !== debouncedSearch) {
      fetchVehicles(1, 10, search);
    }
  };

  const filteredVehicles =
    activeTab === "all" 
      ? vehicles 
      : activeTab === "expired"
      ? vehicles.filter(vehicle => 
          vehicle.insurance?.status === 'Expired' || 
          vehicle.pollution?.status === 'Expired'
        )
      : vehicles.filter((vehicle) => vehicle.status.toLowerCase() === activeTab);

  const getStatusCount = (status: string) => {
    return vehicles.filter(vehicle => vehicle.status.toLowerCase() === status).length;
  };

  const getExpiredDocumentsCount = () => {
    return vehicles.filter(vehicle => 
      vehicle.insurance?.status === 'Expired' || 
      vehicle.pollution?.status === 'Expired'
    ).length;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by vehicle name, license plate, insurance or pollution number..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-200 focus:border-blue-500"
              />
            </div>
          </div>

          <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6 bg-gray-100 p-1 rounded-lg">
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
              <TabsTrigger 
                value="expired" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Expired Docs
                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-orange-100 text-orange-700">
                  {getExpiredDocumentsCount()}
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
              <>
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

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {((pagination.currentPage - 1) * 10) + 1} to{" "}
                      {Math.min(pagination.currentPage * 10, pagination.totalCount)} of{" "}
                      {pagination.totalCount} vehicles
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}