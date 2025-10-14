"use client";

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
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Car, FileText, Upload, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { useVehicleStore } from "../../../stores/vehicleStore";

const vehicleSchema = z.object({
  vehicleName: z.string()
    .min(3, { message: "Vehicle name must be at least 3 characters" })
    .max(10, { message: "Vehicle name must not exceed 10 characters" })
    .regex(/^[a-zA-Z0-9\s]+$/, { message: "Vehicle name can only contain letters, numbers, and spaces" }),
  
  vehicleType: z.string().min(1, { message: "Please select a vehicle type" }),
  
  licensePlate: z.string()
    .min(1, { message: "License plate is required" })
    .max(10, { message: "License plate must not exceed 10 characters" })
    .regex(/^[A-Z0-9-]+$/, { message: "License plate can only contain uppercase letters, numbers, and hyphens" }),
  
  color: z.string()
    .min(1, { message: "Color is required" })
    .max(20, { message: "Color must not exceed 20 characters" })
    .regex(/^[a-zA-Z\s]+$/, { message: "Color can only contain letters and spaces" }),
  
  insuranceNumber: z.string()
    .min(1, { message: "Insurance number is required" })
    .length(12, { message: "Insurance number must be exactly 12 characters" })
    .regex(/^[A-Z0-9]+$/, { message: "Insurance number can only contain uppercase letters and numbers" }),
  
  insuranceStartDate: z.string().min(1, { message: "Insurance start date is required" }),
  insuranceEndDate: z.string().min(1, { message: "Insurance end date is required" }),
  
  pollutionNumber: z.string()
    .min(1, { message: "Pollution number is required" })
    .length(12, { message: "Pollution number must be exactly 12 characters" })
    .regex(/^[A-Z0-9]+$/, { message: "Pollution number can only contain uppercase letters and numbers" }),
  
  pollutionStartDate: z.string().min(1, { message: "Pollution start date is required" }),
  pollutionEndDate: z.string().min(1, { message: "Pollution end date is required" }),
  
  mileage: z.coerce.number()
    .int({ message: "Mileage must be a whole number" })
    .min(0, { message: "Mileage must be a positive integer" })
    .max(1000, { message: "Mileage cannot exceed 1000 km" }),
  
  seatCapacity: z.coerce.number()
    .int({ message: "Seat capacity must be a whole number" })
    .min(1, { message: "Seat capacity must be at least 1" })
    .max(50, { message: "Seat capacity cannot exceed 50" }),
  
  vehicleImage: z
    .any()
    .refine((file) => !file || (file instanceof File && file.size > 0), { 
      message: "Invalid vehicle image" 
    })
    .refine((file) => !file || (file instanceof File && file.size <= 5 * 1024 * 1024), {
      message: "Vehicle image must be less than 5MB"
    })
    .optional(),
  
  insuranceImage: z
    .any()
    .refine((file) => !file || (file instanceof File && file.size > 0), { 
      message: "Invalid insurance image" 
    })
    .refine((file) => !file || (file instanceof File && file.size <= 5 * 1024 * 1024), {
      message: "Insurance image must be less than 5MB"
    })
    .optional(),
  
  pollutionImage: z
    .any()
    .refine((file) => !file || (file instanceof File && file.size > 0), { 
      message: "Invalid pollution image" 
    })
    .refine((file) => !file || (file instanceof File && file.size <= 5 * 1024 * 1024), {
      message: "Pollution image must be less than 5MB"
    })
    .optional(),
})
.refine((data) => new Date(data.insuranceEndDate) > new Date(data.insuranceStartDate), {
  message: "Insurance end date must be after start date",
  path: ["insuranceEndDate"],
})
.refine((data) => new Date(data.pollutionEndDate) > new Date(data.pollutionStartDate), {
  message: "Pollution end date must be after start date",
  path: ["pollutionEndDate"],
})
.refine((data) => new Date(data.insuranceStartDate) <= new Date(data.insuranceEndDate), {
  message: "Insurance start date cannot be after end date",
  path: ["insuranceStartDate"],
})
.refine((data) => new Date(data.pollutionStartDate) <= new Date(data.pollutionEndDate), {
  message: "Pollution start date cannot be after end date",
  path: ["pollutionStartDate"],
})
.refine((data) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(data.insuranceEndDate) >= today;
}, {
  message: "Insurance end date cannot be in the past",
  path: ["insuranceEndDate"],
})
.refine((data) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(data.pollutionEndDate) >= today;
}, {
  message: "Pollution end date cannot be in the past",
  path: ["pollutionEndDate"],
});

