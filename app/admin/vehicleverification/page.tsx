// VehicleVerification.tsx
"use client";

import { useState, useEffect } from "react";
import { adminClientApiService as apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response: PaginatedResponse = await apiService.vehicle.getVehicles({
        page,
        limit,
        search,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
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
  }, [page, limit, search]);

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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const renderStatus = (status: string) => {
    const color =
      status === "Approved" ? "text-green-500" : status === "Rejected" ? "text-red-500" : "text-orange-500";
    return <span className={color}>{status}</span>;
  };

  const viewDocument = (imageUrl?: string) => {
    if (!imageUrl) {
      alert("No image available to view.");
      return;
    }
    window.open(imageUrl, "_blank");
  };

  return (
    <div className="bg-gray-900 text-white p-6 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6">Vehicle Verification Management</h2>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search vehicles by license plate or owner name..."
          value={search}
          onChange={handleSearch}
          className="max-w-md bg-gray-800 text-white border-gray-600"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-400">Loading vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="text-center text-gray-400">No vehicles found for verification.</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-800 hover:bg-gray-800">
                <TableHead className="text-gray-200">#</TableHead>
                <TableHead className="text-gray-200">Owner</TableHead>
                <TableHead className="text-gray-200">Vehicle Name</TableHead>
                <TableHead className="text-gray-200">Type</TableHead>
                <TableHead className="text-gray-200">License Plate</TableHead>
                <TableHead className="text-gray-200">Color</TableHead>
                <TableHead className="text-gray-200">Insurance</TableHead>
                <TableHead className="text-gray-200">Submitted On</TableHead>
                <TableHead className="text-gray-200">Status</TableHead>
                <TableHead className="text-gray-200">Documents</TableHead>
                <TableHead className="text-gray-200">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle, index) => (
                <TableRow key={vehicle._id} className="border-gray-700 hover:bg-gray-800">
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{vehicle.user?.fullName || "Unknown"}</TableCell>
                  <TableCell>{vehicle.vehicleName}</TableCell>
                  <TableCell>{vehicle.vehicleType}</TableCell>
                  <TableCell>{vehicle.licensePlate}</TableCell>
                  <TableCell>{vehicle.color || "N/A"}</TableCell>
                  <TableCell>{vehicle.insuranceNumber || "N/A"}</TableCell>
                  <TableCell>{vehicle.createdAt}</TableCell>
                  <TableCell>{renderStatus(vehicle.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {vehicle.vehicleImage && (
                        <Button
                          onClick={() => viewDocument(vehicle.vehicleImage)}
                          variant="outline"
                          size="sm"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path
                              fillRule="evenodd"
                              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Button>
                      )}
                      {vehicle.documentImage && (
                        <Button
                          onClick={() => viewDocument(vehicle.documentImage)}
                          variant="outline"
                          size="sm"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {vehicle.status === "Pending" && (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleApproveVehicle(vehicle._id)}
                          variant="default"
                          size="sm"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => openRejectionModal(vehicle._id)}
                          variant="destructive"
                          size="sm"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => hasPrev && setPage(page - 1)}
                    className={hasPrev ? "" : "pointer-events-none opacity-50"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      onClick={() => setPage(p)}
                      isActive={p === page}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => hasNext && setPage(page + 1)}
                    className={hasNext ? "" : "pointer-events-none opacity-50"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <p className="text-sm text-gray-400 mt-2">
              Showing {vehicles.length} of {totalItems} vehicles
            </p>
          </div>
        </>
      )}

      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        <DialogContent className="bg-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300 mb-4">
              Please provide a reason why this vehicle verification is being rejected:
            </p>
            <Textarea
              className="bg-gray-700 text-white border-gray-600"
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
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectVehicle}
            >
              Reject Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}