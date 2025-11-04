"use client";

import { useState, useEffect } from "react";
import { adminClientApiService as apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Calendar,
  Shield,
  Leaf
} from "lucide-react";

interface Vehicle {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color: string;
  insuranceNumber: string;
  insuranceImage: string;
  insuranceEndDate: string;
  pollutionNumber: string;
  pollutionImage: string;
  pollutionEndDate: string;
  vehicleImage: string;
  status: "Pending" | "Approved" | "Rejected";
  note?: string;
  mileage: number;
  seatCapacity: number;
  createdAt: string;
}

interface PaginatedResponse {
  success: boolean;
  data: Vehicle[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface DocumentPreview {
  url: string;
  type: "vehicle" | "insurance" | "pollution";
  title: string;
  vehicle: {
    userName: string;
    licensePlate: string;
    vehicleName: string;
  };
}

// Helper function to check if a string is a public_id
const isPublicId = (imageString: string): boolean => {
  return !imageString.startsWith('http') && !imageString.includes('/') && imageString.length > 0;
};

// Function to generate signed URL
const generateSignedUrl = async (publicId: string): Promise<string> => {
  const response = await fetch("/api/signed-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      public_id: publicId,
      expiration: 3600,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to generate signed URL");
  }
  return data.signed_url;
};

export default function VehicleVerification() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [processedVehicles, setProcessedVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionNote, setRejectionNote] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(3);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Document preview states
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response: PaginatedResponse = await apiService.vehicle.getVehicles(params);
      
      const mappedVehicles: Vehicle[] = response.data.map((vehicle: any) => ({
        id: vehicle.id,
        userId: vehicle.userId,
        userName: vehicle.userName,
        userEmail: vehicle.userEmail,
        vehicleName: vehicle.vehicleName,
        vehicleType: vehicle.vehicleType,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        insuranceNumber: vehicle.insuranceNumber,
        insuranceImage: vehicle.insuranceImage,
        insuranceEndDate: vehicle.insuranceEndDate,
        pollutionNumber: vehicle.pollutionNumber,
        pollutionImage: vehicle.pollutionImage,
        pollutionEndDate: vehicle.pollutionEndDate,
        vehicleImage: vehicle.vehicleImage,
        status: vehicle.status,
        note: vehicle.note,
        mileage: vehicle.mileage,
        seatCapacity: vehicle.seatCapacity,
        createdAt: vehicle.createdAt,
      }));
      
      setVehicles(mappedVehicles);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
      setHasNext(response.pagination.hasNext);
      setHasPrev(response.pagination.hasPrev);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch vehicles";
      console.error("Fetch vehicles failed:", err);
      setError(errorMessage);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Process vehicles to convert public_ids to signed URLs
  useEffect(() => {
    const processVehicleImages = async () => {
      if (!vehicles.length) {
        setProcessedVehicles([]);
        return;
      }

      try {
        const vehiclesWithSignedUrls = await Promise.all(
          vehicles.map(async (vehicle) => {
            // Process vehicle image
            let vehicleImageUrl = vehicle.vehicleImage;
            if (vehicle.vehicleImage && isPublicId(vehicle.vehicleImage)) {
              try {
                vehicleImageUrl = await generateSignedUrl(vehicle.vehicleImage);
              } catch (error) {
                console.error("Failed to generate signed URL for vehicle image:", vehicle.vehicleImage, error);
                vehicleImageUrl = "/placeholder.svg";
              }
            }

            // Process insurance image
            let insuranceImageUrl = vehicle.insuranceImage;
            if (vehicle.insuranceImage && isPublicId(vehicle.insuranceImage)) {
              try {
                insuranceImageUrl = await generateSignedUrl(vehicle.insuranceImage);
              } catch (error) {
                console.error("Failed to generate signed URL for insurance image:", vehicle.insuranceImage, error);
                insuranceImageUrl = "/placeholder.svg";
              }
            }

            // Process pollution image
            let pollutionImageUrl = vehicle.pollutionImage;
            if (vehicle.pollutionImage && isPublicId(vehicle.pollutionImage)) {
              try {
                pollutionImageUrl = await generateSignedUrl(vehicle.pollutionImage);
              } catch (error) {
                console.error("Failed to generate signed URL for pollution image:", vehicle.pollutionImage, error);
                pollutionImageUrl = "/placeholder.svg";
              }
            }

            return {
              ...vehicle,
              vehicleImage: vehicleImageUrl,
              insuranceImage: insuranceImageUrl,
              pollutionImage: pollutionImageUrl
            };
          })
        );

        setProcessedVehicles(vehiclesWithSignedUrls);
      } catch (error) {
        console.error("Failed to process vehicle images:", error);
        setProcessedVehicles(vehicles);
      }
    };

    processVehicleImages();
  }, [vehicles]);

  useEffect(() => {
    fetchVehicles();
  }, [page, limit, search, statusFilter, sortBy, sortOrder]);

  const handleApproveVehicle = async (vehicleId: string) => {
    try {
      await apiService.vehicle.updateVehicleStatus(vehicleId, "Approved");
      setVehicles(vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, status: "Approved" } : vehicle
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve vehicle";
      console.error("Approve vehicle failed:", err);
      setError(errorMessage);
    }
  };

  const openRejectionModal = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    setRejectionNote("");
    setShowRejectionModal(true);
  };

