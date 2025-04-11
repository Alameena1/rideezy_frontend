"use client";
import { useState, useEffect } from "react";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import Sidebar from "@/app/components/Sidebar";
import useAuth from "@/app/hooks/useAuth";
import { apiService } from "@/services/api";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insuranceNumber?: string;
  vehicleImage?: string;
  documentImage?: string;
  status: "Pending" | "Approved" | "Rejected";
  imageUrl: string;
}

export default function VehicleDetails() {
  useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    vehicleName: "",
    vehicleType: "",
    licensePlate: "",
    color: "",
    insuranceNumber: "",
  });
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);
  const [documentImage, setDocumentImage] = useState<File | null>(null);
  const [vehicleImagePreview, setVehicleImagePreview] = useState<string | null>(null);
  const [documentImagePreview, setDocumentImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const sidebarItems = [
    { icon: "👤", label: "Profile", active: false },
    { icon: "🚗", label: "Vehicles", active: true },
    { icon: "📄", label: "Documents", active: false },
    { icon: "👑", label: "Subscription", active: false },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {

    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await apiService.getVehicles();
      console.log("API Response:", response);
      const fetchedVehicles = response.data.data.map((vehicle: any) => ({
        ...vehicle,
        imageUrl: vehicle.vehicleImage || "/api/placeholder/300/200",
      }));
      console.log("Processed Vehicles:", fetchedVehicles);
      setVehicles(fetchedVehicles || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setError("Failed to fetch vehicles. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setVehicleData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleVehicleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVehicleImage(file);
      setVehicleImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDocumentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentImage(file);
      setDocumentImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Upload API error:", data);
        throw new Error(data.details || data.error || "Upload failed");
      }

      if (!data.secure_url) {
        throw new Error("No secure URL returned from upload");
      }

      return data.secure_url;
    } catch (error: any) {
      console.error("Upload error:", error.message, error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.error("Token not found! Redirecting to login.");
        window.location.href = "/login";
        return;
      }

      let vehicleImageUrl: string | undefined = undefined;
      let documentImageUrl: string | undefined = undefined;

      if (vehicleImage) {
        vehicleImageUrl = await uploadFile(vehicleImage);
      }
      if (documentImage) {
        documentImageUrl = await uploadFile(documentImage);
      }

      const vehiclePayload = {
        vehicleName: vehicleData.vehicleName,
        vehicleType: vehicleData.vehicleType,
        licensePlate: vehicleData.licensePlate,
        color: vehicleData.color || undefined,
        insuranceNumber: vehicleData.insuranceNumber || undefined,
        vehicleImage: vehicleImageUrl,
        documentImage: documentImageUrl,
      };

      const response = await apiService.addVehicle(vehiclePayload);
      console.log("Vehicle added:", response);

      const newVehicle: Vehicle = {
        _id: response.data._id, 
        ...vehiclePayload,
        status: response.data.status || "Pending",
        imageUrl: vehicleImageUrl || "/api/placeholder/300/200",
      };

      setVehicles([...vehicles, newVehicle]);
      resetForm();
      setIsAddingVehicle(false);
    } catch (error: any) {
      console.error("Error registering vehicle:", error);
      setError(error.message || "Failed to register vehicle. Please try again.");
    }
  };

  const resetForm = () => {
    setVehicleData({
      vehicleName: "",
      vehicleType: "",
      licensePlate: "",
      color: "",
      insuranceNumber: "",
    });
    setVehicleImage(null);
    setDocumentImage(null);
    setVehicleImagePreview(null);
    setDocumentImagePreview(null);
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          items={sidebarItems}
        />
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={toggleSidebar}
          ></div>
        )}

        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-4xl bg-white p-6 md:p-8 rounded-lg shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Your Vehicles</h1>
                <p className="text-sm text-gray-500">{currentDate}</p>
              </div>
              <button
                onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md"
              >
                {isAddingVehicle ? "Cancel" : "Register New Vehicle"}
              </button>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            {isAddingVehicle ? (
              <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Register New Vehicle</h2>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Name
                      </label>
                      <input
                        type="text"
                        name="vehicleName"
                        value={vehicleData.vehicleName}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 py-2 px-3"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Type
                      </label>
                      <select
                        name="vehicleType"
                        value={vehicleData.vehicleType}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 py-2 px-3"
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Car">Car</option>
                        <option value="Truck">Truck</option>
                        <option value="Van">Van</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License Plate
                      </label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={vehicleData.licensePlate}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 py-2 px-3"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color
                      </label>
                      <input
                        type="text"
                        name="color"
                        value={vehicleData.color}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 py-2 px-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Insurance Number
                      </label>
                      <input
                        type="text"
                        name="insuranceNumber"
                        value={vehicleData.insuranceNumber}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 py-2 px-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVehicleImageChange}
                        className="w-full rounded-md border border-gray-300 py-2 px-3"
                        required
                      />
                      {vehicleImagePreview && (
                        <div className="mt-2">
                          <img
                            src={vehicleImagePreview}
                            alt="Vehicle preview"
                            className="h-32 w-auto object-cover rounded-md"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document Image (Registration/Title)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDocumentImageChange}
                        className="w-full rounded-md border border-gray-300 py-2 px-3"
                        required
                      />
                      {documentImagePreview && (
                        <div className="mt-2">
                          <img
                            src={documentImagePreview}
                            alt="Document preview"
                            className="h-32 w-auto object-cover rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setIsAddingVehicle(false);
                      }}
                      className="mr-4 px-4 py-2 border border-gray-300 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-md"
                    >
                      Register Vehicle
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🚗</div>
                    <h3 className="text-xl font-medium mb-2">No vehicles registered yet</h3>
                    <p className="text-gray-500 mb-6">
                      Register your first vehicle to get started
                    </p>
                    <button
                      onClick={() => setIsAddingVehicle(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md"
                    >
                      Register Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle._id}
                        className="flex items-center bg-white rounded-lg shadow-md p-4 border border-gray-200"
                      >
                        <div className="w-24 h-24 mr-4">
                          <img
                            src={vehicle.imageUrl}
                            alt={vehicle.vehicleName}
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => (e.currentTarget.src = "/api/placeholder/300/200")}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold">{vehicle.vehicleName}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                vehicle.status === "Approved"
                                  ? "bg-green-100 text-green-800"
                                  : vehicle.status === "Rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {`Status: ${vehicle.status}`}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-700">
                              <span className="text-gray-500">Insurance exp:</span> {vehicle.insuranceNumber || "N/A"}
                            </p>
                            <p className="text-gray-500">
                              <span className="text-gray-500">Pollution:</span> clear
                            </p>
                            <p className="text-gray-500">
                              <span className="text-gray-500">Max Passengers:</span> {vehicle.vehicleType === "Car" ? "5" : "2"}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm">Edit</button>
                          <button className="px-3 py-1 bg-red-500 text-white rounded-md text-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}