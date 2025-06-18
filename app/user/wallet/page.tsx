"use client";

import { useState, useEffect } from "react";
import useAuth from "@/app/hooks/useAuth";
import { apiService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import MainLayout from "@/app/comp/MainLayout";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
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
import { useRazorpay } from "@/app/features/user/subscription/useRazorpay";

interface Wallet {
  balance: number;
  currency: string;
  transactions: { id: string; amount: number; type: string; date: string }[];
}

export default function Wallet() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const userId = user?._id;

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const { handlePayment, paymentLoading } = useRazorpay({
    userId: userId || "",
    onSuccess: (paymentResponse) => {
      setWallet((prev) => prev ? { ...prev, balance: prev.balance + amount } : null);
      setIsModalOpen(false);
      Swal.fire("Success!", "Funds added to wallet successfully.", "success");
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
      try {
        const response = await apiService.wallet.getWallet(userId);
        setWallet(response.data);
      } catch (err: any) {
        console.error("Error fetching wallet:", err);
        setError(err.response?.data?.message || "Failed to load wallet data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWallet();
  }, [userId, authLoading, isAuthenticated]);

  const handleAddFunds = () => {
    if (amount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    handlePayment({ amount, currency: "INR" }, user || {});
  };

  if (authLoading) {
    return (
      <MainLayout activeItem="Wallet">
        <div className="mx-auto max-w-5xl p-6">
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeItem="Wallet">
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-gray-800">Wallet</CardTitle>
                <CardDescription className="text-gray-500 text-sm mt-1">{currentDate}</CardDescription>
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Add Funds
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : wallet ? (
              <>
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                  <h3 className="text-xl font-semibold text-gray-700">Current Balance</h3>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">
                    {wallet.balance} {wallet.currency}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-700">Transaction History</h3>
                  {wallet.transactions.length > 0 ? (
                    <ul className="mt-4 space-y-4">
                      {wallet.transactions.map((transaction) => (
                        <li
                          key={transaction.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                        >
                          <span className="text-gray-600">
                            {transaction.type} - {new Date(transaction.date).toLocaleDateString()}
                          </span>
                          <span
                            className={`font-medium ${
                              transaction.type === "Credit" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {transaction.type === "Credit" ? "+" : "-"}{transaction.amount} {wallet.currency}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 mt-4">No transactions yet.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-gray-500">No wallet data available.</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-white rounded-lg shadow-xl p-6 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-800">Add Funds to Wallet</DialogTitle>
              <DialogDescription className="text-gray-500 mt-2">
                Enter the amount you wish to add to your wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right text-gray-700">
                  Amount (INR)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="col-span-3 bg-gray-50 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  min="1"
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="mr-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFunds}
                disabled={paymentLoading || amount <= 0}
                className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
              >
                {paymentLoading ? "Processing..." : "Add Funds"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}