"use client";

import { useState, useEffect } from "react";
import { apiService } from "../../../services/api";
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
import { FileText } from "lucide-react";
import { Country, State, ICountry, IState } from "country-state-city";
import { getValidToken } from "@/app/utils/auth";

// Frontend-specific schema for profile form
const profileSchema = z
  .object({
    fullName: z
      .string()
      .min(5, { message: "Full name must be at least 5 characters" })
      .max(50, { message: "Full name must be less than 50 characters" })
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

// Schema for government ID form
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
  const { isAuthenticated, isLoading } = useAuth();
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
        const profileData = await apiService.user.getProfile();
        if (profileData && profileData.data) {
          profileForm.reset({
            fullName: profileData.data.fullName || "",
            email: profileData.data.email || "",
            phoneNumber: profileData.data.phoneNumber || "",
            gender: profileData.data.gender || "",
            country: profileData.data.country || "",
            state: profileData.data.state || "",
          });
          setGovIdData(
            profileData.data.govId || {
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
            await refreshToken();
            const profileData = await apiService.user.getProfile();
            profileForm.reset({
              fullName: profileData.data.fullName || "",
              email: profileData.data.email || "",
              phoneNumber: profileData.data.phoneNumber || "",
              gender: profileData.data.gender || "",
              country: profileData.data.country || "",
              state: profileData.data.state || "",
            });
            setGovIdData(
              profileData.data.govId || {
                idNumber: "",
                documentUrl: "",
                verificationStatus: "",
                reason: "",
              }
            );
          } catch (refreshError) {
            console.error("Refresh token failed:", refreshError);
            setError("Session expired. Please log in again.");
            window.location.href = "/user/login";
          }
        } else {
          setError("Failed to load profile data. Please try again.");
        }
      }
    };

    if (isAuthenticated && !isLoading) {
      fetchUserData();
    }
  }, [isAuthenticated, isLoading, profileForm]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = await getValidToken();
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

  const handleGovIdSubmit = async (values: GovIdFormValues) => {
    setError(null);
    setIsSubmittingGovId(true);
    try {
      const token = await getValidToken();
      if (!token) {
        setError("Authentication required. Please log in.");
        window.location.href = "/user/login";
        return;
      }

      const documentUrl = await uploadFile(values.documentImage);
      const payload = {
        govId: {
          idNumber: values.idNumber,
          documentUrl: documentUrl,
          verificationStatus: "Pending",
        },
      };

      const response = await apiService.user.submitGovId(payload);
      if (!response.success) {
        throw new Error(response.message || "Failed to submit government ID");
      }

      setGovIdData({
        idNumber: values.idNumber,
        documentUrl: documentUrl,
        verificationStatus: "Pending",
        reason: "",
      });
      setShowGovIdForm(false);
      govIdForm.reset();
      setDocumentImagePreview(null);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to submit government ID. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmittingGovId(false);
    }
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
    // Only include fields that have values
    const updatedProfile: any = {};
    
    if (values.fullName) updatedProfile.fullName = values.fullName;
    if (values.email) updatedProfile.email = values.email;
    if (values.phoneNumber) updatedProfile.phoneNumber = values.phoneNumber;
    if (values.gender) updatedProfile.gender = values.gender;
    if (values.country) updatedProfile.country = values.country;
    if (values.state) updatedProfile.state = values.state;
    
    console.log("Sending profile update:", updatedProfile);
    
    const response = await apiService.user.updateProfile(updatedProfile);
    console.log("Profile updated successfully:", response);
    setIsEditing(false);
    setError(null);
  } catch (error: any) {
    console.error("Error updating profile:", error);
    // Log the specific validation errors
    if (error.response?.data?.errors) {
      console.error("Validation errors:", error.response.data.errors);
    }
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

  if (isLoading) {
    return (
      <MainLayout activeItem="Profile">
        <div className="flex items-center justify-center h-full">
          <div>Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    console.log("Redirecting to login due to unauthenticated state");
    setTimeout(() => {
      window.location.href = "/user/login";
    }, 1000);
    return (
      <MainLayout activeItem="Profile">
        <div className="flex items-center justify-center h-full">
          <div>Redirecting to login...</div>
        </div>
      </MainLayout>
    );
  }

  const isGovIdVerified = govIdData.verificationStatus === "Verified";
  const isGovIdRejected = govIdData.verificationStatus === "Rejected";
  const isGovIdPending = govIdData.verificationStatus === "Pending";

  return (
    <MainLayout activeItem="Profile">
      <div className="mx-auto max-w-4xl bg-white p-6 md:p-8 rounded-lg shadow-sm">
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold truncate max-w-[300px]" title={profileForm.getValues("fullName")}>
              Welcome, {profileForm.getValues("fullName") || "User"}
            </h1>
            <p className="text-sm text-gray-500">{currentDate}</p>
          </div>
        </div>
        <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-100 via-white to-yellow-100 p-6"></div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold truncate max-w-[300px]" title={profileForm.getValues("fullName")}>
                  {profileForm.getValues("fullName") || "User"}
                </h2>
                {isGovIdVerified ? (
                  <div className="flex items-center text-sm text-green-500">
                    <span>Verified</span>
                    <span className="ml-1 text-green-500">✓</span>
                  </div>
                ) : isGovIdPending ? (
                  <div className="flex items-center text-sm text-yellow-500">
                    <span>Verification pending...</span>
                  </div>
                ) : isGovIdRejected ? (
                  <div className="flex items-center text-sm">
                    <div className="relative group">
                      <span className="text-red-500">Rejected</span>
                      <div className="absolute hidden group-hover:block z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-800 rounded-md shadow-lg">
                        <p>Reason: {govIdData.reason || "No reason provided"}</p>
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-gray-800"></div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowGovIdForm(true)}
                      className="ml-2 text-blue-500 underline text-sm"
                    >
                      Resubmit
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-yellow-500">
                    <span>Verify your gov ID and start riding!</span>
                    <button
                      onClick={() => setShowGovIdForm(true)}
                      className="ml-2 text-blue-500 underline text-sm"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">{profileForm.getValues("email") || "user@example.com"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded-md text-sm"
              onClick={() => {
                if (isEditing) {
                  profileForm.handleSubmit(handleProfileSubmit)();
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? "Save" : "Edit"}
            </button>
            {isEditing && (
              <button
                className="bg-gray-500 text-white px-4 py-1 rounded-md text-sm"
                onClick={() => {
                  setIsEditing(false);
                  // Reset form to original values
                  profileForm.reset();
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {showGovIdForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Verify Your Government ID</h3>
            <Form {...govIdForm}>
              <form onSubmit={govIdForm.handleSubmit(handleGovIdSubmit)} className="space-y-4">
                <FormField
                  control={govIdForm.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ABC123456" {...field} />
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
                        <label
                          htmlFor="documentImage"
                          className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
                        >
                          {documentImagePreview ? (
                            <img
                              src={documentImagePreview}
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
                <div className="flex justify-end gap-2">
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
                  <Button type="submit" disabled={isSubmittingGovId}>
                    {isSubmittingGovId ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={profileForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={!isEditing}
                      placeholder="Enter your full name (5-50 characters)"
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
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing} 
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
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
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={!isEditing}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
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
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={!isEditing}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={true} readOnly />
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
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={!isEditing || states.length === 0}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
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
      </div>
    </MainLayout>
  );
}