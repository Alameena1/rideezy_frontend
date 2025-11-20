"use client";

import { useState, useEffect } from "react";
import { adminClientApiService, useAdminApiInterceptors } from "@/services/client/adminClientApi"; // ✅ ADDED: Import interceptor
  import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import Swal from 'sweetalert2';

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  totalRides: number;
  registrationDate: string;
  status: "Active" | "Blocked";
  isSubscribed: boolean;
  govIdStatus: "Pending" | "Verified" | "Rejected";
  hasOngoingRides: boolean;
}

interface PaginatedResponse {
  success: boolean;
  data: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface OngoingRidesResponse {
  success: boolean;
  hasOngoingRides: boolean;
  ongoingRides: any[];
  message: string;
  length: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(2);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [blockingUser, setBlockingUser] = useState<string | null>(null);

   useAdminApiInterceptors();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      console.log("📡 Fetching users with params:", params);
      const response: PaginatedResponse = await adminClientApiService.user.getUsers(params);
      
      if (!response.success) {
        throw new Error("Failed to fetch users");
      }

      // FIX: Enhanced validation for user data with proper ID handling
      const mappedUsers: User[] = response.data
        .map((user: any) => {
          // Handle both id and _id fields from backend
          const userId = user.id || user._id || '';
          
          if (!userId) {
            console.warn("⚠️ User without ID found:", user);
            return null;
          }

          return {
            id: userId,
            fullName: user.fullName || 'Unknown User',
            email: user.email || 'No email',
            phoneNumber: user.phoneNumber || "N/A",
            totalRides: user.totalRides || 0,
            registrationDate: user.createdAt || user.registrationDate || new Date().toISOString(),
            status: user.status || "Active",
            isSubscribed: user.isSubscribed || false,
            govIdStatus: user.govIdStatus || user.govId?.status || "Pending",
            hasOngoingRides: user.hasOngoingRides || false,
          };
        })
        .filter((user): user is User => user !== null); // Type guard to filter out nulls

      console.log("✅ Mapped users:", mappedUsers);
      
      setUsers(mappedUsers);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
      setHasNext(response.pagination.hasNext);
      setHasPrev(response.pagination.hasPrev);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch users";
      console.error("❌ Fetch users failed:", err);
      setError(errorMessage);
      
      // Show error to user
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search, statusFilter, sortBy, sortOrder]);

  const checkOngoingRides = async (userId: string): Promise<OngoingRidesResponse> => {
    try {
      // FIX: Enhanced validation for userId
      if (!userId || userId === 'undefined' || userId === 'null') {
        console.error("❌ Invalid user ID for ongoing rides check:", userId);
        return {
          success: false,
          hasOngoingRides: false,
          ongoingRides: [],
          message: "Invalid user ID",
          length: 0
        };
      }

      console.log("🔍 Checking ongoing rides for user:", userId);
      const response = await adminClientApiService.user.checkUserOngoingRides(userId);
      console.log("📊 Ongoing rides check result:", response);
      return response;
    } catch (error) {
      console.error("❌ Error checking ongoing rides:", error);
      return {
        success: false,
        hasOngoingRides: false,
        ongoingRides: [],
        message: "Failed to check ongoing rides",
        length: 0
      };
    }
  };

  const handleToggleStatus = async (user: User) => {
    // FIX: Comprehensive validation for user ID
    if (!user.id || user.id === 'undefined' || user.id === 'null') {
      console.error("❌ User ID is invalid:", user);
      await Swal.fire({
        title: 'Error!',
        text: 'Invalid user data. Please refresh the page and try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
      return;
    }

    if (blockingUser === user.id) return;
    
    try {
      setBlockingUser(user.id);
      
      if (user.status === "Active") {
        console.log("🔄 Checking ongoing rides before blocking user:", user.id);
        const ongoingRidesCheck = await checkOngoingRides(user.id);
        
        if (ongoingRidesCheck.hasOngoingRides && ongoingRidesCheck.ongoingRides.length > 0) {
          const rideDetails = ongoingRidesCheck.ongoingRides
            .slice(0, 5) // Limit to 5 rides to avoid huge modal
            .map((ride, index) => 
              `• Ride ${index + 1}: ${ride.startPlaceName || 'Unknown'} to ${ride.endPlaceName || 'Unknown'} (${ride.status || 'Unknown'})`
            )
            .join('\n');
          
          const remainingRides = Math.max(0, ongoingRidesCheck.ongoingRides.length - 5);
          const remainingText = remainingRides > 0 ? `\n\n...and ${remainingRides} more ride(s)` : '';
          
          await Swal.fire({
            title: 'Cannot Block User',
            html: `
              <div class="text-left">
                <p class="mb-3"><strong>${user.fullName}</strong> has ${ongoingRidesCheck.ongoingRides.length} ongoing ride(s):</p>
                <div class="bg-gray-100 p-3 rounded text-sm mb-4 max-h-32 overflow-y-auto font-mono text-xs">
                  ${rideDetails}${remainingText}
                </div>
                <p class="text-orange-600 font-semibold text-sm">
                  ❌ User cannot be blocked while they have ongoing rides.<br/>
                  Please try again after the user completes all their rides.
                </p>
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6',
            customClass: {
              popup: 'rounded-lg',
              confirmButton: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
            }
          });
          
          setBlockingUser(null);
          return;
        }
      }
      
      const action = user.status === "Active" ? "block" : "activate";
      const actionText = user.status === "Active" ? "Block" : "Activate";
      const confirmColor = user.status === "Active" ? "#d33" : "#3085d6";
      const statusText = user.status === "Active" ? "blocked" : "activated";
      
      const result = await Swal.fire({
        title: `${actionText} User?`,
        html: `
          <div class="text-left">
            <p>Are you sure you want to ${action} <strong>${user.fullName}</strong>?</p>
            <p class="text-sm text-gray-600">Email: ${user.email}</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: `Yes, ${actionText}`,
        cancelButtonText: 'Cancel',
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#6b7280',
        focusCancel: true
      });
      
      if (!result.isConfirmed) {
        setBlockingUser(null);
        return;
      }
      
      const newStatus = user.status === "Active" ? "Blocked" : "Active";
      
      console.log("🔄 Updating user status:", { 
        userId: user.id, 
        userName: user.fullName,
        oldStatus: user.status, 
        newStatus 
      });
      
      await adminClientApiService.user.toggleUserStatus(user.id, newStatus);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map((u) => 
          u.id === user.id ? { ...u, status: newStatus } : u
        )
      );
      
      await Swal.fire({
        title: 'Success!',
        html: `
          <div class="text-left">
            <p>User <strong>${user.fullName}</strong> has been ${statusText} successfully.</p>
            <p class="text-sm text-gray-600 mt-2">Status changed from <span class="font-semibold">${user.status}</span> to <span class="font-semibold">${newStatus}</span></p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      
    } catch (err: any) {
      console.error("❌ Toggle status failed:", err);
      
      let errorMessage = "Failed to update user status";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      await Swal.fire({
        title: 'Error!',
        html: `
          <div class="text-left">
            <p>${errorMessage}</p>
            <p class="text-sm text-gray-600 mt-2">User: ${user.fullName}</p>
            <p class="text-sm text-gray-600">ID: ${user.id}</p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
      
      setError(errorMessage);
      
      // Refresh users to get current state
      fetchUsers();
    } finally {
      setBlockingUser(null);
    }
  };

  const handleSearch = (searchValue: string) => {
    setSearch(searchValue);
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid Date";
    }
  };

  const renderStatus = (status: string) => {
    const color = status === "Active" 
      ? "text-green-500 bg-green-500/20 px-2 py-1 rounded text-xs font-medium" 
      : "text-red-500 bg-red-500/20 px-2 py-1 rounded text-xs font-medium";
    return <span className={color}>{status}</span>;
  };

  const renderGovtIdStatus = (status: string) => {
    const color =
      status === "Verified" ? "text-blue-500 bg-blue-500/20 px-2 py-1 rounded text-xs font-medium" : 
      status === "Pending" ? "text-orange-500 bg-orange-500/20 px-2 py-1 rounded text-xs font-medium" : 
      "text-red-500 bg-red-500/20 px-2 py-1 rounded text-xs font-medium";
    return <span className={color}>{status}</span>;
  };

  const renderOngoingRides = (hasOngoingRides: boolean) => {
    if (hasOngoingRides) {
      return (
        <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500 text-xs">
          Yes
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500 text-xs">
        No
      </Badge>
    );
  };

  const renderSubscribed = (subscribed: boolean) => {
    return subscribed ? (
      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500 text-xs">
        Subscribed
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500 text-xs">
        Not Subscribed
      </Badge>
    );
  };

  const columns = [
    { 
      key: "fullName", 
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("fullName")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300 font-semibold"
        >
          <span>Name</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (name: string) => <span className="text-gray-300 font-medium">{name}</span>
    },
    { 
      key: "email", 
      header: "Email", 
      render: (email: string) => <span className="text-gray-300 text-sm">{email}</span> 
    },
    { 
      key: "phoneNumber", 
      header: "Phone", 
      render: (phone: string) => <span className="text-gray-300 text-sm">{phone}</span> 
    },
    { 
      key: "totalRides", 
      header: "Total Rides", 
      render: (totalRides: number) => <span className="text-gray-300 font-medium">{totalRides}</span> 
    },
    { 
      key: "registrationDate", 
      header: "Registration Date", 
      render: (date: string) => <span className="text-gray-300 text-sm">{formatDate(date)}</span> 
    },
    { 
      key: "status", 
      header: "Status",
      render: (status: string) => renderStatus(status)
    },
    { 
      key: "isSubscribed", 
      header: "Subscribed",
      render: (subscribed: boolean) => renderSubscribed(subscribed)
    },
    { 
      key: "govIdStatus", 
      header: "Govt ID Status",
      render: (status: string) => renderGovtIdStatus(status)
    },
    { 
      key: "hasOngoingRides", 
      header: "Ongoing Rides",
      render: (hasOngoingRides: boolean) => renderOngoingRides(hasOngoingRides)
    },
  ];

  const renderActions = (user: User) => {
    const isInvalidUser = !user.id || user.id === 'undefined' || user.id === 'null';
    const isBlocking = blockingUser === user.id;
    const hasOngoingRidesBlock = user.status === "Active" && user.hasOngoingRides;
    
    return (
      <Button
        onClick={() => handleToggleStatus(user)}
        variant={user.status === "Active" ? "destructive" : "default"}
        size="sm"
        disabled={isBlocking || hasOngoingRidesBlock || isInvalidUser}
        title={
          isInvalidUser ? "Invalid user data" :
          hasOngoingRidesBlock ? "Cannot block user with ongoing rides" :
          user.status === "Active" ? "Block user" : "Activate user"
        }
        className={`
          text-xs font-medium
          ${user.status === "Active" 
            ? "bg-red-600 hover:bg-red-700 text-white" 
            : "bg-green-600 hover:bg-green-700 text-white"
          }
          ${isInvalidUser ? "opacity-50 cursor-not-allowed bg-gray-600" : ""}
        `}
      >
        {isInvalidUser ? "Invalid User" :
         isBlocking ? "Processing..." : 
         user.status === "Active" ? "Block" : "Activate"}
      </Button>
    );
  };

  const handleRefresh = () => {
    fetchUsers();
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400">Manage and monitor all users in the system</p>
            <p className="text-gray-500 text-sm mt-1">
              Showing {users.length} of {totalItems} users • Page {page} of {totalPages}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            Refresh
          </Button>
        </div>

        {/* Enhanced Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-600 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          error={error}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            hasNext,
            hasPrev,
          }}
          onPageChange={setPage}
          emptyMessage={
            loading ? "Loading users..." : 
            error ? "Error loading users" : 
            "No users found matching your criteria"
          }
          actions={renderActions}
        />

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Debug Info:</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Total Users: {totalItems}</div>
              <div>Current Page: {page}</div>
              <div>Valid Users: {users.filter(u => u.id).length}</div>
              <div>Search: "{search}"</div>
              <div>Status Filter: {statusFilter}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}