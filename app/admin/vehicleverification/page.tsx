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
import { Search, Filter, ArrowUpDown, Eye, FileText } from "lucide-react";

interface Vehicle {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
  };
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color: string;
  insuranceNumber: string;
  vehicleImage?: string;
  documentImage?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  updatedAt?: string;
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

export default function VehicleVerification() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionNote, setRejectionNote] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

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
        _id: vehicle._id.toString(),
        user: {
          _id: vehicle.user?._id || "N/A",
          fullName: vehicle.user?.fullName || "Unknown",
          email: vehicle.user?.email || "N/A",
        },
        vehicleName: vehicle.vehicleType || "N/A",
        vehicleType: vehicle.vehicleType || "N/A",
        licensePlate: vehicle.licensePlate || "N/A",
        color: vehicle.color || "N/A",
        insuranceNumber: vehicle.insuranceNumber || "N/A",
        vehicleImage: vehicle.vehicleImage,
        documentImage: vehicle.documentImage,
        status: vehicle.status || "Pending",
        createdAt: vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : "N/A",
        updatedAt: vehicle.updatedAt ? new Date(vehicle.updatedAt).toLocaleDateString() : undefined,
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

  useEffect(() => {
    fetchVehicles();
  }, [page, limit, search, statusFilter, sortBy, sortOrder]);

  const handleApproveVehicle = async (vehicleId: string) => {
    try {
      await apiService.vehicle.updateVehicleStatus(vehicleId, "Approved");
      setVehicles(vehicles.map((vehicle) =>
        vehicle._id === vehicleId ? { ...vehicle, status: "Approved" } : vehicle
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
        vehicle._id === selectedVehicle ? { ...vehicle, status: "Rejected" } : vehicle
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

  const renderStatus = (status: string) => {
    const color =
      status === "Approved" 
        ? "text-green-500" 
        : status === "Rejected" 
        ? "text-red-500" 
        : "text-orange-500";
    
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

  const viewDocument = (imageUrl?: string) => {
    if (!imageUrl) {
      alert("No image available to view.");
      return;
    }
    window.open(imageUrl, "_blank");
  };

  const columns = [
    { 
      key: "user.fullName", 
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("user.fullName")}
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
    { key: "insuranceNumber", header: "Insurance", render: (insurance: string) => <span className="text-gray-300">{insurance}</span> },
    { key: "createdAt", header: "Submitted On", render: (date: string) => <span className="text-gray-300">{date}</span> },
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
          {vehicle.vehicleImage && (
            <Button
              onClick={() => viewDocument(vehicle.vehicleImage)}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white"
              title="View Vehicle Image"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {vehicle.documentImage && (
            <Button
              onClick={() => viewDocument(vehicle.documentImage)}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600 hover:text-white"
              title="View Document Image"
            >
              <FileText className="h-4 w-4" />
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
            onClick={() => handleApproveVehicle(vehicle._id)}
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Approve
          </Button>
          <Button
            onClick={() => openRejectionModal(vehicle._id)}
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

        {/* Enhanced Filters - REMOVED the search bar from here */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search vehicles by license plate or owner name..."
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
        
        {/* DataTable - REMOVED search props to avoid duplicate search bar */}
        <DataTable
          columns={columns}
          data={vehicles}
          loading={loading}
          error={error}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            hasNext,
            hasPrev,
            onPageChange: setPage,
          }}
          emptyMessage="No vehicles found for verification."
          actions={renderActions}
        />

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