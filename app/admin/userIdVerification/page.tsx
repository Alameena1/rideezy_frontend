// UserIdVerification.tsx - UPDATED with secure document preview
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
} from "lucide-react";
import Swal from 'sweetalert2';

interface User {
  _id: string;
  fullName: string;
  email: string;
  govId: {
    idNumber: string;
    documentUrl: string;
    verificationStatus: "Pending" | "Verified" | "Rejected";
    rejectionNote?: string;
  };
  createdAt: string;
  updatedAt?: string;
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

export default function UserIdVerification() {
  const [users, setUsers] = useState<User[]>([]);
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

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true);
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
        setUsers(response.data);
        setPagination(response.pagination);
      } else {
        console.error("Unexpected response format:", response);
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

  const handleApproveUser = async (userId: string) => {
    try {
      await apiService.user.verifyGovId(userId, "Verified");
      Swal.fire('Success!', 'User ID verified successfully.', 'success');
      fetchUsers(currentPage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve user ID";
      console.error("Approve user ID failed:", err);
      setError(errorMessage);
      Swal.fire('Error!', errorMessage, 'error');
    }
  };

  const openRejectionModal = (userId: string) => {
    setSelectedUser(userId);
    setRejectionNote("");
    setShowRejectionModal(true);
  };

  const handleRejectUser = async () => {
    if (!selectedUser || !rejectionNote.trim()) {
      setError("Rejection reason is required");
      Swal.fire('Error!', 'Please provide a rejection reason.', 'error');
      return;
    }

    try {
      await apiService.user.verifyGovId(selectedUser, "Rejected", rejectionNote);
      setShowRejectionModal(false);
      setSelectedUser(null);
      setRejectionNote("");
      Swal.fire('Success!', 'User ID rejected successfully.', 'success');
      fetchUsers(currentPage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject user ID";
      console.error("Reject user ID failed:", err);
      setError(errorMessage);
      Swal.fire('Error!', errorMessage, 'error');
    }
  };

  // Secure document preview handler
  const handleViewDocument = (user: User) => {
    if (!user.govId?.documentUrl) {
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
      const response = await fetch(documentPreview.url);
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
      
      Swal.fire('Success!', 'Document downloaded successfully.', 'success');
    } catch (error) {
      console.error('Download failed:', error);
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

  const renderStatus = (status: string) => {
    switch (status) {
      case "Verified":
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500">
            ✓ Verified
          </Badge>
        );
      case "Rejected":
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500">
            ✗ Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500">
            ⏳ Pending
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
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300"
        >
          <span>Name</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (fullName: string) => (
        <span className="font-medium text-white">{fullName}</span>
      )
    },
    { 
      key: "email", 
      header: "Email",
      render: (email: string) => (
        <span className="text-gray-300">{email}</span>
      )
    },
    { 
      key: "govId.idNumber", 
      header: "ID Number",
      render: (idNumber: string, user: User) => (
        <span className="font-mono text-blue-300">{user.govId?.idNumber || "N/A"}</span>
      )
    },
    { 
      key: "createdAt", 
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("createdAt")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300"
        >
          <span>Submitted On</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (createdAt: string) => createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"
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
          disabled={!user.govId?.documentUrl}
          className="bg-purple-600 text-white hover:bg-purple-700 border-purple-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:border-gray-600"
        >
          {user.govId?.documentUrl ? "View Document" : "No Document"}
        </Button>
      )
    },
  ];

  const renderActions = (user: User) => {
    const status = user.govId?.verificationStatus || "Pending";
    
    if (status === "Pending") {
      return (
        <div className="flex space-x-2">
          <Button
            onClick={() => handleApproveUser(user._id)}
            variant="default"
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700 border-green-500"
          >
            Approve
          </Button>
          <Button
            onClick={() => openRejectionModal(user._id)}
            variant="destructive"
            size="sm"
            className="bg-red-600 hover:bg-red-700 border-red-500"
          >
            Reject
          </Button>
        </div>
      );
    }
    
    return (
      <div className="text-sm text-gray-400 px-2">
        {status === "Verified" ? "Already Verified" : "Rejected"}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">User ID Verification Management</h1>
            <p className="text-gray-400">Verify and manage user government ID documents</p>
          </div>
          <div className="text-sm text-gray-400">
            Total: {pagination.totalItems} users
          </div>
        </div>

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


<DataTable
  columns={columns}
  data={users}
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
  onPageChange= {handlePageChange}
  keyField="_id"
/>

        {/* Secure Document Preview Dialog */}
        <Dialog open={!!documentPreview} onOpenChange={() => setDocumentPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-800 border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center justify-between">
                <div>
                  ID Document Preview - {documentPreview?.user.fullName}
                  <div className="text-sm text-gray-400 mt-1">
                    ID Number: {documentPreview?.user.idNumber}
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
              <h3 className="text-xl font-semibold text-white mb-4">Rejection Reason</h3>
              <p className="text-gray-300 mb-4">
                Please provide a reason why this user ID verification is being rejected:
              </p>
              <textarea
                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
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
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectUser}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 border-red-500"
                >
                  Reject User ID
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}