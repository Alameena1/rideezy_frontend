"use client";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import { useState, useEffect } from "react";
import { apiService } from "../../../services/api";
import Sidebar from "@/app/components/Sidebar";
import useAuth from "@/app/hooks/useAuth";
import Cookies from "js-cookie";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null); 

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    country: "",
    state: "",
  });


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data...");
        const profileData = await apiService.getProfile();
        console.log("Profile data:", profileData);
        if (profileData && profileData.data) {
          setUserData({
            fullName: profileData.data.fullName || "",
            email: profileData.data.email || "",
            phone: profileData.data.phoneNumber || "",
            gender: profileData.data.gender || "",
            country: profileData.data.country || "",
            state: profileData.data.state || "",
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
      const response = await apiService.updateProfile(updatedProfile);
      console.log("Profile updated successfully:", response);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 p-4 lg:p-8 flex items-center justify-center">
          <div>Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Delay redirect to allow debugging
    console.log("Redirecting to login due to unauthenticated state");
    setTimeout(() => {
      window.location.href = "/user/login";
    }, 1000); // Delay 1 second to log state
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 p-4 lg:p-8 flex items-center justify-center">
          <div>Redirecting to login...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          activeItem="Profile"
        />
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={toggleSidebar}
          ></div>
        )}
        <main className="flex-1 p-4 lg:p-8">
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
                  src="/api/placeholder/60/60"
                  alt="User profile"
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{userData.fullName || "User"}</h2>
                    <div className="flex items-center text-sm text-green-500">
                      <span>Verified</span>
                      <span className="ml-1 text-green-500">✓</span>
                    </div>
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
        </main>
      </div>
      <Footer />
    </>
  );
}