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
import CurrentPlanCard from "../../features/user/subscription/CurrentPlanCard";
import AvailablePlansSection from "../../features/user/subscription/AvailablePlansSection";
import { useRazorpay } from "../../features/user/subscription/useRazorpay";

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

interface CurrentSubscription {
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
}

export default function Subscriptions() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?._id;

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const { handleSubscribe, paymentLoading } = useRazorpay({
    userId: userId || "",
    onSuccess: (subscriptionResponse) => {
      if (subscriptionResponse.isSubscribed) {
        setCurrentSubscription(subscriptionResponse.subscription);
      }
    },
    onError: (errorMessage) => setError(errorMessage),
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setError("Please log in to view subscription plans.");
      return;
    }
    if (!userId) {
      setError("User ID is missing. Please log in again.");
      return;
    }

    const fetchPlansAndSubscription = async () => {
      setIsLoading(true);
      try {
        const plansResponse = await apiService.subscription.getSubscriptionPlans();
        setAvailablePlans(plansResponse.data || []);

        const subscriptionResponse = await apiService.subscription.checkSubscription(userId);
        if (subscriptionResponse.isSubscribed) {
          setCurrentSubscription(subscriptionResponse.subscription);
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.response?.data?.message || "Failed to load subscription data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlansAndSubscription();
  }, [userId, authLoading, isAuthenticated]);

  const onSubscribe = (plan: SubscriptionPlan) => {
    if (currentSubscription) {
      Swal.fire({
        icon: "warning",
        title: "Active Plan Detected",
        text: "You already have an active plan.",
        confirmButtonColor: "#2563EB",
      });
      return;
    }
    handleSubscribe(plan, user || {});
  };

  if (authLoading) {
    return (
      <MainLayout activeItem="Subscriptions">
        <div className="mx-auto max-w-5xl p-6">
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeItem="Subscriptions">
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-gray-800">Subscriptions</CardTitle>
                <CardDescription className="text-gray-500 text-sm mt-1">{currentDate}</CardDescription>
              </div>
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
                <Skeleton className="h-60 w-full rounded-lg" />
              </div>
            ) : (
              <>
                <CurrentPlanCard currentSubscription={currentSubscription} />
                <AvailablePlansSection
                  availablePlans={availablePlans}
                  paymentLoading={paymentLoading}
                  onSubscribe={onSubscribe}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}