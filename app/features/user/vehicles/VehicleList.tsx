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

// ... keep interfaces the same

export default function VehicleList({ onDelete, onReapply }: VehicleListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const { 
    vehicles, 
    isLoading, 
    error,
    pagination,
    fetchVehicles
  } = useVehicleStore();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  // Fetch vehicles when tab, search, or page changes
  useEffect(() => {
    fetchVehicles(1, 1, debouncedSearch);
  }, [debouncedSearch, fetchVehicles]);

  // Handle tab change
  useEffect(() => {
    // Note: For server-side filtering, you might need to modify the API
    // Currently using client-side filtering for tabs
    fetchVehicles(1, 1, debouncedSearch);
  }, [activeTab, fetchVehicles, debouncedSearch]);

  const handlePageChange = (page: number) => {
    fetchVehicles(page, 1, debouncedSearch);
  };

  const handleSearch = (search: string) => {
    setLocalSearchTerm(search);
  };

  // CLIENT-SIDE FILTERING FOR TABS (since API doesn't support tab filtering)
  const filteredVehicles = vehicles.filter(vehicle => {
    if (activeTab === "all") return true;
    if (activeTab === "expired") {
      return vehicle.insurance?.status === 'Expired' || vehicle.pollution?.status === 'Expired';
    }
    return vehicle.status.toLowerCase() === activeTab;
  });

  const getStatusCount = (status: string) => {
    return vehicles.filter(vehicle => vehicle.status.toLowerCase() === status).length;
  };

  const getExpiredDocumentsCount = () => {
    return vehicles.filter(vehicle => 
      vehicle.insurance?.status === 'Expired' || 
      vehicle.pollution?.status === 'Expired'
    ).length;
  };

  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];
    const { currentPage, totalPages } = pagination;
    
    if (totalPages <= 1) return [1];
    
    // Always show first page
    buttons.push(1);
    
    // Show pages around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis if needed
    if (startPage > 2) {
      buttons.push('...');
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        buttons.push(i);
      }
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      buttons.push('...');
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      buttons.push(totalPages);
    }
    
    return buttons;
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
                onChange={(e) => handleSearch(e.target.value)}
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
                    {debouncedSearch 
                      ? `No vehicles match your search "${debouncedSearch}". Try different keywords.`
                      : "No vehicles match the selected filter. Try a different category."
                    }
                  </p>
                  {debouncedSearch && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => handleSearch("")}
                    >
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Search Results Info */}
                {debouncedSearch && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Showing {filteredVehicles.length} of {pagination.totalCount} vehicles matching "{debouncedSearch}"
                    </p>
                  </div>
                )}

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

                {/* SERVER-SIDE PAGINATION */}
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
                        {generatePaginationButtons().map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              variant={pagination.currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          )
                        ))}
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