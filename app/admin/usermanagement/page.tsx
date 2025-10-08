"use client";

import { useState, useEffect } from "react";
import { adminClientApiService as apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import Swal from 'sweetalert2';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  totalRides: string;
  registrationDate: string;
  status: string;
  subscribed: boolean;
  govtIdStatus: string;
  hasOngoingRides?: boolean;
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
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [blockingUser, setBlockingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
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

      const response: PaginatedResponse = await apiService.user.getUsers(params);
      
      const mappedUsers: User[] = response.data.map((user: any) => ({
        _id: user._id.toString(),
        name: user.fullName || "Unknown",
        email: user.email || "N/A",
        phone: user.phone || "N/A",
        totalRides: user.totalRides || "0/0",
        registrationDate: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString()
          : "N/A",
        status: user.status || "Active",
        subscribed: user.subscription?.isSubscribed || false,
        govtIdStatus: user.govId?.verificationStatus || "Pending",
        hasOngoingRides: user.hasOngoingRides || false,
      }));
      
      setUsers(mappedUsers);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
      setHasNext(response.pagination.hasNext);
      setHasPrev(response.pagination.hasPrev);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch users";
      console.error("Fetch users failed:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search, statusFilter, sortBy, sortOrder]);

  const checkOngoingRides = async (userId: string): Promise<OngoingRidesResponse> => {
    try {
      const response = await apiService.user.checkUserOngoingRides(userId);
      return response;
    } catch (error) {
      console.error("Error checking ongoing rides:", error);
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
    if (blockingUser === user._id) return;
    
    try {
      setBlockingUser(user._id);
      
      if (user.status === "Active") {
        const ongoingRidesCheck = await checkOngoingRides(user._id);
        
        if (ongoingRidesCheck.hasOngoingRides && ongoingRidesCheck.ongoingRides.length > 0) {
          const rideDetails = ongoingRidesCheck.ongoingRides.map((ride, index) => 
            `• Ride ${index + 1}: ${ride.startPlaceName} to ${ride.endPlaceName} (${ride.status})`
          ).join('\n');
          
          await Swal.fire({
            title: 'Cannot Block User',
            html: `
              <div class="text-left">
                <p class="mb-3"><strong>${user.name}</strong> has ${ongoingRidesCheck.ongoingRides.length} ongoing ride(s):</p>
                <div class="bg-gray-100 p-3 rounded text-sm mb-4 max-h-32 overflow-y-auto">
                  ${rideDetails}
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
      
      const result = await Swal.fire({
        title: `${actionText} User?`,
        text: `Are you sure you want to ${action} ${user.name}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: `Yes, ${actionText}`,
        cancelButtonText: 'Cancel',
        confirmButtonColor: confirmColor,
        cancelButtonColor: user.status === "Active" ? '#3085d6' : '#d33',
      });
      
      if (!result.isConfirmed) {
        setBlockingUser(null);
        return;
      }
      
      const newStatus = user.status === "Active" ? "Blocked" : "Active";
      await apiService.user.toggleUserStatus(user._id, newStatus);
      
      setUsers(users.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u)));
      
      Swal.fire({
        title: 'Success!',
        text: `User ${user.name} has been ${newStatus === "Blocked" ? "blocked" : "activated"}`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to update user status";
      console.error("Toggle status failed:", err);
      
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
      
      setError(errorMessage);
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

  const renderStatus = (status: string) => {
    const color = status === "Active" ? "text-green-500" : "text-red-500";
    return <span className={color}>{status}</span>;
  };

  const renderGovtIdStatus = (status: string) => {
    const color =
      status === "Verified" ? "text-blue-500" : 
      status === "Pending" ? "text-orange-500" : "text-red-500";
    return <span className={color}>{status}</span>;
  };

  const renderOngoingRides = (hasOngoingRides: boolean) => {
    if (hasOngoingRides) {
      return (
        <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500">
          Yes
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
        No
      </Badge>
    );
  };

  const renderSubscribed = (subscribed: boolean) => {
    return subscribed ? (
      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500">
        True
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500">
        False
      </Badge>
    );
  };

  const columns = [
    { 
      key: "name", 
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("name")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300"
        >
          <span>Name</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (name: string) => <span className="text-gray-300 font-medium">{name}</span>
    },
    { key: "email", header: "Email", render: (email: string) => <span className="text-gray-300">{email}</span> },
    { key: "phone", header: "Phone", render: (phone: string) => <span className="text-gray-300">{phone}</span> },
    { key: "totalRides", header: "Total Rides", render: (totalRides: string) => <span className="text-gray-300">{totalRides}</span> },
    { key: "registrationDate", header: "Registration Date", render: (date: string) => <span className="text-gray-300">{date}</span> },
    { 
      key: "status", 
      header: "Status",
      render: (status: string) => renderStatus(status)
    },
    { 
      key: "subscribed", 
      header: "Subscribed",
      render: (subscribed: boolean) => renderSubscribed(subscribed)
    },
    { 
      key: "govtIdStatus", 
      header: "Govt ID Status",
      render: (status: string) => renderGovtIdStatus(status)
    },
    { 
      key: "hasOngoingRides", 
      header: "Ongoing Rides",
      render: (hasOngoingRides: boolean) => renderOngoingRides(hasOngoingRides)
    },
  ];

  const renderActions = (user: User) => (
    <Button
      onClick={() => handleToggleStatus(user)}
      variant={user.status === "Active" ? "destructive" : "default"}
      size="sm"
      disabled={blockingUser === user._id || (user.status === "Active" && user.hasOngoingRides)}
      title={user.status === "Active" && user.hasOngoingRides ? "Cannot block user with ongoing rides" : ""}
      className={user.status === "Active" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
    >
      {blockingUser === user._id ? "Processing..." : user.status === "Active" ? "Block" : "Activate"}
    </Button>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400">Manage and monitor all users in the system</p>
          </div>
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
            onPageChange: setPage,
          }}
          emptyMessage="No users found."
          actions={renderActions}
        />
      </div>
    </div>
  );
}