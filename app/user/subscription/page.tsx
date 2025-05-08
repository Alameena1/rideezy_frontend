"use client";

import { useState, useEffect } from "react";
import useAuth from "@/app/hooks/useAuth";
import { apiService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle } from "lucide-react";
import MainLayout from "@/app/comp/MainLayout";

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

interface Subscription {
  planId: string;
  startDate: string;
  endDate: string;
}

interface UserSubscription {
  isSubscribed: boolean;
  subscription?: Subscription;
  plan?: SubscriptionPlan;
}

export default function Subscriptions() {
  useAuth();
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Hardcoded userId for demo purposes (replace with actual userId from useAuth)
  const userId = "6800856c23f9fd6d2e27f6a6";

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Calculate days remaining for the subscription
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Fetch user subscription status and available plans on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch subscription status
        const subscriptionResponse = await apiService.get(`/subscriptions/check/${userId}`);
        const isSubscribed = subscriptionResponse.data.isSubscribed;

        let subscriptionData: UserSubscription = { isSubscribed };

        if (isSubscribed) {
          // Fetch user details to get subscription info
          const userResponse = await apiService.get(`/users/${userId}`);
          const user = userResponse.data;
          if (user.subscription) {
            // Fetch the plan details for the current subscription
            const planResponse = await apiService.get(`/subscriptions/plans/${user.subscription.planId}`);
            subscriptionData = {
              isSubscribed: true,
              subscription: user.subscription,
              plan: planResponse.data,
            };
          }
        }

        setUserSubscription(subscriptionData);

        // Fetch available plans
        const plansResponse = await apiService.get(`/subscriptions/plans`);
        setAvailablePlans(plansResponse.data.data);
      } catch (err) {
        console.error("Error fetching subscription data:", err);
        setError("Failed to load subscription data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle subscription with payment
  const handleSubscribe = async (planId: string) => {
    try {
      setMessage(null);
      setError(null);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Failed to load Razorpay checkout");
        return;
      }

      // Create a payment order
      const orderResponse = await apiService.post("/subscriptions/create-order", { planId });
      const { order } = orderResponse.data;

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "your-key-id",
        amount: order.amount,
        currency: order.currency,
        name: "Rideezy",
        description: `Subscription for plan ${planId}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            // Verify payment and subscribe
            const verifyResponse = await apiService.post("/subscriptions/verify-and-subscribe", {
              userId,
              planId,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });

            setMessage(verifyResponse.data.message);

            // Refresh subscription status after successful payment
            const subscriptionResponse = await apiService.get(`/subscriptions/check/${userId}`);
            const isSubscribed = subscriptionResponse.data.isSubscribed;
            let subscriptionData: UserSubscription = { isSubscribed };

            if (isSubscribed) {
              const userResponse = await apiService.get(`/users/${userId}`);
              const user = userResponse.data;
              if (user.subscription) {
                const planResponse = await apiService.get(`/subscriptions/plans/${user.subscription.planId}`);
                subscriptionData = {
                  isSubscribed: true,
                  subscription: user.subscription,
                  plan: planResponse.data,
                };
              }
            }

            setUserSubscription(subscriptionData);
          } catch (err: any) {
            setError(err.response?.data?.message || "Payment verification failed");
          }
        },
        prefill: {
          email: "user@example.com",
          contact: "7994549934",
        },
        theme: {
          color: "#3B82F6",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initiate payment");
    }
  };

  return (
    <MainLayout activeItem="Subscriptions">
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-gray-800">Your Subscription</CardTitle>
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
            {message && (
              <Alert variant="default" className="mb-6 bg-green-50 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-60 w-full rounded-lg" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Current Subscription Section */}
                <Card className={`p-6 shadow-md transition-all duration-300 ${userSubscription?.isSubscribed ? 'border-l-4 border-blue-500 bg-blue-50' : 'border-l-4 border-gray-300 bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Current Subscription</h3>
                    <Badge
                      variant={userSubscription?.isSubscribed ? "default" : "secondary"}
                      className={userSubscription?.isSubscribed ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}
                    >
                      {userSubscription?.isSubscribed ? "Active" : "Not Subscribed"}
                    </Badge>
                  </div>
                  {userSubscription?.isSubscribed && userSubscription.subscription && userSubscription.plan ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Plan:</span> {userSubscription.plan.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Price:</span> ₹{userSubscription.plan.price}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Description:</span> {userSubscription.plan.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Start Date:</span>{" "}
                          {new Date(userSubscription.subscription.startDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">End Date:</span>{" "}
                          {new Date(userSubscription.subscription.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-blue-600 font-medium">
                        {getDaysRemaining(userSubscription.subscription.endDate)} days remaining
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      You are not currently subscribed. Choose a plan below to enjoy unlimited rides!
                    </p>
                  )}
                </Card>

                {/* Available Plans Section */}
                <Card className="p-6 shadow-md bg-white">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">Available Plans</h3>
                  {availablePlans.length === 0 ? (
                    <p className="text-gray-600 text-sm">No subscription plans available.</p>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {availablePlans.map((plan) => (
                        <Card
                          key={plan._id}
                          className="p-5 border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300"
                        >
                          <CardContent className="p-0 space-y-3">
                            <h4 className="text-lg font-semibold text-gray-800">{plan.name}</h4>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Price:</span> ₹{plan.price}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Duration:</span> {plan.durationMonths} month(s)
                              </p>
                            </div>
                          </CardContent>
                          <CardFooter className="p-0 pt-4">
                            <Button
                              onClick={() => handleSubscribe(plan._id)}
                              className={`w-full ${userSubscription?.isSubscribed ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors duration-200`}
                              disabled={userSubscription?.isSubscribed}
                            >
                              {userSubscription?.isSubscribed ? "Subscribed" : "Subscribe Now"}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}