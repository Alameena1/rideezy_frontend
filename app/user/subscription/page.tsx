"use client";

import { useState, useEffect } from "react";
import useAuth from "@/app/hooks/useAuth";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  AlertCircle, 
  Crown, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Star,
  Zap,
  Shield,
  Users,
  Car,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import MainLayout from "@/app/comp/MainLayout";
import Swal from "sweetalert2";
import { useRazorpay } from "../../features/user/subscription/useRazorpay";
import { useSubscriptionStore } from "../../stores/subscriptionStore"; 

// Define types
interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  description?: string;
  maxStartingRides?: number;
  maxJoiningRides?: number;
  popular?: boolean;
}

interface CurrentSubscription {
  plan: SubscriptionPlan;
  startDate: string;
  originalPrice: number;
  endDate: string;
}

export default function Subscriptions() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Use the subscription store for ALL data
  const { 
    plans, 
    isLoading, 
    error, 
    pagination,
    currentSubscription,
    fetchPlans,
    fetchCurrentSubscription
  } = useSubscriptionStore();

  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const userId = user?._id;

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const { handleSubscribe, paymentLoading } = useRazorpay({
    userId: userId || "",
    onSuccess: (subscriptionResponse: any) => {
      if (subscriptionResponse.isSubscribed && subscriptionResponse.subscription) {
        // Refresh the current subscription from the store
        if (userId) {
          fetchCurrentSubscription(userId);
        }
        Swal.fire({
          icon: "success",
          title: "Subscription Activated!",
          text: "Your subscription has been successfully activated.",
          confirmButtonColor: "#2563EB",
          timer: 3000,
          showConfirmButton: false
        });
      }
    },
    onError: (errorMessage) => {
      // Handle error through store if you have error state there
      console.error("Subscription error:", errorMessage);
    },
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  // Fetch plans when search or page changes
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !userId) return;

    fetchPlans(1, 3, debouncedSearch); // 9 plans per page for 3x3 grid
  }, [debouncedSearch, fetchPlans, authLoading, isAuthenticated, userId]);

  // Fetch current subscription
  useEffect(() => {
    if (userId) {
      fetchCurrentSubscription(userId);
    }
  }, [userId, fetchCurrentSubscription]);

  const handlePageChange = (page: number) => {
    fetchPlans(page, 3, debouncedSearch);
  };

  const handleSearch = (search: string) => {
    setLocalSearchTerm(search);
  };

  const onSubscribe = (plan: SubscriptionPlan) => {
    if (currentSubscription) {
      Swal.fire({
        icon: "warning",
        title: "Active Plan Detected",
        text: "You already have an active subscription. Please wait for it to expire before purchasing a new one.",
        confirmButtonColor: "#2563EB",
      });
      return;
    }
    handleSubscribe(plan, user || {});
  };

  const getDaysRemaining = (endDate: string) => {
    try {
      const end = new Date(endDate);
      const today = new Date();
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  };

  // Safe feature mapping with fallback
  const getPlanFeatures = (plan: SubscriptionPlan) => {
    if (!plan.features || !Array.isArray(plan.features)) {
      return [
        `${plan.maxStartingRides || 'Unlimited'} starting rides`,
        `${plan.maxJoiningRides || 'Unlimited'} joining rides`,
        `${plan.duration} days access`
      ];
    }
    return plan.features;
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

  if (authLoading) {
    return (
      <MainLayout activeItem="Subscriptions">
        <div className="mx-auto max-w-7xl p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeItem="Subscriptions">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Subscription Plans
          </h1>
          <p className="text-gray-600 text-lg">
            Choose the perfect plan for your ride-sharing needs
          </p>
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

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="plans" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              Available Plans
            </TabsTrigger>
            <TabsTrigger 
              value="current" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
            >
              My Subscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            {/* Search Bar */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search plans by name, description, or features..."
                      value={localSearchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 bg-white border-gray-200 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Results Count */}
                  <div className="text-sm text-gray-600 whitespace-nowrap">
                    Showing {plans.length} of {pagination.totalCount} plans
                    {debouncedSearch && ` for "${debouncedSearch}"`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-2 border-gray-200">
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Current Plan Banner */}
                {currentSubscription && (
                  <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                            <Crown className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-green-900">
                              Active: {currentSubscription.plan.name}
                            </h3>
                            <p className="text-green-700 text-sm">
                              Expires in {getDaysRemaining(currentSubscription.endDate)} days
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-500 text-white">
                          Active
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans && plans.length > 0 ? (
                    plans.map((plan, index) => {
                      const isPopular = plan.popular || index === 1; // Middle card is popular by default
                      const isCurrentPlan = currentSubscription?.plan._id === plan._id;
                      const features = getPlanFeatures(plan);
                      
                      return (
                        <Card 
                          key={plan._id} 
                          className={`relative border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                            isPopular 
                              ? 'border-blue-500 shadow-lg' 
                              : isCurrentPlan
                              ? 'border-green-500'
                              : 'border-gray-200'
                          }`}
                        >
                          {isPopular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-blue-500 text-white px-4 py-1 rounded-full">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Most Popular
                              </Badge>
                            </div>
                          )}
                          
                          {isCurrentPlan && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-green-500 text-white px-4 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Current Plan
                              </Badge>
                            </div>
                          )}

                          <CardHeader className="text-center pb-4">
                            <CardTitle className="flex items-center justify-center gap-2 text-xl font-bold">
                              <Crown className={`h-5 w-5 ${
                                isPopular ? 'text-blue-500' : 'text-gray-400'
                              }`} />
                              {plan.name || "Unnamed Plan"}
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                              {plan.description || `Perfect for ${plan.name?.toLowerCase() || 'regular'} users`}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            {/* Price */}
                            <div className="text-center">
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-3xl font-bold text-gray-900">
                                  ₹{plan.price || 0}
                                </span>
                                <span className="text-gray-600 text-sm">
                                  / {plan.duration || 30} days
                                </span>
                              </div>
                              <p className="text-gray-500 text-sm mt-1">
                                ₹{((plan.price || 0) / (plan.duration || 30)).toFixed(2)} per day
                              </p>
                            </div>

                            <Separator />

                            {/* Features */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-2">
                                  <Car className="h-4 w-4 text-blue-500" />
                                  Starting Rides
                                </span>
                                <span className="font-semibold">
                                  {plan.maxStartingRides || 'Unlimited'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-2">
                                  <Users className="h-4 w-4 text-green-500" />
                                  Joining Rides
                                </span>
                                <span className="font-semibold">
                                  {plan.maxJoiningRides || 'Unlimited'}
                                </span>
                              </div>
                              {features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  <span className="text-gray-700">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>

                          <CardFooter>
                            <Button
                              onClick={() => onSubscribe(plan)}
                              disabled={paymentLoading || isCurrentPlan}
                              className={`w-full py-3 font-semibold ${
                                isPopular
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : isCurrentPlan
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'bg-gray-900 hover:bg-gray-800'
                              }`}
                              size="lg"
                            >
                              {paymentLoading ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : isCurrentPlan ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Current Plan
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Get Started
                                </>
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })
                  ) : (
                    // Empty state when no plans are available
                    <div className="col-span-3 text-center py-12">
                      <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No Subscription Plans Found
                      </h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        {debouncedSearch 
                          ? `No plans match your search "${debouncedSearch}". Try different keywords.`
                          : "There are currently no subscription plans available. Please check back later or contact support."
                        }
                      </p>
                      {debouncedSearch && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => handleSearch("")}
                        >
                          Clear Search
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Page {pagination.currentPage} of {pagination.totalPages}
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
            )}
          </TabsContent>

          <TabsContent value="current" className="space-y-6">
            {isLoading ? (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ) : currentSubscription ? (
              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Crown className="h-6 w-6 text-green-600" />
                    Your Active Subscription
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    You're all set! Enjoy premium features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Plan Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Plan Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plan Name:</span>
                          <span className="font-semibold">{currentSubscription.plan.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-semibold">₹{currentSubscription.originalPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-semibold">{currentSubscription.plan.duration} days</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        Subscription Period
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Start Date:</span>
                          <span className="font-semibold">
                            {new Date(currentSubscription.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">End Date:</span>
                          <span className="font-semibold">
                            {new Date(currentSubscription.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days Remaining:</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {getDaysRemaining(currentSubscription.endDate)} days
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Plan Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {getPlanFeatures(currentSubscription.plan).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-gray-200 text-center py-12">
                <CardContent className="space-y-4">
                  <Crown className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900">No Active Subscription</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    You don't have an active subscription. Choose a plan above to unlock premium features and enhance your ride-sharing experience.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}