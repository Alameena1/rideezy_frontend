"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { clientApiService } from "@/services/client/client-api";
import useAuth from "@/app/hooks/useAuth";
import MainLayout from "@/app/comp/MainLayout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  User, 
  Mail, 
  Phone,  
  Calendar,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  Shield,
  Globe,
  MapPin
} from "lucide-react";
import { Country, State, ICountry, IState } from "country-state-city";
import Cookies from "js-cookie";

const profileSchema = z
  .object({
    fullName: z
      .string()
      .min(5, { message: "Full name must be at least 5 characters" })
      .max(15, { message: "Full name must be less than 15 characters" })
      .refine((v) => !v || v.split(/\s+/g).length < 10, {
        message: "Full name must have less than 10 words",
      })
      .refine((v) => !v || /^[a-zA-Z\s]+$/.test(v), {
        message: "Full name can only contain letters and spaces",
      })
      .optional(),
    phoneNumber: z
      .string()
      .regex(/^\d+$/, { message: "Phone number must contain only numbers" })
      .refine((v) => !v || v.length === 10, {
        message: "Phone number must be exactly 10 digits",
      })
      .optional(),
    gender: z
      .string()
      .refine((v) => !v || ["Male", "Female", "Others"].includes(v), {
        message: "Invalid gender (must be Male, Female, or Others)",
      })
      .optional(),
    country: z
      .string()
      .refine((v) => !v || Country.getAllCountries().some((c) => c.name === v), {
        message: "Invalid country",
      })
      .optional(),
    state: z.string().optional(),
    email: z.string().email({ message: "Invalid email address" }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.country && data.state) {
      const country = Country.getAllCountries().find((c) => c.name === data.country);
      if (country) {
        const states = State.getStatesOfCountry(country.isoCode);
        if (states.length > 0 && !states.some((s) => s.name === data.state)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid state for the selected country",
            path: ["state"],
          });
        }
      }
    }
  });

const govIdSchema = z.object({
  idNumber: z
    .string()
    .min(5, { message: "ID number must be at least 5 characters" })
    .max(14, { message: "ID number must be less than 15 characters" }),
  documentImage: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, { message: "Please upload a document image" }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type GovIdFormValues = z.infer<typeof govIdSchema>;

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showGovIdForm, setShowGovIdForm] = useState(false);
  const [documentImagePreview, setDocumentImagePreview] = useState<string | null>(null);
  const [isSubmittingGovId, setIsSubmittingGovId] = useState(false);
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [states, setStates] = useState<IState[]>([]);
  const [govIdData, setGovIdData] = useState<{
    idNumber: string;
    documentUrl: string;
    verificationStatus: string;
    reason: string;
  }>({
    idNumber: "",
    documentUrl: "",
    verificationStatus: "",
    reason: "",
  });

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      gender: "",
      country: "",
      state: "",
    },
  });

  const govIdForm = useForm<GovIdFormValues>({
    resolver: zodResolver(govIdSchema),
    defaultValues: {
      idNumber: "",
      documentImage: null,
    },
  });

  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
  }, []);

  useEffect(() => {
    if (profileForm.getValues("country")) {
      const selectedCountry = countries.find((c) => c.name === profileForm.getValues("country"));
      if (selectedCountry) {
        const countryStates = State.getStatesOfCountry(selectedCountry.isoCode);
        setStates(countryStates);
      } else {
        setStates([]);
      }
    } else {
      setStates([]);
    }
  }, [profileForm.watch("country"), countries]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await clientApiService.user.getProfile();
        const profileData = response.data;

        if (profileData && typeof profileData === "object" && profileData._id) {
          profileForm.reset({
            fullName: profileData.fullName || "",
            email: profileData.email || "",
            phoneNumber: profileData.phoneNumber || "",
            gender: profileData.gender || "",
            country: profileData.country || "",
            state: profileData.state || "",
          });
          setGovIdData(
            profileData.govId || {
              idNumber: "",
              documentUrl: "",
              verificationStatus: "",
              reason: "",
            }
          );
        } else {
          console.error("Invalid profile data structure:", profileData);
          setError("Failed to load profile data. Please try again.");
        }
      } catch (error: any) {
        console.error("Error fetching user data:", error);
        if (error.response?.status === 401) {
          try {
            const refreshToken = Cookies.get("refreshToken");
            if (refreshToken) {
              const response = await clientApiService.auth.refreshToken({ refreshToken });
              if (response.success && response.accessToken) {
                Cookies.set("accessToken", response.accessToken, {
                  expires: 1,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "strict",
                });
                await fetchUserData();
              } else {
                throw new Error("Invalid refresh token response");
              }
            } else {
              throw new Error("No refresh token found");
            }
          } catch (refreshError) {
            console.error("Refresh token failed:", refreshError);
            setError("Session expired. Please log in again.");
            router.push("/user/login");
          }
        } else {
          setError("Failed to load profile data. Please try again.");
        }
      }
    };

    if (isAuthenticated && !authLoading) {
      fetchUserData();
    }
  }, [isAuthenticated, authLoading, router]);

