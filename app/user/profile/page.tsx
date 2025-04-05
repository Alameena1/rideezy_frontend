  "use client";
  import Footer from "@/app/components/Footer";
  import Navbar from "@/app/components/Navbar";
  import useAuth from "@/app/hooks/useAuth";
  import { useState, useEffect } from "react";
  import { apiService } from "@/services/api";


  export default function Home() {
    useAuth();


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


    const sidebarItems = [
      { icon: "⬜", label: "Dashboard", active: false },
      { icon: "⏱️", label: "History", active: false },
      { icon: "👤", label: "Profile", active: true },
      { icon: "⚙️", label: "Settings", active: false },
      { icon: "📄", label: "Documents", active: false },
      { icon: "👑", label: "Subscription", active: false },
    ];

    const toggleSidebar = () => {
      setIsSidebarOpen(!isSidebarOpen);
    };

    useEffect(() => {
      const fetchUserData = async () => {
        try {
          const token = localStorage.getItem("token");
          console.log("token", token)
          if (!token) {
            console.error("Token not found! Redirecting to login.");
            return;
          }


          const profileData = await apiService.getProfile(token);

          setUserData({
            fullName: profileData.data.fullName || "",
            email: profileData.data.email || "",
            phone: profileData.data.phoneNumber || "",
            gender: profileData.data.gender || "",
            country: profileData.data.country || "",
            state: profileData.data.state || "",
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }, []);


    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setUserData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    };
     
    const handleSubmit = async (e) => {
  
    
    
      try {
        const token = localStorage.getItem("accessToken");
       
        if (!token) {
          console.error("No token found! Redirecting to login.");
          return;
        }
    
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
      }
    };
    
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen bg-gray-50">
    
          <button
            className="fixed top-20 left-4 z-40 p-2 rounded-md bg-white shadow-md lg:hidden"
            onClick={toggleSidebar}
          >
            <div className="w-6 flex flex-col gap-1">
              <span className="h-0.5 w-full bg-gray-600 block"></span>
              <span className="h-0.5 w-full bg-gray-600 block"></span>
              <span className="h-0.5 w-full bg-gray-600 block"></span>
            </div>
          </button>

          <aside
            className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-16 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
          >
          
            <button
              className="absolute top-4 right-4 p-2 lg:hidden"
              onClick={toggleSidebar}
            >
              ✕
            </button>

            <div className="flex h-full flex-col items-center py-6">
              <nav className="flex-1 space-y-8 w-full">
                {sidebarItems.map((item) => (
                  <button
                    key={item.label}
                    className={`flex flex-col items-center justify-center w-full text-xs ${item.active ? "text-blue-500" : "text-gray-400"
                      }`}
                    onClick={toggleSidebar}
                  >
                    <span className="text-xl mb-1">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

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
                  <h1 className="text-2xl font-semibold">Welcome, {userData.fullName || "Amanda"}</h1>
                  <p className="text-sm text-gray-500">{currentDate}</p>
                </div>
                <button className="text-xl">🔔</button>
              </div>

              <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-100 via-white to-yellow-100 p-6">
              </div>

              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src="/api/placeholder/60/60"
                    alt="User profile"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">{userData.fullName || "Alexa Rawles"}</h2>
                      <div className="flex items-center text-sm text-green-500">
                        <span>Verified</span>
                        <span className="ml-1 text-green-500">✓</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{userData.email || "alexarawles@gmail.com"}</p>
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

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="fullName"
                      value={userData.fullName || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="phone"
                      value={userData.phone || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="gender"
                      value={userData.gender || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="country"
                      value={userData.country || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={userData.email || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="state"
                      value={userData.state || ""}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 py-2 px-3 text-gray-500"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }
