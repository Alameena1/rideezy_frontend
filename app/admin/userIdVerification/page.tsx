"use client";

import { useState, useEffect } from "react";
import { adminClientApiService as apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  User,
  Mail,
  Calendar,
} from "lucide-react";
import Swal from 'sweetalert2';

// Define the actual user interface based on backend response
interface User {
  _id?: string; // MongoDB _id field
  id?: string; // Some APIs might use id instead of _id
  fullName: string;
  email: string;
  govId?: {
    idNumber: string;
    documentUrl: string;
    verificationStatus: "Pending" | "Verified" | "Rejected";
    rejectionNote?: string;
  };
  createdAt: string;
  // Add other fields that might be present
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DocumentPreview {
  url: string;
  user: {
    fullName: string;
    idNumber: string;
  };
}

// Helper function to check if a string is a public_id
const isPublicId = (imageString: string): boolean => {
  return !imageString.startsWith('http') && !imageString.includes('/') && imageString.length > 0;
};

// Function to generate signed URL
const generateSignedUrl = async (publicId: string): Promise<string> => {
  try {
    const response = await fetch("/api/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_id: publicId,
        expiration: 3600,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate signed URL");
    }

    const data = await response.json();
    return data.signed_url;
  } catch (error) {
    console.error("❌ Failed to generate signed URL:", error);
    throw error;
  }
};

// Get the actual user ID from user object (handles both _id and id fields)
const getUserId = (user: User): string => {
  // Try _id first (MongoDB default), then id, then generate fallback
  return user._id || user.id || `unknown-${Math.random().toString(36).substr(2, 9)}`;
};

// Validation function for user ID
const isValidUserId = (userId: string): boolean => {
  // Allow both MongoDB ObjectId format and our fallback format
  if (userId.startsWith('unknown-')) {
    return true; // Our fallback IDs are considered valid for UI purposes
  }
  return !!(userId && userId.trim() !== '' && userId.match(/^[0-9a-fA-F]{24}$/));
};

// Safe substring function
const safeSubstring = (str: string | undefined | null, start: number, end?: number): string => {
  if (!str) return "N/A";
  return str.substring(start, end);
};

export default function UserIdVerification() {
  const [users, setUsers] = useState<User[]>([]);
  const [processedUsers, setProcessedUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Document preview states
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const [rejectionNote, setRejectionNote] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit,
        search: searchTerm || undefined,
        govIdStatus: statusFilter !== "all" ? statusFilter as "Pending" | "Verified" | "Rejected" : "Pending",
        sortBy, 
        sortOrder, 
      };

      console.log("📤 Fetching users with params:", params);

      const response = await apiService.user.getUsers(params);
      console.log("📥 Fetched users response:", response);
      
      if (response && response.success && Array.isArray(response.data)) {
        // Log the raw data structure to understand what we're getting
        console.log("🔍 Raw user data sample:", response.data[0]);
        
        // Process users to ensure consistent structure
        const validatedUsers = response.data.map((user: any) => {
          const userId = user._id || user.id;
          console.log(`👤 Processing user:`, { 
            _id: user._id, 
            id: user.id, 
            fullName: user.fullName,
            hasGovId: !!user.govId 
          });
          
          return {
            ...user,
            _id: user._id,
            id: user.id,
            fullName: user.fullName || "Unknown User",
            email: user.email || "No email",
            govId: user.govId ? {
              idNumber: user.govId.idNumber || "N/A",
              documentUrl: user.govId.documentUrl || "",
              verificationStatus: user.govId.verificationStatus || "Pending",
              rejectionNote: user.govId.rejectionNote || "",
            } : undefined,
            createdAt: user.createdAt || new Date().toISOString(),
          };
        });
        
        setUsers(validatedUsers);
        setPagination(response.pagination);
        
      } else {
        console.error("❌ Unexpected response format:", response);
        setError("Invalid response format from server");
        setUsers([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch users";
      console.error("❌ Fetch users failed:", err);
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Process users to convert public_ids to signed URLs
  useEffect(() => {
    const processUserDocuments = async () => {
      if (!users.length) {
        setProcessedUsers([]);
        return;
      }

      try {
        const usersWithSignedUrls = await Promise.all(
          users.map(async (user) => {
            const userId = getUserId(user);
            let signedDocumentUrl = user.govId?.documentUrl || "";
            
            if (user.govId?.documentUrl && isPublicId(user.govId.documentUrl)) {
              try {
                console.log(`🔄 Generating signed URL for user ${userId}`);
                signedDocumentUrl = await generateSignedUrl(user.govId.documentUrl);
                console.log(`✅ Signed URL generated for user ${userId}`);
              } catch (error) {
                console.error(`❌ Failed to generate signed URL for user ${userId}:`, error);
                signedDocumentUrl = "/placeholder.svg";
              }
            }

            return {
              ...user,
              govId: user.govId ? {
                ...user.govId,
                documentUrl: signedDocumentUrl
              } : undefined
            };
          })
        );

        setProcessedUsers(usersWithSignedUrls);
      } catch (error) {
        console.error("❌ Failed to process user documents:", error);
        setProcessedUsers(users);
      }
    };

    processUserDocuments();
  }, [users]);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleApproveUser = async (user: User) => {
    const userId = getUserId(user);
    try {
      console.log("🟢 Approving user ID:", userId, "User object:", user);
      
      // For fallback IDs, we can't make the API call
      if (userId.startsWith('unknown-')) {
        const errorMsg = "Cannot process user: Invalid user ID received from server";
        console.error("❌", errorMsg, user);
        Swal.fire('Error!', errorMsg, 'error');
        return;
      }

      setProcessingUser(userId);
      
      await apiService.user.verifyGovId(userId, "Verified");
      
      Swal.fire({
        title: 'Success!',
        text: 'User ID verified successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      fetchUsers(currentPage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve user ID";
      console.error("❌ Approve user ID failed:", err);
      setError(errorMessage);
      Swal.fire('Error!', errorMessage, 'error');
    } finally {
      setProcessingUser(null);
    }
  };

  const openRejectionModal = (user: User) => {
    const userId = getUserId(user);
    console.log("🔴 Opening rejection modal for user:", userId);
    
    // For fallback IDs, we can't make the API call
    if (userId.startsWith('unknown-')) {
      const errorMsg = "Cannot process user: Invalid user ID received from server";
      console.error("❌", errorMsg, user);
      Swal.fire('Error!', errorMsg, 'error');
      return;
    }
    
    setSelectedUser(userId);
    setRejectionNote("");
    setShowRejectionModal(true);
  };

  const handleRejectUser = async () => {
    if (!selectedUser) {
      const errorMsg = "No user selected for rejection";
      console.error("❌", errorMsg);
      Swal.fire('Error!', errorMsg, 'error');
      return;
    }

    if (!rejectionNote.trim()) {
      const errorMsg = "Rejection reason is required";
      console.error("❌", errorMsg);
      Swal.fire('Error!', 'Please provide a rejection reason.', 'error');
      return;
    }

    try {
      console.log("🔴 Rejecting user ID:", selectedUser, "Reason:", rejectionNote);
      setProcessingUser(selectedUser);
      
      await apiService.user.verifyGovId(selectedUser, "Rejected", rejectionNote);
      
      setShowRejectionModal(false);
      setSelectedUser(null);
      setRejectionNote("");
      
      Swal.fire({
        title: 'Success!',
        text: 'User ID rejected successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      fetchUsers(currentPage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject user ID";
      console.error("❌ Reject user ID failed:", err);
      setError(errorMessage);
      Swal.fire('Error!', errorMessage, 'error');
    } finally {
      setProcessingUser(null);
    }
  };

  // Secure document preview handler
  const handleViewDocument = (user: User) => {
    const userId = getUserId(user);
    console.log("📄 Viewing document for user:", userId);
    
    if (!user.govId?.documentUrl || user.govId.documentUrl === "/placeholder.svg") {
      console.warn("⚠️ No document available for user:", userId);
      Swal.fire('Info', 'No document available to view.', 'info');
      return;
    }

    setDocumentPreview({
      url: user.govId.documentUrl,
      user: {
        fullName: user.fullName,
        idNumber: user.govId.idNumber,
      }
    });
    setZoom(1);
    setRotation(0);
  };

  // Download document handler
  const handleDownloadDocument = async () => {
    if (!documentPreview) return;

    try {
      console.log("📥 Downloading document:", documentPreview.url);
      
      const response = await fetch(documentPreview.url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from URL or use user info
      const fileName = `ID_Document_${documentPreview.user.fullName}_${documentPreview.user.idNumber}.${getFileExtension(documentPreview.url)}`;
      link.download = fileName.replace(/\s+/g, '_');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log("✅ Document downloaded successfully");
      Swal.fire('Success!', 'Document downloaded successfully.', 'success');
    } catch (error) {
      console.error('❌ Download failed:', error);
      Swal.fire('Error!', 'Failed to download document.', 'error');
    }
  };

  // Helper function to get file extension
  const getFileExtension = (url: string): string => {
    const match = url.match(/\.([^.?]+)(?:\?|$)/);
    return match ? match[1] : 'jpg';
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetControls = () => {
    setZoom(1);
    setRotation(0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid Date";
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "Verified":
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Verified
            </div>
          </Badge>
        );
      case "Rejected":
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              Rejected
            </div>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              Pending
            </div>
          </Badge>
        );
    }
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
          <User className="h-4 w-4" />
          <span>Name</span>
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      render: (fullName: string, user: User) => {
        const userId = getUserId(user);
        return (
          <div>
            <span className="font-medium text-white block">{fullName || "Unknown User"}</span>
            <span className="text-xs text-gray-400">
              ID: {safeSubstring(userId, 0, 8)}...
              {userId.startsWith('unknown-') && (
                <span className="text-red-400 ml-1">(Invalid ID)</span>
              )}
            </span>
          </div>
        );
      }
    },
    { 
      key: "email", 
      header: () => (
        <div className="flex items-center space-x-1 text-gray-300 font-semibold">
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </div>
      ),
      render: (email: string) => (
        <span className="text-gray-300 text-sm">{email || "No email"}</span>
      )
    },
    { 
      key: "govId.idNumber", 
      header: "ID Number",
      render: (idNumber: string, user: User) => (
        <div className="font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded text-xs">
          {user.govId?.idNumber || "N/A"}
        </div>
      )
    },
    { 
      key: "createdAt", 
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("createdAt")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300 font-semibold"
        >
          <Calendar className="h-4 w-4" />
          <span>Submitted On</span>
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      render: (createdAt: string) => (
        <div className="text-gray-300 text-sm">
          {formatDate(createdAt)}
        </div>
      )
    },
    { 
      key: "govId.verificationStatus", 
      header: "Status",
      render: (status: string, user: User) => renderStatus(user.govId?.verificationStatus || "Pending")
    },
    {
      key: "document",
      header: "Document",
      render: (_: any, user: User) => (
        <Button
          onClick={() => handleViewDocument(user)}
          variant="outline"
          size="sm"
          disabled={!user.govId?.documentUrl || user.govId.documentUrl === "/placeholder.svg"}
          className="bg-purple-600 text-white hover:bg-purple-700 border-purple-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:border-gray-600 text-xs"
        >
          {user.govId?.documentUrl && user.govId.documentUrl !== "/placeholder.svg" ? "View Document" : "No Document"}
        </Button>
      )
    },
  ];

  const renderActions = (user: User) => {
    const userId = getUserId(user);
    console.log("🔧 Rendering actions for user:", userId, user.fullName);
    
    const status = user.govId?.verificationStatus || "Pending";
    
    if (status === "Pending") {
      const isProcessing = processingUser === userId;
      const hasValidId = !userId.startsWith('unknown-');
      
      return (
        <div className="flex space-x-2">
          <Button
            onClick={() => handleApproveUser(user)}
            variant="default"
            size="sm"
            disabled={isProcessing || !hasValidId}
            className="bg-green-600 text-white hover:bg-green-700 border-green-500 disabled:bg-gray-600 disabled:opacity-50 text-xs"
            title={!hasValidId ? "Cannot approve: Invalid user ID" : ""}
          >
            {isProcessing ? "Processing..." : "Approve"}
          </Button>
          <Button
            onClick={() => openRejectionModal(user)}
            variant="destructive"
            size="sm"
            disabled={isProcessing || !hasValidId}
            className="bg-red-600 hover:bg-red-700 border-red-500 disabled:bg-gray-600 disabled:opacity-50 text-xs"
            title={!hasValidId ? "Cannot reject: Invalid user ID" : ""}
          >
            {isProcessing ? "Processing..." : "Reject"}
          </Button>
        </div>
      );
    }
    
    return (
      <div className="text-sm text-gray-400 px-2">
        {status === "Verified" ? "✅ Verified" : "❌ Rejected"}
      </div>
    );
  };

  const handleRetry = () => {
    fetchUsers(currentPage);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">User ID Verification Management</h1>
            <p className="text-gray-400">Verify and manage user government ID documents</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Total: {pagination.totalItems} users
            </div>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Data Quality Warning */}
        {processedUsers.some(user => getUserId(user).startsWith('unknown-')) && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-400">
                Warning: Some users have invalid IDs and cannot be processed. This indicates a data issue with the backend API.
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name, email, or ID number..."
              value={searchTerm}
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
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Verified">Verified</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-400">{error}</span>
              </div>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={processedUsers}
          loading={loading}
          error={error}
          emptyMessage="No users found for ID verification."
          actions={renderActions}
          pagination={{
            currentPage: currentPage,
            totalPages: pagination.totalPages,
            totalItems: pagination.totalItems,
            hasNext: pagination.hasNext,
            hasPrev: pagination.hasPrev,
          }}
          onPageChange={handlePageChange}
          keyField={(user: User) => getUserId(user)}
        />

        {/* Secure Document Preview Dialog */}
        <Dialog open={!!documentPreview} onOpenChange={() => setDocumentPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-800 border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    ID Document Preview - {documentPreview?.user.fullName}
                    <div className="text-sm text-gray-400 mt-1">
                      ID Number: {documentPreview?.user.idNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadDocument}
                    className="bg-green-600 text-white hover:bg-green-700 border-green-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDocumentPreview(null)}
                    className="text-white hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col h-full">
              {/* Image Controls */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Controls:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="h-8 w-8 p-0 bg-gray-600 border-gray-500 text-white"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-white min-w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="h-8 w-8 p-0 bg-gray-600 border-gray-500 text-white"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                    className="h-8 w-8 p-0 bg-gray-600 border-gray-500 text-white ml-2"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetControls}
                    className="h-8 bg-gray-600 border-gray-500 text-white text-xs"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Image Preview */}
              <div className="flex-1 overflow-auto bg-black rounded-lg flex items-center justify-center p-4">
                {documentPreview && (
                  <img
                    src={documentPreview.url}
                    alt="ID Document"
                    className="max-w-full max-h-full object-contain transition-all duration-200"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                    onError={(e) => {
                      console.error("❌ Failed to load document image");
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rejection Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-600">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Rejection Reason
              </h3>
              <p className="text-gray-300 mb-4">
                Please provide a reason why this user ID verification is being rejected:
              </p>
              <textarea
                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-red-500"
                rows={4}
                placeholder="Enter rejection reason..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              ></textarea>
              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionModal(false)}
                  className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                  disabled={!!processingUser}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectUser}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 border-red-500"
                  disabled={!!processingUser || !rejectionNote.trim()}
                >
                  {processingUser ? "Processing..." : "Reject User ID"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}