const handleGovIdSubmit = async (values: GovIdFormValues) => {
  setError(null);
  setIsSubmittingGovId(true);
  try {
    console.log("🔄 Submitting government ID...");

    // First, check if user is authenticated
    if (!isAuthenticated) {
      setError("Please log in to submit government ID");
      return;
    }

    // Upload file first
    console.log("📤 Uploading document image...");
    const documentUrl = await uploadFile(values.documentImage);
    console.log("✅ Document uploaded:", documentUrl);
    
    // Prepare payload
    const payload = {
      govId: {
        idNumber: values.idNumber,
        documentUrl: documentUrl,
        verificationStatus: "Pending" as const,
      },
    };

    console.log("📤 Sending gov ID data to server...");
    
    // Use updateProfile for government ID submission
    const response = await clientApiService.user.updateProfile(payload);
    
    console.log("✅ Gov ID submission response:", response);

    // Handle different response structures
    if (response.success === false) {
      throw new Error(response.message || "Failed to submit government ID");
    }

    if (!response.data && !response.user) {
      throw new Error("Invalid response from server");
    }

    // Update local state with the response data
    const userData = response.data || response.user || response;
    setGovIdData({
      idNumber: values.idNumber,
      documentUrl: documentUrl,
      verificationStatus: "Pending",
      reason: userData.govId?.reason || "",
    });
    
    setShowGovIdForm(false);
    govIdForm.reset();
    setDocumentImagePreview(null);
    
    // Show success message
    setError(null);
    
  } catch (error: any) {
    console.error("❌ Gov ID submission failed:", error);
    
    // Handle specific error cases
    if (error.message === "Unauthenticated" || error.message === "No access token") {
      setError("Your session has expired. Please log in again.");
      // Optional: redirect to login after showing error
      setTimeout(() => {
        router.push("/user/login");
      }, 3000);
    } else if (error.response?.status === 401) {
      setError("Session expired. Please log in again.");
    } else if (error.response?.status === 403) {
      setError("Your account has been blocked. Please contact support.");
    } else {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to submit government ID. Please try again.";
      setError(errorMessage);
    }
  } finally {
    setIsSubmittingGovId(false);
  }
};


