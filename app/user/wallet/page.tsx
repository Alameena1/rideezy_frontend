"use client";

import { useState, useEffect } from "react";
import useAuth from "@/app/hooks/useAuth";
import { clientApiService, useApiInterceptors } from "@/services/client/client-api";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  AlertCircle, 
  Wallet as WalletIcon,
  Plus,
  ArrowUpDown,
  Calendar,
  TrendingUp,
  Download,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import MainLayout from "@/app/comp/MainLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useWalletPayment } from "@/app/features/user/wallet/useWalletPayment";

interface WalletResponse {
  success: boolean;
  balance: number;
  transactions: {
    transactionId: string;
    amount: number;
    type: "DEPOSIT" | "WITHDRAWAL" | "SUBSCRIPTION" | "REFUND";
    createdAt: string;
    description?: string;
  }[];
  total: number;
  totalPages: number;
  currentPage: number;
}

interface Wallet {
  balance: number;
  currency: string;
  transactions: {
    transactionId: string;
    amount: number;
    type: "DEPOSIT" | "WITHDRAWAL" | "SUBSCRIPTION" | "REFUND";
    createdAt: string;
    description?: string;
  }[];
  total: number;
  totalPages: number;
  currentPage: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function Wallet() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet>({
    balance: 0,
    currency: "INR",
    transactions: [],
    total: 0,
    totalPages: 1,
    currentPage: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  
  // Pagination and Search states
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("all");

  const userId = user?._id;

  useApiInterceptors();

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setError("Please log in to view your wallet.");
      return;
    }
    if (!userId) {
      setError("User ID is missing. Please log in again.");
      return;
    }

    fetchWalletData(1, itemsPerPage, debouncedSearch, transactionTypeFilter);
  }, [userId, authLoading, isAuthenticated, debouncedSearch, itemsPerPage, transactionTypeFilter]);

  const fetchWalletData = async (page: number = 1, limit: number = itemsPerPage, search: string = "", filter: string = "all") => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await clientApiService.wallet.getWallet(userId, page, limit, search, filter);

      if (response.success) {
        setWallet({
          balance: response.balance || 0,
          currency: "INR",
          transactions: response.transactions || [],
          total: response.total || 0,
          totalPages: response.totalPages || 1,
          currentPage: response.currentPage || 1,
        });
        
        setPagination({
          currentPage: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          totalCount: response.total || 0,
          hasNextPage: response.currentPage < response.totalPages,
          hasPrevPage: response.currentPage > 1,
        });
      } else {
        setError("Failed to load wallet data. Please try again.");
      }
    } catch (err: any) {
      console.error("Error fetching wallet:", err);
      setError(err.response?.data?.message || "Failed to load wallet data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const { handlePayment, paymentLoading } = useWalletPayment({
    userId: userId || undefined,
    onSuccess: (walletResponse: WalletResponse) => {
      // Refresh wallet data after successful payment
      fetchWalletData(pagination.currentPage, itemsPerPage, debouncedSearch, transactionTypeFilter);
      setError(null);
      setIsModalOpen(false);
      setAmount(0);
    },
    onError: (errorMessage) => setError(errorMessage),
  });

  const handleAddFunds = () => {
    if (amount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    handlePayment({
      userId,
      amount,
      currency: "INR",
      user: user ? { name: user.name || "Guest User", email: user.email || "guest@example.com" } : undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchWalletData(newPage, itemsPerPage, debouncedSearch, transactionTypeFilter);
    }
  };

  const handleSearch = (search: string) => {
    setLocalSearchTerm(search);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    fetchWalletData(1, newItemsPerPage, debouncedSearch, transactionTypeFilter);
  };

  const handleFilterChange = (filter: string) => {
    setTransactionTypeFilter(filter);
    fetchWalletData(1, itemsPerPage, debouncedSearch, filter);
  };

  const clearFilters = () => {
    setLocalSearchTerm("");
    setTransactionTypeFilter("all");
    fetchWalletData(1, itemsPerPage, "", "all");
  };

  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];
    const { currentPage, totalPages } = pagination;
    
    if (totalPages <= 1) return [1];
    
    // Always show first page
    buttons.push(1);
    
    // Show pages around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis if needed
    if (startPage > 2) {
      buttons.push('...');
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        buttons.push(i);
      }
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      buttons.push('...');
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      buttons.push(totalPages);
    }
    
    return buttons;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "WITHDRAWAL":
        return <Download className="h-4 w-4 text-red-500" />;
      case "SUBSCRIPTION":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case "REFUND":
        return <ArrowUpDown className="h-4 w-4 text-orange-500" />;
      default:
        return <ArrowUpDown className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    return type === "DEPOSIT" || type === "REFUND" ? "text-green-600" : "text-red-600";
  };

  const getTransactionBadge = (type: string) => {
    const baseClasses = "text-xs font-medium";
    switch (type) {
      case "DEPOSIT":
        return <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-200`}>Deposit</Badge>;
      case "WITHDRAWAL":
        return <Badge className={`${baseClasses} bg-red-100 text-red-800 border-red-200`}>Withdrawal</Badge>;
      case "SUBSCRIPTION":
        return <Badge className={`${baseClasses} bg-blue-100 text-blue-800 border-blue-200`}>Subscription</Badge>;
      case "REFUND":
        return <Badge className={`${baseClasses} bg-orange-100 text-orange-800 border-orange-200`}>Refund</Badge>;
      default:
        return <Badge variant="outline" className={baseClasses}>{type}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <MainLayout activeItem="Wallet">
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeItem="Wallet">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Wallet
          </h1>
          <p className="text-gray-600 text-lg">Manage your funds and track transactions</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Controls */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={localSearchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-blue-500"
                />
              </div>

              {/* Filter and Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                {/* Transaction Type Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={transactionTypeFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Transactions</option>
                    <option value="DEPOSIT">Deposits</option>
                    <option value="WITHDRAWAL">Withdrawals</option>
                    <option value="SUBSCRIPTION">Subscriptions</option>
                    <option value="REFUND">Refunds</option>
                  </select>
                </div>

                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 whitespace-nowrap">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>

                {/* Clear Filters */}
                {(localSearchTerm || transactionTypeFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {wallet.transactions.length} of {pagination.totalCount} transactions
              {debouncedSearch && ` for "${debouncedSearch}"`}
              {transactionTypeFilter !== "all" && ` • Filtered by: ${transactionTypeFilter.toLowerCase()}`}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Current Balance</p>
                  <p className="text-4xl font-bold mt-2">
                    ₹{(wallet.balance ?? 0).toFixed(2)}
                  </p>
                  <p className="text-blue-100 text-sm mt-2">Available for rides and subscriptions</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <WalletIcon className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <Button
                onClick={() => setIsModalOpen(true)}
                className="w-full mt-6 bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Funds
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Wallet Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Transactions</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {pagination.totalCount || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Page</span>
                  <Badge variant="outline" className="bg-gray-100">
                    {pagination.currentPage} of {pagination.totalPages}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Currency</span>
                  <Badge variant="outline" className="bg-gray-100">
                    {wallet.currency}
                  </Badge>
                </div>
                <Separator />
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(pagination.currentPage * itemsPerPage, pagination.totalCount)} of{" "}
                    {pagination.totalCount} transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ArrowUpDown className="h-5 w-5 text-blue-600" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Your wallet transactions and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : wallet.transactions?.length > 0 ? (
              <>
                <div className="space-y-4">
                  {wallet.transactions.map((transaction) => (
                    <div
                      key={transaction.transactionId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 capitalize">
                              {transaction.type.toLowerCase()}
                            </p>
                            {getTransactionBadge(transaction.type)}
                          </div>
                          <p className="text-sm text-gray-500">
                            {transaction.description || 
                              `Transaction on ${new Date(transaction.createdAt).toLocaleDateString()}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            ID: {transaction.transactionId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === "DEPOSIT" || transaction.type === "REFUND" ? "+" : "-"}
                          ₹{transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Card className="mt-6 border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-600">
                          Page {pagination.currentPage} of {pagination.totalPages} • 
                          Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to{" "}
                          {Math.min(pagination.currentPage * itemsPerPage, pagination.totalCount)} of{" "}
                          {pagination.totalCount} transactions
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevPage}
                            className="flex items-center gap-1"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {generatePaginationButtons().map((page, index) => (
                              page === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                                  ...
                                </span>
                              ) : (
                                <Button
                                  key={page}
                                  variant={pagination.currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(page as number)}
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              )
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={!pagination.hasNextPage}
                            className="flex items-center gap-1"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <WalletIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {debouncedSearch || transactionTypeFilter !== "all" ? "No Transactions Found" : "No Transactions Yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {debouncedSearch || transactionTypeFilter !== "all" 
                    ? "No transactions match your search criteria. Try different filters."
                    : "Start by adding funds to your wallet"
                  }
                </p>
                {(debouncedSearch || transactionTypeFilter !== "all") ? (
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Funds
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Funds Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Add Funds to Wallet
              </DialogTitle>
              <DialogDescription>
                Enter the amount you want to add to your wallet balance.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount (₹)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="text-lg font-medium"
                  min="1"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500">
                  Minimum amount: ₹1
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFunds}
                disabled={paymentLoading || amount <= 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {paymentLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add ₹{amount || 0}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}