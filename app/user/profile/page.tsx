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

const govIdSchema = z.object({
  idNumber: z.string().min(5, { message: "ID number must be at least 5 characters" }),
  documentImage: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, { message: "Please upload a document image" }),
});

export default function Profile() {
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showGovIdForm, setShowGovIdForm] = useState(false);
  const [documentImagePreview, setDocumentImagePreview] = useState<string | null>(null);
  const [isSubmittingGovId, setIsSubmittingGovId] = useState(false);
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    phone: "",
    image: "",
    gender: "",
    country: "",
    state: "",
    govId: {
      idNumber: "",
      documentUrl: "",
      verificationStatus: "",
      rejectionNote: "",
    },
  });

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const govIdForm = useForm<z.infer<typeof govIdSchema>>({
    resolver: zodResolver(govIdSchema),
    defaultValues: {
      idNumber: "",
      documentImage: null,
    },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data...");
        const profileData = await apiService.user.getProfile();
        console.log("Profile data:", profileData.data);
        if (profileData && profileData.data) {
          setUserData({
            fullName: profileData.data.fullName || "",
            email: profileData.data.email || "",
            phone: profileData.data.phoneNumber || "",
            image: profileData.data.image || "",
            gender: profileData.data.gender || "",
            country: profileData.data.country || "",
            state: profileData.data.state || "",
            govId: profileData.data.govId || { idNumber: "", documentUrl: "", verificationStatus: "", rejectionNote: "" },
          });
        } else {
          console.error("Invalid profile data structure:", profileData);
          setError("Failed to load profile data. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load profile data. Please try again.");
      }
    };

    if (isAuthenticated && !isLoading) {
      fetchUserData();
    }
  }, [isAuthenticated, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const updatedProfile = {
        fullName: userData.fullName,
        email: userData.email,
        phoneNumber: userData.phone,
        gender: userData.gender,
        country: userData.country,
        state: userData.state,
      };
      const response = await apiService.user.updateProfile(updatedProfile);
      console.log("Profile updated successfully:", response);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }
    return data.secure_url;
  };

  const handleGovIdSubmit = async (values: z.infer<typeof govIdSchema>) => {
    setError(null);
    setIsSubmittingGovId(true);
    try {
      const token = localStorage.getItem("accessToken");
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

      setUserData((prevData) => ({
        ...prevData,
        govId: {
          idNumber: values.idNumber,
          documentUrl: documentUrl,
          verificationStatus: "Pending",
          rejectionNote: "",
        },
      }));
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

  const isGovIdVerified = userData.govId?.verificationStatus === "Verified";
  const isGovIdRejected = userData.govId?.verificationStatus === "Rejected";
  const isGovIdPending = userData.govId?.verificationStatus === "Pending";

  return (
    <MainLayout activeItem="Profile">
      <div className="mx-auto max-w-4xl bg-white p-6 md:p-8 rounded-lg shadow-sm">
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Welcome, {userData.fullName || "User"}</h1>
            <p className="text-sm text-gray-500">{currentDate}</p>
          </div>
          <button className="text-xl">🔔</button>
        </div>
        <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-100 via-white to-yellow-100 p-6"></div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={userData.image}
              alt="User profile"
              className="h-16 w-16 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{userData.fullName || "User"}</h2>
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
                  <div className="flex items-center text-sm text-red-500">
                    <span>
                      ID Verification Rejected: {userData.govId.rejectionNote || "No reason provided"}
                    </span>
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
              <p className="text-sm text-gray-600">{userData.email || "user@example.com"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="font-semibold text-lg">4.5</span>
              <span className="text-yellow-400 ml-1">⭐</span>
            </div>
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded-md text-sm"
              onClick={() => {
                if (isEditing) {
                  handleSubmit();
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Save" : "Edit"}
            </button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={userData.fullName}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={userData.phone}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <input
              type="text"
              name="gender"
              value={userData.gender}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              name="country"
              value={userData.country}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={userData.email}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              name="state"
              value={userData.state}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}