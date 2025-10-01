import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { clientApiService } from "@/services/client/client-api";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, FileText } from "lucide-react";
import { useVehicleStore } from "../../../stores/vehicleStore";

const vehicleSchema = z.object({
  vehicleName: z.string().min(2, { message: "Vehicle name is required" }),
  vehicleType: z.string().min(1, { message: "Please select a vehicle type" }),
  licensePlate: z.string().min(2, { message: "License plate is required" }),
  color: z.string().min(1, { message: "Color is required" }),
  insuranceNumber: z.string().min(1, { message: "Insurance number is required" }),
  mileage: z.coerce.number().int().min(0, { message: "Mileage must be a positive integer" }),
  seatCapacity: z.coerce.number().int().min(1, { message: "Seat capacity must be at least 1" }),
  vehicleImage: z
    .any()
    .refine((file) => !file || (file instanceof File && file.size > 0), { message: "Invalid vehicle image" })
    .optional(),
  documentImage: z
    .any()
    .refine((file) => !file || (file instanceof File && file.size > 0), { message: "Invalid document image" })
    .optional(),
});

interface VehicleFormProps {
  vehicleId?: string;
  onSubmit: (vehicle: any) => void;
  onCancel: () => void;
}

export default function VehicleForm({ vehicleId, onSubmit, onCancel }: VehicleFormProps) {
  const [vehicleImagePreview, setVehicleImagePreview] = useState<string | null>(null);
  const [documentImagePreview, setDocumentImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!vehicleId;
  const { vehicles, addPendingVehicle, clearPendingVehicle } = useVehicleStore();
  const { data: session, status } = useSession();
  const router = useRouter();

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleName: "",
      vehicleType: "",
      licensePlate: "",
      color: "",
      insuranceNumber: "",
      mileage: 0,
      seatCapacity: 1,
      vehicleImage: null,
      documentImage: null,
    },
  });

  useEffect(() => {
    if (isEditMode) {
      const vehicle = vehicles.find((v) => v._id === vehicleId);
      if (vehicle) {
        form.reset({
          vehicleName: vehicle.vehicleName,
          vehicleType: vehicle.vehicleType,
          licensePlate: vehicle.licensePlate,
          color: vehicle.color || "",
          insuranceNumber: vehicle.insuranceNumber || "",
          mileage: vehicle.mileage,
          seatCapacity: vehicle.seatCapacity || 1,
          vehicleImage: null,
          documentImage: null,
        });
        setVehicleImagePreview(vehicle.vehicleImage || null);
        setDocumentImagePreview(vehicle.documentImage || null);
      } else {
        setError("Vehicle not found");
      }
    }
  }, [vehicleId, vehicles, form, isEditMode]);

  const handleVehicleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    form.setValue("vehicleImage", file);
    if (file) {
      setVehicleImagePreview(URL.createObjectURL(file));
    } else {
      setVehicleImagePreview(null);
    }
  };

  const handleDocumentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    form.setValue("documentImage", file);
    if (file) {
      setDocumentImagePreview(URL.createObjectURL(file));
    } else {
      setDocumentImagePreview(null);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (status === "loading") {
      throw new Error("Session is still loading, please wait.");
    }
    if (status === "unauthenticated") {
      throw new Error("Authentication required. Please log in.");
    }
    const formData = new FormData();
    formData.append("file", file);
    const token = session?.user?.accessToken;
    if (!token) {
      throw new Error("Authentication required. Please log in.");
    }
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }
    return data.secure_url;
  };

  const handleSubmit = async (values: z.infer<typeof vehicleSchema>) => {
    setError(null);
    setIsLoading(true);
    try {
      if (status === "loading") {
        setError("Session is still loading, please wait.");
        return;
      }
      if (status === "unauthenticated") {
        setError("Authentication required. Please log in.");
        setTimeout(() => router.push("/user/login"), 2000);
        return;
      }
      const token = session?.user?.accessToken;
      if (!token) {
        setError("Authentication required. Please log in.");
        setTimeout(() => router.push("/user/login"), 2000);
        return;
      }

      const payload: any = {
        vehicleName: values.vehicleName,
        vehicleType: values.vehicleType,
        licensePlate: values.licensePlate,
        color: values.color,
        insuranceNumber: values.insuranceNumber,
        mileage: values.mileage,
        seatCapacity: values.seatCapacity,
      };

      if (values.vehicleImage instanceof File) {
        payload.vehicleImage = await uploadFile(values.vehicleImage);
      }
      if (values.documentImage instanceof File) {
        payload.documentImage = await uploadFile(values.documentImage);
      }

      let response;
      if (isEditMode) {
        response = await clientApiService.vehicle.updateVehicle(vehicleId, payload);
      } else {
        response = await clientApiService.vehicle.addVehicle(payload);
      }

      if (!response.success) {
        throw new Error(response.message || `Failed to ${isEditMode ? "update" : "add"} vehicle`);
      }

      const newVehicle = {
        _id: isEditMode ? vehicleId : response.data._id,
        ...payload,
        status: response.data.status || "Pending",
        imageUrl: payload.vehicleImage || vehicleImagePreview,
        user: response.data.user,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
      };

      if (!isEditMode) {
        // Mark vehicle as pending and add locally
        addPendingVehicle(newVehicle._id);
        useVehicleStore.getState().addVehicle(newVehicle);
      }

      onSubmit(newVehicle);
      form.reset();
      setVehicleImagePreview(null);
      setDocumentImagePreview(null);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        `Failed to ${isEditMode ? "update" : "register"} vehicle. Please try again.`;
      setError(errorMessage);
      if (errorMessage.includes("Authentication") || errorMessage.includes("token")) {
        setTimeout(() => router.push("/user/login"), 2000);
      }
    } finally {
      setIsLoading(false);
      // Clear pending vehicle after a delay to ensure socket event is skipped
      if (!isEditMode) {
        setTimeout(() => clearPendingVehicle(response?.data?._id || ""), 1000);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (vehicleImagePreview) URL.revokeObjectURL(vehicleImagePreview);
      if (documentImagePreview) URL.revokeObjectURL(documentImagePreview);
    };
  }, [vehicleImagePreview, documentImagePreview]);

  return (
    <div className="p-6 bg-gray-50 border border-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-2">{isEditMode ? "Edit Vehicle" : "Register New Vehicle"}</h2>
      <p className="text-gray-500 mb-6">
        {isEditMode ? "Update the details of your vehicle" : "Fill in the details to register your vehicle"}
      </p>
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
          {error}
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="vehicleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. My Honda Civic" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <FormControl>
                    {isEditMode ? (
                      <Input
                        value={field.value}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    ) : (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Car">Car</SelectItem>
                          <SelectItem value="Van">Van</SelectItem>
                          <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                          <SelectItem value="Truck">Truck</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="licensePlate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl>
                    {isEditMode ? (
                      <Input
                        value={field.value}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    ) : (
                      <Input placeholder="e.g., ABC123" {...field} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mileage</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="e.g. 20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seatCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seat Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="e.g. 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Blue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insuranceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. INS-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Image</FormLabel>
                  <FormControl>
                    <label
                      htmlFor="vehicleImage"
                      className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
                    >
                      {vehicleImagePreview ? (
                        <img
                          src={vehicleImagePreview || "/placeholder.svg"}
                          alt="Vehicle preview"
                          className="h-full w-auto object-contain"
                        />
                      ) : (
                        <span className="flex flex-col items-center space-y-2">
                          <Car className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload vehicle image</span>
                        </span>
                      )}
                      <input
                        id="vehicleImage"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleVehicleImageChange(e);
                          field.onChange(e.target.files?.[0] || null);
                        }}
                        className="hidden"
                      />
                    </label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documentImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Image</FormLabel>
                  <FormControl>
                    <label
                      htmlFor="documentImage"
                      className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
                    >
                      {documentImagePreview ? (
                        <img
                          src={documentImagePreview || "/placeholder.svg"}
                          alt="Document preview"
                          className="h-full w-auto object-contain"
                        />
                      ) : (
                        <span className="flex flex-col items-center space-y-2">
                          <FileText className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload document image</span>
                        </span>
                      )}
                      <input
                        id="documentImage"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleDocumentImageChange(e);
                          field.onChange(e.target.files?.[0] || null);
                        }}
                        className="hidden"
                      />
                    </label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || status === "loading"}>
              {isLoading ? (isEditMode ? "Updating..." : "Registering...") : (isEditMode ? "Update Vehicle" : "Register Vehicle")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}