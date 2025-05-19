"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/api";

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

export default function VehicleVerification() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Ensure initial state is an empty array
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionNote, setRejectionNote] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);


  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const fetchedVehicles = await apiService.admin.vehicle.getVehicles();
        if (Array.isArray(fetchedVehicles)) {
          setVehicles(fetchedVehicles);
        } else {
          console.error("Unexpected response format:", fetchedVehicles);
          setVehicles([]); // Fallback to empty array if response is not an array
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch vehicles";
        console.error("Fetch vehicles failed:", err);
        setError(errorMessage);
        setVehicles([]); // Set to empty array on error to prevent undefined
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleApproveVehicle = async (vehicleId: string) => {
    try {
      await apiService.admin.vehicle.updateVehicleStatus(vehicleId, "Approved");
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
      await apiService.admin.vehicle.updateVehicleStatus(selectedVehicle, "Rejected", rejectionNote);
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

  const renderStatus = (status: string) => {
    switch (status) {
      case "Approved":
        return <span className="text-green-500">Approved</span>;
      case "Rejected":
        return <span className="text-red-500">Rejected</span>;
      default:
        return <span className="text-orange-500">Pending</span>;
    }
  };

  const viewDocument = (imageUrl?: string) => {
    if (!imageUrl) {
      alert("No image available to view.");
      return;
    }
    window.open(imageUrl, "_blank");
  };

  return (
    <div className="bg-gray-900 text-white p-6">
      <h2 className="text-2xl font-semibold mb-6">Vehicle Verification Management</h2>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400">Loading vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="text-center text-gray-400">No vehicles found for verification.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-left">
                <th className="p-3 border-b border-gray-700">#</th>
                <th className="p-3 border-b border-gray-700">Owner</th>
                <th className="p-3 border-b border-gray-700">Vehicle Name</th>
                <th className="p-3 border-b border-gray-700">Type</th>
                <th className="p-3 border-b border-gray-700">License Plate</th>
                <th className="p-3 border-b border-gray-700">Color</th>
                <th className="p-3 border-b border-gray-700">Insurance</th>
                <th className="p-3 border-b border-gray-700">Submitted On</th>
                <th className="p-3 border-b border-gray-700">Status</th>
                <th className="p-3 border-b border-gray-700">Documents</th>
                <th className="p-3 border-b border-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle, index) => (
                <tr key={vehicle._id} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{vehicle.user?.fullName || "Unknown"}</td>
                  <td className="p-3">{vehicle.vehicleName}</td>
                  <td className="p-3">{vehicle.vehicleType}</td>
                  <td className="p-3">{vehicle.licensePlate}</td>
                  <td className="p-3">{vehicle.color || "N/A"}</td>
                  <td className="p-3">{vehicle.insuranceNumber || "N/A"}</td>
                  <td className="p-3">
                    {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="p-3">{renderStatus(vehicle.status)}</td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      {vehicle.vehicleImage && (
                        <button
                          onClick={() => viewDocument(vehicle.vehicleImage)}
                          className="bg-blue-800 text-white rounded p-2 hover:bg-blue-700"
                          title="View Vehicle Image"
                          disabled={!vehicle.vehicleImage}
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
                        </button>
                      )}
                      {vehicle.documentImage && (
                        <button
                          onClick={() => viewDocument(vehicle.documentImage)}
                          className="bg-purple-800 text-white rounded p-2 hover:bg-purple-700"
                          title="View Document Image"
                          disabled={!vehicle.documentImage}
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
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      {vehicle.status === "Pending" && (
                        <>
                          <button
                            onClick={() => handleApproveVehicle(vehicle._id)}
                            className="bg-green-700 text-white rounded p-2 hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectionModal(vehicle._id)}
                            className="bg-red-700 text-white rounded p-2 hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button className="bg-gray-700 text-white rounded p-2 hover:bg-gray-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Rejection Reason</h3>
            <p className="text-gray-300 mb-4">
              Please provide a reason why this vehicle verification is being rejected:
            </p>
            <textarea
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              rows={4}
              placeholder="Enter rejection reason..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            ></textarea>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setShowRejectionModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600"
                onClick={handleRejectVehicle}
              >
                Reject Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}