interface VehicleFormProps {
  vehicleId?: string;
  onSubmit: (vehicle: any) => void;
  onCancel: () => void;
}

export default function VehicleForm({ vehicleId, onSubmit, onCancel }: VehicleFormProps) {
  const [vehicleImagePreview, setVehicleImagePreview] = useState<string | null>(null);
  const [insuranceImagePreview, setInsuranceImagePreview] = useState<string | null>(null);
  const [pollutionImagePreview, setPollutionImagePreview] = useState<string | null>(null);
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
      insuranceStartDate: "",
      insuranceEndDate: "",
      pollutionNumber: "",
      pollutionStartDate: "",
      pollutionEndDate: "",
      mileage: 0,
      seatCapacity: 1,
      vehicleImage: null,
      insuranceImage: null,
      pollutionImage: null,
    },
  });

  // Get today's date in YYYY-MM-DD format for date input min attribute
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isEditMode) {
      const vehicle = vehicles.find((v) => v._id === vehicleId);
      if (vehicle) {
        form.reset({
          vehicleName: vehicle.vehicleName,
          vehicleType: vehicle.vehicleType,
          licensePlate: vehicle.licensePlate,
          color: vehicle.color || "",
          insuranceNumber: vehicle.insurance?.number || "",
          insuranceStartDate: vehicle.insurance?.startDate ? new Date(vehicle.insurance.startDate).toISOString().split('T')[0] : "",
          insuranceEndDate: vehicle.insurance?.endDate ? new Date(vehicle.insurance.endDate).toISOString().split('T')[0] : "",
          pollutionNumber: vehicle.pollution?.number || "",
          pollutionStartDate: vehicle.pollution?.startDate ? new Date(vehicle.pollution.startDate).toISOString().split('T')[0] : "",
          pollutionEndDate: vehicle.pollution?.endDate ? new Date(vehicle.pollution.endDate).toISOString().split('T')[0] : "",
          mileage: vehicle.mileage,
          seatCapacity: vehicle.seatCapacity || 1,
          vehicleImage: null,
          insuranceImage: null,
          pollutionImage: null,
        });
        setVehicleImagePreview(vehicle.vehicleImage || null);
        setInsuranceImagePreview(vehicle.insurance?.image || null);
        setPollutionImagePreview(vehicle.pollution?.image || null);
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

  const handleInsuranceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    form.setValue("insuranceImage", file);
    if (file) {
      setInsuranceImagePreview(URL.createObjectURL(file));
    } else {
      setInsuranceImagePreview(null);
    }
  };

  const handlePollutionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    form.setValue("pollutionImage", file);
    if (file) {
      setPollutionImagePreview(URL.createObjectURL(file));
    } else {
      setPollutionImagePreview(null);
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
    
    let response: any;
    
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
        licensePlate: values.licensePlate.toUpperCase(), // Convert to uppercase
        color: values.color,
        insurance: {
          number: values.insuranceNumber.toUpperCase(), // Convert to uppercase
          startDate: new Date(values.insuranceStartDate),
          endDate: new Date(values.insuranceEndDate),
        },
        pollution: {
          number: values.pollutionNumber.toUpperCase(), // Convert to uppercase
          startDate: new Date(values.pollutionStartDate),
          endDate: new Date(values.pollutionEndDate),
        },
        mileage: values.mileage,
        seatCapacity: values.seatCapacity,
      };

      // Handle file uploads
      if (values.vehicleImage instanceof File) {
        payload.vehicleImage = await uploadFile(values.vehicleImage);
      }
      if (values.insuranceImage instanceof File) {
        payload.insurance.image = await uploadFile(values.insuranceImage);
      } else if (insuranceImagePreview && !isEditMode) {
        payload.insurance.image = insuranceImagePreview;
      }
      if (values.pollutionImage instanceof File) {
        payload.pollution.image = await uploadFile(values.pollutionImage);
      } else if (pollutionImagePreview && !isEditMode) {
        payload.pollution.image = pollutionImagePreview;
      }

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
        addPendingVehicle(newVehicle._id);
        useVehicleStore.getState().addVehicle(newVehicle);
      }

      onSubmit(newVehicle);
      form.reset();
      setVehicleImagePreview(null);
      setInsuranceImagePreview(null);
      setPollutionImagePreview(null);
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
      if (!isEditMode && response?.data?._id) {
        setTimeout(() => clearPendingVehicle(response.data._id), 1000);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (vehicleImagePreview) URL.revokeObjectURL(vehicleImagePreview);
      if (insuranceImagePreview) URL.revokeObjectURL(insuranceImagePreview);
      if (pollutionImagePreview) URL.revokeObjectURL(pollutionImagePreview);
    };
  }, [vehicleImagePreview, insuranceImagePreview, pollutionImagePreview]);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Edit Vehicle" : "Register New Vehicle"}
            </h2>
            <p className="text-gray-600">
              {isEditMode ? "Update the details of your vehicle" : "Fill in the details to register your vehicle"}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="vehicleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Vehicle Name <span className="text-gray-500 text-xs">(3-10 characters)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Honda Civic" 
                        {...field} 
                        className="bg-white border-gray-200 focus:border-blue-500"
                        maxLength={10}
                      />
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
                    <FormLabel className="text-sm font-medium">Vehicle Type</FormLabel>
                    <FormControl>
                      {isEditMode ? (
                        <Input
                          value={field.value}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed border-gray-200"
                        />
                      ) : (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="bg-white border-gray-200 focus:border-blue-500">
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
                    <FormLabel className="text-sm font-medium">
                      License Plate <span className="text-gray-500 text-xs">(max 10 characters)</span>
                    </FormLabel>
                    <FormControl>
                      {isEditMode ? (
                        <Input
                          value={field.value}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed border-gray-200"
                        />
                      ) : (
                        <Input 
                          placeholder="e.g., ABC123 or KL-07-AB-1234" 
                          {...field} 
                          className="bg-white border-gray-200 focus:border-blue-500 uppercase"
                          maxLength={10}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
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
                    <FormLabel className="text-sm font-medium">
                      Mileage (km) <span className="text-gray-500 text-xs">(max 1000 km)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1" 
                        placeholder="e.g. 20" 
                        {...field} 
                        className="bg-white border-gray-200 focus:border-blue-500"
                        min="0"
                        max="1000"
                      />
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
                    <FormLabel className="text-sm font-medium">
                      Seat Capacity <span className="text-gray-500 text-xs">(1-50)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1" 
                        placeholder="e.g. 4" 
                        {...field} 
                        className="bg-white border-gray-200 focus:border-blue-500"
                        min="1"
                        max="50"
                      />
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
                    <FormLabel className="text-sm font-medium">
                      Color <span className="text-gray-500 text-xs">(max 20 characters)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Blue" 
                        {...field} 
                        className="bg-white border-gray-200 focus:border-blue-500"
                        maxLength={20}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Insurance Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Insurance Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="insuranceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Insurance Number <span className="text-gray-500 text-xs">(12 characters)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. INS123456789" 
                          {...field} 
                          className="bg-white border-gray-200 focus:border-blue-500 uppercase"
                          maxLength={12}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="insuranceStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-white border-gray-200 focus:border-blue-500"
                          max={form.watch('insuranceEndDate') || today}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="insuranceEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-white border-gray-200 focus:border-blue-500"
                          min={form.watch('insuranceStartDate') || today}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Pollution Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Pollution Certificate Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="pollutionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Pollution Number <span className="text-gray-500 text-xs">(12 characters)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. POL123456789" 
                          {...field} 
                          className="bg-white border-gray-200 focus:border-blue-500 uppercase"
                          maxLength={12}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pollutionStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-white border-gray-200 focus:border-blue-500"
                          max={form.watch('pollutionEndDate') || today}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pollutionEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-white border-gray-200 focus:border-blue-500"
                          min={form.watch('pollutionStartDate') || today}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Image Upload Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="vehicleImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle Image <span className="text-gray-500 text-xs">(max 5MB)</span>
                    </FormLabel>
                    <FormControl>
                      <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <label
                            htmlFor="vehicleImage"
                            className="flex flex-col items-center justify-center cursor-pointer"
                          >
                            {vehicleImagePreview ? (
                              <div className="text-center">
                                <img
                                  src={vehicleImagePreview || "/placeholder.svg"}
                                  alt="Vehicle preview"
                                  className="h-32 w-auto object-contain mx-auto mb-2 rounded-lg"
                                />
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Image uploaded
                                </p>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload vehicle image</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 5MB</p>
                              </div>
                            )}
                            <input
                              id="vehicleImage"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size > 5 * 1024 * 1024) {
                                  form.setError('vehicleImage', {
                                    type: 'manual',
                                    message: 'Vehicle image must be less than 5MB'
                                  });
                                  return;
                                }
                                handleVehicleImageChange(e);
                                field.onChange(file || null);
                              }}
                              className="hidden"
                            />
                          </label>
                        </CardContent>
                      </Card>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insuranceImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Insurance Image <span className="text-gray-500 text-xs">(max 5MB)</span>
                    </FormLabel>
                    <FormControl>
                      <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <label
                            htmlFor="insuranceImage"
                            className="flex flex-col items-center justify-center cursor-pointer"
                          >
                            {insuranceImagePreview ? (
                              <div className="text-center">
                                <img
                                  src={insuranceImagePreview || "/placeholder.svg"}
                                  alt="Insurance preview"
                                  className="h-32 w-auto object-contain mx-auto mb-2 rounded-lg"
                                />
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Image uploaded
                                </p>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload insurance</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 5MB</p>
                              </div>
                            )}
                            <input
                              id="insuranceImage"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size > 5 * 1024 * 1024) {
                                  form.setError('insuranceImage', {
                                    type: 'manual',
                                    message: 'Insurance image must be less than 5MB'
                                  });
                                  return;
                                }
                                handleInsuranceImageChange(e);
                                field.onChange(file || null);
                              }}
                              className="hidden"
                            />
                          </label>
                        </CardContent>
                      </Card>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pollutionImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Pollution Image <span className="text-gray-500 text-xs">(max 5MB)</span>
                    </FormLabel>
                    <FormControl>
                      <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <label
                            htmlFor="pollutionImage"
                            className="flex flex-col items-center justify-center cursor-pointer"
                          >
                            {pollutionImagePreview ? (
                              <div className="text-center">
                                <img
                                  src={pollutionImagePreview || "/placeholder.svg"}
                                  alt="Pollution preview"
                                  className="h-32 w-auto object-contain mx-auto mb-2 rounded-lg"
                                />
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Image uploaded
                                </p>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload pollution</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 5MB</p>
                              </div>
                            )}
                            <input
                              id="pollutionImage"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size > 5 * 1024 * 1024) {
                                  form.setError('pollutionImage', {
                                    type: 'manual',
                                    message: 'Pollution image must be less than 5MB'
                                  });
                                  return;
                                }
                                handlePollutionImageChange(e);
                                field.onChange(file || null);
                              }}
                              className="hidden"
                            />
                          </label>
                        </CardContent>
                      </Card>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || status === "loading"}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditMode ? "Updating..." : "Registering..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isEditMode ? "Update Vehicle" : "Register Vehicle"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}