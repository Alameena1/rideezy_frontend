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
import { 
  AlertCircle, 
  Wallet as WalletIcon,
  Plus,
  ArrowUpDown,
  Calendar,
  TrendingUp,
  Download,
  CreditCard
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
import { Input } from "@/components/ui/input";
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
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 5;
  const userId = user?._id;

  useApiInterceptors();

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const { handlePayment, paymentLoading } = useWalletPayment({
    userId: userId || undefined,
    onSuccess: (walletResponse: WalletResponse) => {
      setWallet((prev) => ({
        balance: walletResponse.balance || prev.balance,
        currency: "INR",
        transactions: walletResponse.transactions || prev.transactions || [],
        total: walletResponse.total || prev.total,
        totalPages: walletResponse.totalPages || prev.totalPages,
        currentPage: walletResponse.currentPage || prev.currentPage,
      }));
      setError(null);
      setIsModalOpen(false);
      setAmount(0);
    },
    onError: (errorMessage) => setError(errorMessage),
  });

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

    const fetchWallet = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await clientApiService.wallet.getWallet(userId, currentPage, limit);

        if (response.success) {
          setWallet({
            balance: response.balance || 0,
            currency: "INR",
            transactions: response.transactions || [],
            total: response.total || 0,
            totalPages: response.totalPages || 1,
            currentPage: response.currentPage || 1,
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

    fetchWallet();
  }, [userId, authLoading, isAuthenticated, currentPage]);

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
    if (newPage >= 1 && newPage <= (wallet?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
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
      <div className="mx-auto max-w-4xl p-6 space-y-6">
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
                    {wallet.total || 0}
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
                  <p className="text-xs text-gray-500">Page {wallet.currentPage} of {wallet.totalPages}</p>
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
              Recent wallet transactions and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
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
                          <p className="font-medium text-gray-900 capitalize">
                            {transaction.type.toLowerCase()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {transaction.description || 
                              `Transaction on ${new Date(transaction.createdAt).toLocaleDateString()}`}
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
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {wallet.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, wallet.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            onClick={() => handlePageChange(page)}
                            className="w-10 h-10 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === wallet.totalPages}
                      className="flex items-center gap-2"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <WalletIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
                <p className="text-gray-600 mb-4">Start by adding funds to your wallet</p>
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Funds
                </Button>
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