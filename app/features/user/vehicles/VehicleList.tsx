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
import { useSession } from "next-auth/react";

interface VehicleListProps {
  onDelete?: (vehicleId: string) => void;
  onReapply?: (vehicleId: string) => void;
}

// Helper function to check if a string is a public_id (not a full URL)
const isPublicId = (imageString: string): boolean => {
  return !imageString.startsWith('http') && !imageString.includes('/') && imageString.length > 0;
};

// Function to generate direct URL from public_id (fallback)
const generateDirectUrl = (publicId: string): string => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
};

export default function VehicleList({ onDelete, onReapply }: VehicleListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [processedVehicles, setProcessedVehicles] = useState<any[]>([]);
  const { data: session } = useSession();
  
  const { 
    vehicles, 
    isLoading, 
    error,
    pagination,
    fetchVehicles
  } = useVehicleStore();

  // Function to generate signed URL
  const generateSignedUrl = async (publicId: string): Promise<string> => {
    const token = session?.user?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }

    console.log("Generating signed URL for public_id:", publicId);

    try {
      const response = await fetch("/api/signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          public_id: publicId,
          expiration: 3600,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.warn("Signed URL generation failed, using direct URL:", data.error);
        return generateDirectUrl(publicId);
      }

      console.log("Generated signed URL:", data.signed_url);
      return data.signed_url;
    } catch (error) {
      console.error("Signed URL API error, using direct URL:", error);
      return generateDirectUrl(publicId);
    }
  };

  // Process vehicles to handle both public_ids and URLs
  useEffect(() => {
    const processVehicleImages = async () => {
      console.log("Processing vehicles:", vehicles);
      
      const vehiclesWithProcessedImages = await Promise.all(
        vehicles.map(async (vehicle) => {
          try {
            // Process vehicle image
            let vehicleImageUrl = "/placeholder.svg";
            if (vehicle.vehicleImage) {
              if (isPublicId(vehicle.vehicleImage)) {
                console.log(`Processing vehicle image public_id: ${vehicle.vehicleImage}`);
                vehicleImageUrl = await generateSignedUrl(vehicle.vehicleImage);
              } else if (vehicle.vehicleImage.startsWith('http')) {
                console.log(`Using existing vehicle image URL: ${vehicle.vehicleImage}`);
                vehicleImageUrl = vehicle.vehicleImage;
              }
            }

            // Process insurance image
            let insuranceImageUrl = vehicle.insurance?.image || null;
            if (vehicle.insurance?.image && isPublicId(vehicle.insurance.image)) {
              console.log(`Processing insurance image public_id: ${vehicle.insurance.image}`);
              insuranceImageUrl = await generateSignedUrl(vehicle.insurance.image);
            }

            // Process pollution image
            let pollutionImageUrl = vehicle.pollution?.image || null;
            if (vehicle.pollution?.image && isPublicId(vehicle.pollution.image)) {
              console.log(`Processing pollution image public_id: ${vehicle.pollution.image}`);
              pollutionImageUrl = await generateSignedUrl(vehicle.pollution.image);
            }

            const processedVehicle = {
              ...vehicle,
              vehicleImage: vehicleImageUrl,
              insurance: vehicle.insurance ? {
                ...vehicle.insurance,
                image: insuranceImageUrl
              } : null,
              pollution: vehicle.pollution ? {
                ...vehicle.pollution,
                image: pollutionImageUrl
              } : null
            };

            console.log("Processed vehicle:", processedVehicle);
            return processedVehicle;

          } catch (error) {
            console.error("Failed to process vehicle images:", vehicle._id, error);
            // Fallback to direct URLs
            return {
              ...vehicle,
              vehicleImage: vehicle.vehicleImage && isPublicId(vehicle.vehicleImage) 
                ? generateDirectUrl(vehicle.vehicleImage) 
                : vehicle.vehicleImage || "/placeholder.svg",
              insurance: vehicle.insurance ? {
                ...vehicle.insurance,
                image: vehicle.insurance.image && isPublicId(vehicle.insurance.image)
                  ? generateDirectUrl(vehicle.insurance.image)
                  : vehicle.insurance.image
              } : null,
              pollution: vehicle.pollution ? {
                ...vehicle.pollution,
                image: vehicle.pollution.image && isPublicId(vehicle.pollution.image)
                  ? generateDirectUrl(vehicle.pollution.image)
                  : vehicle.pollution.image
              } : null
            };
          }
        })
      );
      
      console.log("All processed vehicles:", vehiclesWithProcessedImages);
      setProcessedVehicles(vehiclesWithProcessedImages);
    };

    if (vehicles.length > 0) {
      processVehicleImages();
    } else {
      setProcessedVehicles([]);
    }
  }, [vehicles, session]);

  // Handle image loading states
  const handleImageLoad = (vehicleId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [vehicleId]: false }));
  };

  const handleImageError = (vehicleId: string, imageUrl: string) => {
    console.error(`Failed to load image for vehicle ${vehicleId}: ${imageUrl}`);
    setImageLoadingStates(prev => ({ ...prev, [vehicleId]: false }));
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  // Fetch vehicles when tab, search, or page changes
  useEffect(() => {
    fetchVehicles(1, 10, debouncedSearch);
  }, [debouncedSearch, fetchVehicles]);

  // Handle tab change
  useEffect(() => {
    fetchVehicles(1, 10, debouncedSearch);
  }, [activeTab, fetchVehicles, debouncedSearch]);

  const handlePageChange = (page: number) => {
    fetchVehicles(page, 10, debouncedSearch);
  };

  const handleSearch = (search: string) => {
    setLocalSearchTerm(search);
  };

  // CLIENT-SIDE FILTERING FOR TABS
  const filteredVehicles = processedVehicles.filter(vehicle => {
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
    
    buttons.push(1);
    
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    if (startPage > 2) {
      buttons.push('...');
    }
    
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        buttons.push(i);
      }
    }
    
    if (endPage < totalPages - 1) {
      buttons.push('...');
    }
    
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
                      onImageLoad={() => handleImageLoad(vehicle._id)}
                      onImageError={(imageUrl) => handleImageError(vehicle._id, imageUrl)}
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

function setImageLoadingStates(arg0: (prev: any) => any) {
  throw new Error("Function not implemented.");
}