  const handleRejectVehicle = async () => {
    if (!selectedVehicle || !rejectionNote.trim()) {
      setError("Rejection reason is required");
      return;
    }

    try {
      await apiService.vehicle.updateVehicleStatus(selectedVehicle, "Rejected", rejectionNote);
      setVehicles(vehicles.map((vehicle) =>
        vehicle.id === selectedVehicle ? { ...vehicle, status: "Rejected", note: rejectionNote } : vehicle
      ));
      setShowRejectionModal(false);
      setSelectedVehicle(null);
      setRejectionNote("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject vehicle";
      console.error("Reject vehicle failed:", err);
      setError(errorMessage);
    }
  };

  const handleSearch = (searchValue: string) => {
    setSearch(searchValue);
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Secure document preview handler
  const handleViewDocument = (vehicle: Vehicle, type: "vehicle" | "insurance" | "pollution") => {
    let imageUrl = "";
    let title = "";

    switch (type) {
      case "vehicle":
        imageUrl = vehicle.vehicleImage;
        title = "Vehicle Image";
        break;
      case "insurance":
        imageUrl = vehicle.insuranceImage;
        title = "Insurance Document";
        break;
      case "pollution":
        imageUrl = vehicle.pollutionImage;
        title = "Pollution Certificate";
        break;
    }
    
    if (!imageUrl || imageUrl === "/placeholder.svg") {
      alert(`No ${title.toLowerCase()} available to view.`);
      return;
    }

    setDocumentPreview({
      url: imageUrl,
      type,
      title,
      vehicle: {
        userName: vehicle.userName,
        licensePlate: vehicle.licensePlate,
        vehicleName: vehicle.vehicleName,
      }
    });
    setZoom(1);
    setRotation(0);
  };

  // Download document handler
  const handleDownloadDocument = async () => {
    if (!documentPreview) return;

    try {
      const response = await fetch(documentPreview.url);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate meaningful filename
      const fileName = `${documentPreview.title}_${documentPreview.vehicle.licensePlate}_${documentPreview.vehicle.userName}.${getFileExtension(documentPreview.url)}`;
      link.download = fileName.replace(/\s+/g, '_');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document.');
    }
  };

  // Helper function to get file extension
  const getFileExtension = (url: string): string => {
    const match = url.match(/\.([^.?]+)(?:\?|$)/);
    return match ? match[1] : 'jpg';
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  // Check if document is expired
  const isDocumentExpired = (endDate: string) => {
    if (!endDate) return false;
    try {
      return new Date(endDate) < new Date();
    } catch {
      return false;
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetControls = () => {
    setZoom(1);
    setRotation(0);
  };

  const renderStatus = (status: string) => {
    const badgeVariant = 
      status === "Approved" 
        ? "default" 
        : status === "Rejected" 
        ? "destructive" 
        : "secondary";
    
    return (
      <Badge 
        variant={badgeVariant} 
        className={
          status === "Approved" 
            ? "bg-green-500/20 text-green-400 border-green-500" 
            : status === "Rejected" 
            ? "bg-red-500/20 text-red-400 border-red-500"
            : "bg-orange-500/20 text-orange-400 border-orange-500"
        }
      >
        {status}
      </Badge>
    );
  };

  const renderDocumentStatus = (endDate: string) => {
    const isExpired = isDocumentExpired(endDate);
    return (
      <Badge 
        variant={isExpired ? "destructive" : "default"}
        className={
          isExpired 
            ? "bg-red-500/20 text-red-400 border-red-500 text-xs"
            : "bg-green-500/20 text-green-400 border-green-500 text-xs"
        }
      >
        {isExpired ? "Expired" : "Valid"}
      </Badge>
    );
  };

  const columns = [
    { 
      key: "userName", 
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("userName")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300"
        >
          <span>Owner</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (name: string) => <span className="text-gray-300 font-medium">{name}</span>
    },
    { key: "vehicleName", header: "Vehicle Name", render: (name: string) => <span className="text-gray-300">{name}</span> },
    { key: "vehicleType", header: "Type", render: (type: string) => <span className="text-gray-300">{type}</span> },
    { key: "licensePlate", header: "License Plate", render: (plate: string) => <span className="text-gray-300 font-mono">{plate}</span> },
    { key: "color", header: "Color", render: (color: string) => <span className="text-gray-300">{color}</span> },
    { 
      key: "insurance", 
      header: "Insurance",
      render: (_: any, vehicle: Vehicle) => (
        <div className="space-y-1">
          <div className="text-gray-300 text-sm">{vehicle.insuranceNumber}</div>
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-gray-400">Valid until: {formatDate(vehicle.insuranceEndDate)}</span>
          </div>
          {renderDocumentStatus(vehicle.insuranceEndDate)}
        </div>
      )
    },
    { 
      key: "pollution", 
      header: "Pollution",
      render: (_: any, vehicle: Vehicle) => (
        <div className="space-y-1">
          <div className="text-gray-300 text-sm">{vehicle.pollutionNumber}</div>
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-gray-400">Valid until: {formatDate(vehicle.pollutionEndDate)}</span>
          </div>
          {renderDocumentStatus(vehicle.pollutionEndDate)}
        </div>
      )
    },
    { key: "createdAt", header: "Submitted On", render: (date: string) => <span className="text-gray-300">{formatDate(date)}</span> },
    { 
      key: "status", 
      header: "Status",
      render: (status: string) => renderStatus(status)
    },
    {
      key: "documents",
      header: "Documents",
      render: (_: any, vehicle: Vehicle) => (
        <div className="flex space-x-2">
          {vehicle.vehicleImage && vehicle.vehicleImage !== "/placeholder.svg" && (
            <Button
              onClick={() => handleViewDocument(vehicle, "vehicle")}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white"
              title="View Vehicle Image"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {vehicle.insuranceImage && vehicle.insuranceImage !== "/placeholder.svg" && (
            <Button
              onClick={() => handleViewDocument(vehicle, "insurance")}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600 hover:text-white"
              title="View Insurance Document"
            >
              <Shield className="h-4 w-4" />
            </Button>
          )}
          {vehicle.pollutionImage && vehicle.pollutionImage !== "/placeholder.svg" && (
            <Button
              onClick={() => handleViewDocument(vehicle, "pollution")}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600 hover:text-white"
              title="View Pollution Certificate"
            >
              <Leaf className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    },
  ];

  const renderActions = (vehicle: Vehicle) => {
    if (vehicle.status === "Pending") {
      return (
        <div className="flex space-x-2">
          <Button
            onClick={() => handleApproveVehicle(vehicle.id)}
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Approve
          </Button>
          <Button
            onClick={() => openRejectionModal(vehicle.id)}
            variant="destructive"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Reject
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Vehicle Verification</h1>
            <p className="text-gray-400">Manage and verify vehicle submissions</p>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search vehicles by license plate, owner name, insurance or pollution number..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-600 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={processedVehicles}
          loading={loading}
          error={error}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            hasNext,
            hasPrev,
          }}
          onPageChange={setPage}
          emptyMessage="No vehicles found for verification."
          actions={renderActions}
        />

        {/* Secure Document Preview Dialog */}
        <Dialog open={!!documentPreview} onOpenChange={() => setDocumentPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-800 border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center justify-between">
                <div>
                  {documentPreview?.title} - {documentPreview?.vehicle.userName}
                  <div className="text-sm text-gray-400 mt-1">
                    License Plate: {documentPreview?.vehicle.licensePlate} | 
                    Vehicle: {documentPreview?.vehicle.vehicleName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadDocument}
                    className="bg-green-600 text-white hover:bg-green-700 border-green-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDocumentPreview(null)}
                    className="text-white hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col h-full">
              {/* Image Controls */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Controls:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="h-8 w-8 p-0 bg-gray-600 border-gray-500 text-white"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-white min-w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="h-8 w-8 p-0 bg-gray-600 border-gray-500 text-white"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                    className="h-8 w-8 p-0 bg-gray-600 border-gray-500 text-white ml-2"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetControls}
                    className="h-8 bg-gray-600 border-gray-500 text-white text-xs"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Image Preview */}
              <div className="flex-1 overflow-auto bg-black rounded-lg flex items-center justify-center p-4">
                {documentPreview && (
                  <img
                    src={documentPreview.url}
                    alt={documentPreview.title}
                    className="max-w-full max-h-full object-contain transition-all duration-200"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rejection Modal */}
        <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
          <DialogContent className="bg-gray-800 border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Rejection Reason</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-300 mb-4">
                Please provide a reason why this vehicle verification is being rejected:
              </p>
              <Textarea
                className="bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:border-blue-500"
                rows={4}
                placeholder="Enter rejection reason..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectionModal(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectVehicle}
                className="bg-red-600 hover:bg-red-700"
              >
                Reject Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}