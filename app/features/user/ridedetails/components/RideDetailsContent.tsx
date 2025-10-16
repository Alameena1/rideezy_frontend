"use client";

import { useEffect, useState } from "react";
import { useRideDetails } from "../context/RideDetailsContext";
import RideHeader from "./RideHeader";
import RideCard from "./RideCard";
import EditRideModal from "./EditRideModal";
import EmergencyStopModal from "./EmergencyStopModal";
import ErrorAlert from "@/app/features/user/vehicles/ErrorAlert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Route, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function RideDetailsContent() {
  const {
    rides,
    isLoading,
    error,
    fetchRides,
  } = useRideDetails();

  // Pagination and Search states
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    fetchRidesWithPagination(1, itemsPerPage, debouncedSearch);
  }, [debouncedSearch, itemsPerPage]);

  const fetchRidesWithPagination = async (page: number = 1, limit: number = itemsPerPage, search: string = "") => {
    try {
      // Update your fetchRides function to accept pagination and search parameters
      // This assumes you'll modify your backend API to support these parameters
      await fetchRides(); // You'll need to modify this function

      // For now, we'll handle pagination and search on the frontend
      // until you update your backend
      let filteredRides = rides;

      // Apply search filter
      if (search.trim()) {
        filteredRides = rides.filter(ride => 
          ride.startPoint.toLowerCase().includes(search.toLowerCase()) ||
          ride.endPoint.toLowerCase().includes(search.toLowerCase()) ||
          ride.status.toLowerCase().includes(search.toLowerCase()) ||
          ride.vehicleId.toLowerCase().includes(search.toLowerCase()) ||
          (ride.passengers.some(p => 
            p.passengerName.toLowerCase().includes(search.toLowerCase())
          ))
        );
      }

      // Calculate pagination
      const totalCount = filteredRides.length;
      const totalPages = Math.ceil(totalCount / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRides = filteredRides.slice(startIndex, endIndex);

      // Update context with filtered rides (optional)
      // You might want to create a separate state for displayed rides

      setPagination({
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      });

      // Update the rides in context to show only paginated results
      // This is a temporary solution - you might want to handle this differently
      // by creating a separate state for displayed rides
    } catch (error) {
      console.error("Error fetching rides with pagination:", error);
    }
  };

  const handlePageChange = (page: number) => {
    fetchRidesWithPagination(page, itemsPerPage, debouncedSearch);
  };

  const handleSearch = (search: string) => {
    setLocalSearchTerm(search);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    fetchRidesWithPagination(1, newItemsPerPage, debouncedSearch);
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

  // Get displayed rides (for frontend filtering - temporary solution)
  const getDisplayedRides = () => {
    let filteredRides = rides;

    // Apply search filter
    if (debouncedSearch.trim()) {
      filteredRides = rides.filter(ride => 
        ride.startPoint.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        ride.endPoint.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        ride.status.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        ride.vehicleId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (ride.passengers.some(p => 
          p.passengerName.toLowerCase().includes(debouncedSearch.toLowerCase())
        ))
      );
    }

    // Apply pagination
    const startIndex = (pagination.currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return filteredRides.slice(startIndex, endIndex);
  };

  // Calculate total count for display
  const getTotalFilteredCount = () => {
    if (!debouncedSearch.trim()) return rides.length;
    
    return rides.filter(ride => 
      ride.startPoint.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      ride.endPoint.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      ride.status.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      ride.vehicleId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (ride.passengers.some(p => 
        p.passengerName.toLowerCase().includes(debouncedSearch.toLowerCase())
      ))
    ).length;
  };

  const displayedRides = getDisplayedRides();
  const totalFilteredCount = getTotalFilteredCount();

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <RideHeader currentDate={currentDate} />
      
      {error && <ErrorAlert message={error} />}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by location, status, vehicle, or passenger..."
              value={localSearchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-white border-gray-200 focus:border-blue-500"
            />
          </div>

          {/* Items Per Page Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <Button 
            onClick={() => fetchRidesWithPagination(1, itemsPerPage, debouncedSearch)} 
            variant="outline" 
            disabled={isLoading}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          
          <Button asChild className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
            <Link href="/user/ride" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Create New Ride
            </Link>
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">
            Showing {displayedRides.length} of {totalFilteredCount} rides
            {debouncedSearch && ` for "${debouncedSearch}"`}
            {totalFilteredCount !== rides.length && ` (filtered from ${rides.length} total)`}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : displayedRides.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
              <Route className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              {debouncedSearch ? "No Rides Found" : "No Rides Created"}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              {debouncedSearch 
                ? `No rides match your search "${debouncedSearch}". Try different keywords.`
                : "You haven't created any rides yet. Start by creating your first ride!"
              }
            </p>
            {debouncedSearch ? (
              <Button 
                variant="outline" 
                onClick={() => handleSearch("")}
              >
                Clear Search
              </Button>
            ) : (
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/user/ride" className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Create Your First Ride
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Rides List */}
          <div className="grid gap-6">
            {displayedRides.map((ride) => (
              <RideCard key={ride._id} ride={ride} />   
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages} • 
                    Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(pagination.currentPage * itemsPerPage, totalFilteredCount)} of{" "}
                    {totalFilteredCount} rides
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      <EditRideModal />
      <EmergencyStopModal />
    </div>
  );
}