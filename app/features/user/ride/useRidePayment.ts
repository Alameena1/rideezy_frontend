"use client";

import { useState } from "react";
import { clientApiService } from "@/services/client/client-api";

interface Ride {
  rideId: string;
  // Add other relevant fields if needed
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface UseRidePaymentProps {
  userId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupPlaceName?: string;
  dropoffPlaceName?: string;
  onSuccess: (ride: Ride) => void;
  onError: (errorMessage: string) => void;
}

export const useRidePayment = ({
  userId,
  pickupLocation,
  dropoffLocation,
  pickupPlaceName,
  dropoffPlaceName,
  onSuccess,
  onError,
}: UseRidePaymentProps) => {
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if Razorpay is already loaded
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRidePayment = async (ride: Ride, user: { name?: string; email?: string; _id?: string }) => {
    console.log("[useRidePayment] Starting payment process for ride:", ride.rideId);
    console.log("[useRidePayment] User data:", { userId, user });

    if (!userId) {
      onError("User ID is missing. Please log in again.");
      return;
    }

    if (!ride.rideId) {
      onError("Ride ID is missing. Please select a valid ride.");
      return;
    }

    setPaymentLoading(ride.rideId);
    
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        onError("Failed to load Razorpay SDK. Please try again.");
        return;
      }

      console.log("[useRidePayment] Creating payment order for ride:", ride.rideId);
      
      // Create payment order
      const orderResponse = await clientApiService.ride.createRidePaymentOrder(ride.rideId);
      console.log("[useRidePayment] Order response:", orderResponse);

      // Handle different response formats
      let orderData;
      
      if (orderResponse.order) {
        // Direct order object
        orderData = orderResponse.order;
      } else if (orderResponse.data && orderResponse.data.order) {
        // Nested in data property
        orderData = orderResponse.data.order;
      } else if (orderResponse.data) {
        // Data is the order itself
        orderData = orderResponse.data;
      } else {
        // Response might be the order directly
        orderData = orderResponse;
      }

      console.log("[useRidePayment] Extracted order data:", orderData);

      // Validate order data
      if (!orderData || !orderData.id || !orderData.amount) {
        console.error("[useRidePayment] Invalid order data:", orderData);
        onError("Invalid payment order received. Please try again.");
        return;
      }

      const { id: orderId, amount, currency = "INR" } = orderData;

      console.log("[useRidePayment] Payment order details:", { orderId, amount, currency });

      // Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_KOCURsj88Mu4Sj",
        amount: amount,
        currency: currency,
        name: "Ride Sharing App",
        description: `Payment for Ride ${ride.rideId}`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          console.log("[useRidePayment] Payment successful, verifying:", response);
          try {
            const verifyData = {
              rideId: ride.rideId,
              pickupLocation,
              dropoffLocation,
              pickupPlaceName: pickupPlaceName || "",
              dropoffPlaceName: dropoffPlaceName || "",
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            };
            
            console.log("[useRidePayment] Verifying payment with data:", verifyData);
            
            const verifyResponse = await clientApiService.ride.verifyAndJoinRide(verifyData);
            console.log("[useRidePayment] Verification response:", verifyResponse);

            // Handle different response formats for success
            let successData;
            if (verifyResponse.data) {
              successData = verifyResponse.data;
            } else if (verifyResponse.ride) {
              successData = verifyResponse.ride;
            } else {
              successData = verifyResponse;
            }

            console.log("[useRidePayment] Payment successful! Ride joined:", successData);
            onSuccess(successData);
          } catch (err: any) {
            console.error("[useRidePayment] Payment verification failed:", err);
            const errorMessage = err.response?.data?.message || err.message || "Payment verification failed. Please contact support.";
            onError(errorMessage);
          }
        },
        prefill: {
          name: user?.name || "Passenger",
          email: user?.email || "",
          
        },
        theme: {
          color: "#2563EB",
        },
        modal: {
          ondismiss: () => {
            console.log("[useRidePayment] Payment modal dismissed");
            setPaymentLoading(null);
          },
        },
      };

      // Initialize Razorpay
      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on("payment.failed", (response: any) => {
        console.error("[useRidePayment] Payment failed:", response);
        const errorDescription = response.error?.description || "Payment failed. Please try again.";
        onError(`Payment failed: ${errorDescription}`);
        setPaymentLoading(null);
      });

      // Open payment modal
      razorpay.open();
      
    } catch (err: any) {
      console.error("[useRidePayment] Payment initiation failed:", err);
      
      let errorMessage = "Failed to initiate payment. Please try again.";
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.code === "NETWORK_ERROR") {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      onError(errorMessage);
      setPaymentLoading(null);
    }
  };

  return { handleRidePayment, paymentLoading };
};