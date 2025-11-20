"use client";

import { useState, useEffect } from "react";
import { adminClientApiService as apiService, useAdminApiInterceptors } from "@/services/client/adminClientApi";

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
  Leaf,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import Swal from 'sweetalert2';

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
  try {
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate signed URL");
    }

    const data = await response.json();
    return data.signed_url;
  } catch (error) {
    console.error("❌ Failed to generate signed URL:", error);
    throw error;
  }
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
  const [processingVehicle, setProcessingVehicle] = useState<string | null>(null);


  useAdminApiInterceptors();


  // Document preview states
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
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

      console.log("📤 Fetching vehicles with params:", params);

      const response: PaginatedResponse = await apiService.vehicle.getVehicles(params);
      console.log("📥 Fetched vehicles response:", response);
      
      if (response && response.success && Array.isArray(response.data)) {
        const mappedVehicles: Vehicle[] = response.data.map((vehicle: any) => ({
          id: vehicle.id || vehicle._id || `unknown-${Math.random().toString(36).substr(2, 9)}`,
          userId: vehicle.userId,
          userName: vehicle.userName || "Unknown User",
          userEmail: vehicle.userEmail || "No email",
          vehicleName: vehicle.vehicleName || "Unknown Vehicle",
          vehicleType: vehicle.vehicleType || "N/A",
          licensePlate: vehicle.licensePlate || "N/A",
          color: vehicle.color || "N/A",
          insuranceNumber: vehicle.insuranceNumber || "N/A",
          insuranceImage: vehicle.insuranceImage || "",
          insuranceEndDate: vehicle.insuranceEndDate || "",
          pollutionNumber: vehicle.pollutionNumber || "N/A",
          pollutionImage: vehicle.pollutionImage || "",
          pollutionEndDate: vehicle.pollutionEndDate || "",
          vehicleImage: vehicle.vehicleImage || "",
          status: vehicle.status || "Pending",
          note: vehicle.note || "",
          mileage: vehicle.mileage || 0,
          seatCapacity: vehicle.seatCapacity || 0,
          createdAt: vehicle.createdAt || new Date().toISOString(),
        }));
        
        setVehicles(mappedVehicles);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.totalItems);
        setHasNext(response.pagination.hasNext);
        setHasPrev(response.pagination.hasPrev);
      } else {
        console.error("❌ Unexpected response format:", response);
        setError("Invalid response format from server");
        setVehicles([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch vehicles";
      console.error("❌ Fetch vehicles failed:", err);
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
                console.log(`🔄 Generating signed URL for vehicle image: ${vehicle.vehicleImage}`);
                vehicleImageUrl = await generateSignedUrl(vehicle.vehicleImage);
              } catch (error) {
                console.error("❌ Failed to generate signed URL for vehicle image:", vehicle.vehicleImage, error);
                vehicleImageUrl = "/placeholder.svg";
              }
            }

            // Process insurance image
            let insuranceImageUrl = vehicle.insuranceImage;
            if (vehicle.insuranceImage && isPublicId(vehicle.insuranceImage)) {
              try {
                console.log(`🔄 Generating signed URL for insurance image: ${vehicle.insuranceImage}`);
                insuranceImageUrl = await generateSignedUrl(vehicle.insuranceImage);
              } catch (error) {
                console.error("❌ Failed to generate signed URL for insurance image:", vehicle.insuranceImage, error);
                insuranceImageUrl = "/placeholder.svg";
              }
            }

            // Process pollution image
            let pollutionImageUrl = vehicle.pollutionImage;
            if (vehicle.pollutionImage && isPublicId(vehicle.pollutionImage)) {
              try {
                console.log(`🔄 Generating signed URL for pollution image: ${vehicle.pollutionImage}`);
                pollutionImageUrl = await generateSignedUrl(vehicle.pollutionImage);
              } catch (error) {
                console.error("❌ Failed to generate signed URL for pollution image:", vehicle.pollutionImage, error);
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
        console.error("❌ Failed to process vehicle images:", error);
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
      console.log("🟢 Approving vehicle:", vehicleId);
      setProcessingVehicle(vehicleId);
      
      await apiService.vehicle.updateVehicleStatus(vehicleId, "Approved");
      
      // Update local state
      setVehicles(vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, status: "Approved" } : vehicle
      ));
      
      Swal.fire({
        title: 'Success!',
        text: 'Vehicle approved successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      console.log("✅ Vehicle approved successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve vehicle";
      console.error("❌ Approve vehicle failed:", err);
      setError(errorMessage);
      
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setProcessingVehicle(null);
    }
  };

  const openRejectionModal = (vehicleId: string) => {
    console.log("🔴 Opening rejection modal for vehicle:", vehicleId);
    setSelectedVehicle(vehicleId);
    setRejectionNote("");
    setShowRejectionModal(true);
  };

  const handleRejectVehicle = async () => {
    if (!selectedVehicle) {
      const errorMsg = "No vehicle selected for rejection";
      console.error("❌", errorMsg);
      Swal.fire('Error!', errorMsg, 'error');
      return;
    }

    if (!rejectionNote.trim()) {
      const errorMsg = "Rejection reason is required";
      console.error("❌", errorMsg);
      Swal.fire('Error!', 'Please provide a rejection reason.', 'error');
      return;
    }

    try {
      console.log("🔴 Rejecting vehicle:", selectedVehicle, "Reason:", rejectionNote);
      setProcessingVehicle(selectedVehicle);
      
      await apiService.vehicle.updateVehicleStatus(selectedVehicle, "Rejected", rejectionNote);
      
      // Update local state
      setVehicles(vehicles.map((vehicle) =>
        vehicle.id === selectedVehicle ? { ...vehicle, status: "Rejected", note: rejectionNote } : vehicle
      ));
      
      setShowRejectionModal(false);
      setSelectedVehicle(null);
      setRejectionNote("");
      
      Swal.fire({
        title: 'Success!',
        text: 'Vehicle rejected successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      console.log("✅ Vehicle rejected successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject vehicle";
      console.error("❌ Reject vehicle failed:", err);
      setError(errorMessage);
      
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setProcessingVehicle(null);
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
      Swal.fire('Info', `No ${title.toLowerCase()} available to view.`, 'info');
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
      console.log("📥 Downloading document:", documentPreview.url);
      
      const response = await fetch(documentPreview.url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
      
      Swal.fire('Success!', 'Document downloaded successfully.', 'success');
    } catch (error) {
      console.error('❌ Download failed:', error);
      Swal.fire('Error!', 'Failed to download document.', 'error');
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
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
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
    switch (status) {
      case "Approved":
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Approved
            </div>
          </Badge>
        );
      case "Rejected":
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500">
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Rejected
            </div>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Pending
            </div>
          </Badge>
        );
    }
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
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300 font-semibold"
        >
          <span>Owner</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (name: string, vehicle: Vehicle) => (
        <div>
          <span className="text-white font-medium block">{name}</span>
          <span className="text-gray-400 text-xs">{vehicle.userEmail}</span>
        </div>
      )
    },
    { 
      key: "vehicleName", 
      header: "Vehicle Name", 
      render: (name: string) => <span className="text-white">{name}</span> 
    },
    { 
      key: "vehicleType", 
      header: "Type", 
      render: (type: string) => <span className="text-gray-300">{type}</span> 
    },
    { 
      key: "licensePlate", 
      header: "License Plate", 
      render: (plate: string) => (
        <span className="text-white font-mono bg-blue-500/10 px-2 py-1 rounded text-sm">
          {plate}
        </span>
      ) 
    },
    { 
      key: "color", 
      header: "Color", 
      render: (color: string) => <span className="text-gray-300">{color}</span> 
    },
    { 
      key: "insurance", 
      header: "Insurance",
      render: (_: any, vehicle: Vehicle) => (
        <div className="space-y-1">
          <div className="text-white text-sm font-mono">{vehicle.insuranceNumber}</div>
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-gray-400">Until: {formatDate(vehicle.insuranceEndDate)}</span>
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
          <div className="text-white text-sm font-mono">{vehicle.pollutionNumber}</div>
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-gray-400">Until: {formatDate(vehicle.pollutionEndDate)}</span>
          </div>
          {renderDocumentStatus(vehicle.pollutionEndDate)}
        </div>
      )
    },
    { 
      key: "createdAt", 
      header: "Submitted On", 
      render: (date: string) => <span className="text-gray-300 text-sm">{formatDate(date)}</span> 
    },
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
      const isProcessing = processingVehicle === vehicle.id;
      
      return (
        <div className="flex space-x-2">
          <Button
            onClick={() => handleApproveVehicle(vehicle.id)}
            variant="default"
            size="sm"
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:opacity-50 text-xs"
          >
            {isProcessing ? "Processing..." : "Approve"}
          </Button>
          <Button
            onClick={() => openRejectionModal(vehicle.id)}
            variant="destructive"
            size="sm"
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:opacity-50 text-xs"
          >
            {isProcessing ? "Processing..." : "Reject"}
          </Button>
        </div>
      );
    }
    
    return (
      <div className="text-sm text-gray-400 px-2">
        {vehicle.status === "Approved" ? "✅ Approved" : "❌ Rejected"}
      </div>
    );
  };

  const handleRetry = () => {
    fetchVehicles();
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Vehicle Verification</h1>
            <p className="text-gray-400">Manage and verify vehicle submissions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Total: {totalItems} vehicles
            </div>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-400">{error}</span>
              </div>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
        
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
          keyField="id"
        />

        {/* Secure Document Preview Dialog */}
        <Dialog open={!!documentPreview} onOpenChange={() => setDocumentPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-800 border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    {documentPreview?.title} - {documentPreview?.vehicle.userName}
                    <div className="text-sm text-gray-400 mt-1">
                      License Plate: {documentPreview?.vehicle.licensePlate} | 
                      Vehicle: {documentPreview?.vehicle.vehicleName}
                    </div>
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
                    onError={(e) => {
                      console.error("❌ Failed to load document image");
                      e.currentTarget.src = "/placeholder.svg";
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
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Rejection Reason
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-300 mb-4">
                Please provide a reason why this vehicle verification is being rejected:
              </p>
              <Textarea
                className="bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:border-red-500"
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
                disabled={!!processingVehicle}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectVehicle}
                className="bg-red-600 hover:bg-red-700"
                disabled={!!processingVehicle || !rejectionNote.trim()}
              >
                {processingVehicle ? "Processing..." : "Reject Vehicle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}