const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  
  // The interceptor will automatically add the token
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Upload failed");
  }
  return data.secure_url;
};

  const handleDocumentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    govIdForm.setValue("documentImage", file);
    if (file) {
      setDocumentImagePreview(URL.createObjectURL(file));
    } else {
      setDocumentImagePreview(null);
    }
  };

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    try {
      const updatedProfile: any = {};

      if (values.fullName) updatedProfile.fullName = values.fullName;
      if (values.email) updatedProfile.email = values.email;
      if (values.phoneNumber) updatedProfile.phoneNumber = values.phoneNumber;
      if (values.gender) updatedProfile.gender = values.gender;
      if (values.country) updatedProfile.country = values.country;
      if (values.state) updatedProfile.state = values.state;

      console.log("Sending profile update:", updatedProfile);

      const response = await clientApiService.user.updateProfile(updatedProfile);
      console.log("Profile updated successfully:", response.data);
      setIsEditing(false);
      setError(null);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update profile. Please try again.";
      setError(errorMessage);
    }
  };

  useEffect(() => {
    return () => {
      if (documentImagePreview) URL.revokeObjectURL(documentImagePreview);
    };
  }, [documentImagePreview]);

  if (authLoading || status === "loading") {
    return (
      <MainLayout activeItem="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <MainLayout activeItem="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isGovIdVerified = govIdData.verificationStatus === "Verified";
  const isGovIdRejected = govIdData.verificationStatus === "Rejected";
  const isGovIdPending = govIdData.verificationStatus === "Pending";

  const renderVerificationBadge = () => {
    if (isGovIdVerified) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (isGovIdPending) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Verification Pending
        </Badge>
      );
    } else if (isGovIdRejected) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          <Shield className="h-3 w-3 mr-1" />
          Not Verified
        </Badge>
      );
    }
  };

  return (
    <MainLayout activeItem="Profile">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Header Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {profileForm.getValues("fullName") || "Welcome Back"}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {currentDate}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                {renderVerificationBadge()}
                <p className="text-sm text-gray-600 mt-2">Account Status</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Manage your personal details and contact information
                    </CardDescription>
                  </div>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isEditing) {
                        profileForm.handleSubmit(handleProfileSubmit)();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditing ? "Save Changes" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                              placeholder="Enter your full name"
                              className={!isEditing ? "bg-gray-50" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              disabled 
                              className="bg-gray-50 text-gray-600"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                              placeholder="Enter 10-digit phone number"
                              maxLength={10}
                              className={!isEditing ? "bg-gray-50" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            Gender
                          </FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              disabled={!isEditing}
                              className={`w-full rounded-md border border-gray-300 py-2 px-3 ${
                                !isEditing ? "bg-gray-50 text-gray-600" : "text-gray-900"
                              }`}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Others">Others</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-500" />
                            Country
                          </FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              disabled={!isEditing}
                              className={`w-full rounded-md border border-gray-300 py-2 px-3 ${
                                !isEditing ? "bg-gray-50 text-gray-600" : "text-gray-900"
                              }`}
                            >
                              <option value="">Select Country</option>
                              {countries.map((c) => (
                                <option key={c.isoCode} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            State
                          </FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              disabled={!isEditing || states.length === 0}
                              className={`w-full rounded-md border border-gray-300 py-2 px-3 ${
                                !isEditing ? "bg-gray-50 text-gray-600" : "text-gray-900"
                              }`}
                            >
                              <option value="">Select State</option>
                              {states.map((s) => (
                                <option key={s.isoCode} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Verification & Actions */}
          <div className="space-y-6">
            {/* Verification Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                  ID Verification
                </CardTitle>
                <CardDescription>
                  Verify your identity to access all features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  {renderVerificationBadge()}
                </div>
                
                {isGovIdRejected && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">Rejection Reason:</p>
                    <p className="text-sm text-red-700 mt-1">{govIdData.reason || "No reason provided"}</p>
                  </div>
                )}

                {!isGovIdVerified && (
                  <Button 
                    onClick={() => setShowGovIdForm(true)}
                    className="w-full"
                    variant={isGovIdPending ? "outline" : "default"}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isGovIdPending ? "Resubmit Documents" : "Verify Identity"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Basic Information</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Complete
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ID Verification</span>
                    {isGovIdVerified ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <Separator />
                  <div className="pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className="font-medium text-blue-600">
                        {isGovIdVerified ? '100%' : '75%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${
                          isGovIdVerified ? 'bg-green-500 w-full' : 'bg-blue-500 w-3/4'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Government ID Verification Modal */}
        {showGovIdForm && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Verify Your Government ID
              </CardTitle>
              <CardDescription>
                Upload a clear image of your government-issued ID for verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...govIdForm}>
                <form onSubmit={govIdForm.handleSubmit(handleGovIdSubmit)} className="space-y-6">
                  <FormField
                    control={govIdForm.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. ABC123456" 
                            {...field} 
                            className="max-w-md"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={govIdForm.control}
                    name="documentImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Image</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <label
                              htmlFor="documentImage"
                              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50"
                            >
                              {documentImagePreview ? (
                                <div className="relative w-full h-full p-4">
                                  <img
                                    src={documentImagePreview}
                                    alt="Document preview"
                                    className="w-full h-full object-contain rounded"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <FileText className="w-12 h-12 text-gray-400 mb-4" />
                                  <p className="mb-2 text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    PNG, JPG, JPEG (MAX. 5MB)
                                  </p>
                                </div>
                              )}
                              <input
                                id="documentImage"
                                type="file"
                                accept="image/*"
                                onChange={handleDocumentImageChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowGovIdForm(false);
                        govIdForm.reset();
                        setDocumentImagePreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmittingGovId}
                      className="min-w-24"
                    >
                      {isSubmittingGovId ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        "Submit Verification"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}