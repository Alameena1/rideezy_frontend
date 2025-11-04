// Subscription.tsx - UPDATED to match User Management style
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, 
  DollarSign, 
  Car, 
  Users, 
  FileText, 
  Crown,
  Search,
  Filter,
  ArrowUpDown,
  Plus
} from "lucide-react";
import Swal from 'sweetalert2';

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  maxStartingRides: number;
  maxJoiningRides: number;
  status: "Active" | "Blocked";
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

export default function Subscription() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(5);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [currentPlan, setCurrentPlan] = useState<Partial<SubscriptionPlan>>({
    name: "",
    durationMonths: 1,
    price: 0,
    description: "",
    maxStartingRides: 10,
    maxJoiningRides: 20,
    status: "Active"
  });
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchSubscriptions = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter as "Active" | "Blocked" : undefined,
        sortBy,
        sortOrder,
      };

      const response = await apiService.subscription.getSubscriptionPlans(params);

      if (response && response.data && Array.isArray(response.data)) {
        setSubscriptions(response.data);
        setPagination(response.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: response.data.length,
          hasNext: false,
          hasPrev: page > 1,
        });
      } else {
        setError("Invalid response format from server");
        setSubscriptions([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch subscriptions";
      setError(errorMessage);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions(currentPage);
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

  const openAddModal = () => {
    setModalMode("add");
    setCurrentPlan({
      name: "",
      durationMonths: 1,
      price: 0,
      description: "",
      maxStartingRides: 10,
      maxJoiningRides: 20,
      status: "Active"
    });
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setModalMode("edit");
    setCurrentPlan({ ...plan });
    setModalError(null);
    setShowModal(true);
  };

  const calculateMonthlyPrice = () => {
    if (currentPlan.price && currentPlan.durationMonths) {
      return (currentPlan.price / currentPlan.durationMonths).toFixed(2);
    }
    return "0.00";
  };

  const validateForm = () => {
    if (!currentPlan.name?.trim()) {
      return "Plan name is required";
    }
    if (!currentPlan.durationMonths || currentPlan.durationMonths <= 0) {
      return "Duration must be at least 1 month";
    }
    if (!currentPlan.price || currentPlan.price < 0) {
      return "Price must be a non-negative number";
    }
    if (currentPlan.name.length > 10) {
      return "Plan name must be lessthan 10";
    }
    if (!currentPlan.maxStartingRides || currentPlan.maxStartingRides < 0) {
      return "Max starting rides must be a non-negative number";
    }
    if (!currentPlan.maxJoiningRides || currentPlan.maxJoiningRides < 0) {
      return "Max joining rides must be a non-negative number";
    }
    if (!currentPlan.description?.trim()) {
      return "Description is required";
    }
    return null;
  };

  const handleSavePlan = async () => {
    const validationError = validateForm();
    if (validationError) {
      setModalError(validationError);
      return;
    }

    try {
      if (modalMode === "add") {
        const createdPlan = await apiService.subscription.createSubscriptionPlan(currentPlan);
        setSubscriptions(prev => [createdPlan, ...prev]);
        Swal.fire({
          title: 'Success!',
          text: 'Subscription plan created successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const updatedPlan = await apiService.subscription.updateSubscriptionPlan(currentPlan._id!, currentPlan);
        setSubscriptions(prev => prev.map((plan) =>
          plan._id === currentPlan._id ? updatedPlan : plan
        ));
        Swal.fire({
          title: 'Success!',
          text: 'Subscription plan updated successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
      setShowModal(false);
      setModalError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${modalMode === "add" ? "add" : "update"} subscription plan`;
      setModalError(errorMessage);
      Swal.fire('Error!', errorMessage, 'error');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      await apiService.subscription.deleteSubscriptionPlan(planId);
      setSubscriptions(prev => prev.filter((plan) => plan._id !== planId));
      Swal.fire('Deleted!', 'The subscription plan has been deleted.', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete subscription plan";
      setError(errorMessage);
      Swal.fire('Error!', errorMessage, 'error');
    }
  };

  const handleToggleStatus = async (planId: string, currentStatus: "Active" | "Blocked") => {
    const newStatus = currentStatus === "Active" ? "Blocked" : "Active";

    try {
      await apiService.subscription.toggleSubscriptionPlanStatus(planId, newStatus);
      setSubscriptions(prev => prev.map((plan) =>
        plan._id === planId ? { ...plan, status: newStatus } : plan
      ));
      Swal.fire('Success!', `Subscription plan ${newStatus.toLowerCase()} successfully.`, 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update subscription plan status";
      setError(errorMessage);
      Swal.fire('Error!', errorMessage, 'error');
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">Active</Badge>;
      case "Blocked":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500">Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
          <span>Plan Name</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (name: string, row: SubscriptionPlan) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Crown className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <span className="font-medium text-white block">{name}</span>
            <span className="text-xs text-gray-400">{row.durationMonths} months</span>
          </div>
        </div>
      )
    },
    {
      key: "price",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("price")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300"
        >
          <span>Price</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (price: number, row: SubscriptionPlan) => (
        <div>
          <div className="font-semibold text-white">{price.toFixed(2)}</div>
          <div className="text-xs text-gray-400">
            ${(price / row.durationMonths).toFixed(2)}/mo
          </div>
        </div>
      )
    },
    {
      key: "limits",
      header: "Ride Limits",
      render: (_: any, row: SubscriptionPlan) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-gray-300">
            <Car className="h-3 w-3 text-blue-400" />
            <span>Start: {row.maxStartingRides}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-300">
            <Users className="h-3 w-3 text-green-400" />
            <span>Join: {row.maxJoiningRides}</span>
          </div>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (status: string) => renderStatus(status)
    },
    {
      key: "createdAt",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("createdAt")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300"
        >
          <span>Created</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (createdAt: string) => (
        <div className="text-sm">
          <div className="text-gray-300">{new Date(createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-gray-400">
            {new Date(createdAt).toLocaleTimeString()}
          </div>
        </div>
      )
    },
  ];

  const renderActions = (plan: SubscriptionPlan) => (
    <div className="flex space-x-2">
      <Button
        onClick={() => handleToggleStatus(plan._id, plan.status)}
        variant={plan.status === "Active" ? "outline" : "default"}
        size="sm"
        className={plan.status === "Active" ? 
          "border-red-500 text-red-400 hover:bg-red-500/20 hover:text-red-300" : 
          "bg-green-600 hover:bg-green-700"
        }
      >
        {plan.status === "Active" ? "Block" : "Activate"}
      </Button>
      <Button
        onClick={() => openEditModal(plan)}
        variant="outline"
        size="sm"
        className="border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
      >
        Edit
      </Button>
      <Button
        onClick={() => handleDeletePlan(plan._id)}
        variant="destructive"
        size="sm"
        className="bg-red-600 hover:bg-red-700 border-red-500"
      >
        Delete
      </Button>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="container mx-auto">
        {/* Header Section - Matching User Management */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Subscription Management</h1>
            <p className="text-gray-400">Manage subscription plans and pricing</p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-blue-600 text-white hover:bg-blue-700 border-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Plan
          </Button>
        </div>

        {/* Enhanced Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name or description..."
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
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

<DataTable
  columns={columns}
  data={subscriptions}
  loading={loading}
  error={error}
  emptyMessage="No subscription plans found."
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

        {/* Enhanced Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                {modalMode === "add" ? "Create New Subscription Plan" : "Edit Subscription Plan"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {modalMode === "add" 
                  ? "Create a new subscription plan with custom features and pricing" 
                  : "Update the existing subscription plan details"
                }
              </DialogDescription>
            </DialogHeader>

            {modalError && (
              <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800">
                {modalError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Plan Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Premium Annual Plan"
                    value={currentPlan.name}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Duration (Months)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="36"
                      value={currentPlan.durationMonths || ""}
                      onChange={(e) => setCurrentPlan({ ...currentPlan, durationMonths: Number(e.target.value) })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-white flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Total Price 
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentPlan.price || ""}
                      onChange={(e) => setCurrentPlan({ ...currentPlan, price: Number(e.target.value) })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startingRides" className="text-white flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Max Starting Rides
                    </Label>
                    <Input
                      id="startingRides"
                      type="number"
                      min="0"
                      value={currentPlan.maxStartingRides || ""}
                      onChange={(e) => setCurrentPlan({ ...currentPlan, maxStartingRides: Number(e.target.value) })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="joiningRides" className="text-white flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Max Joining Rides
                    </Label>
                    <Input
                      id="joiningRides"
                      type="number"
                      min="0"
                      value={currentPlan.maxJoiningRides || ""}
                      onChange={(e) => setCurrentPlan({ ...currentPlan, maxJoiningRides: Number(e.target.value) })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the benefits and features of this plan..."
                    rows={4}
                    value={currentPlan.description}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, description: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white resize-none placeholder-gray-400"
                  />
                </div>

                {modalMode === "edit" && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={currentPlan.status === "Active"}
                      onCheckedChange={(checked) => 
                        setCurrentPlan({ ...currentPlan, status: checked ? "Active" : "Blocked" })
                      }
                    />
                    <Label className="text-white">Active Plan</Label>
                  </div>
                )}
              </div>

              {/* Right Column - Preview */}
              <div className="space-y-4">
                <Label className="text-white">Plan Preview</Label>
                <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>{currentPlan.name || "Your Plan Name"}</span>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500">
                        {currentPlan.durationMonths || 1} {currentPlan.durationMonths === 1 ? 'Month' : 'Months'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {currentPlan.description || "Plan description will appear here"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-2xl font-bold text-white">
                      {currentPlan.price?.toFixed(2) || "0.00"}
                      <span className="text-sm font-normal text-gray-400">
                        {calculateMonthlyPrice()}/mo
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Car className="h-4 w-4 text-blue-400" />
                          Starting Rides
                        </div>
                        <div className="text-white font-semibold">
                          {currentPlan.maxStartingRides || 0}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Users className="h-4 w-4 text-green-400" />
                          Joining Rides
                        </div>
                        <div className="text-white font-semibold">
                          {currentPlan.maxJoiningRides || 0}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-600/50">
                      <div className="text-xs text-gray-400">
                        Created just now • {currentPlan.status || "Active"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePlan}
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-500"
              >
                <Crown className="h-4 w-4 mr-2" />
                {modalMode === "add" ? "Create Plan" : "Update Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}