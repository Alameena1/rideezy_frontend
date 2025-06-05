// features/user/ride/useRidePayment.ts
import { useState } from "react";
import { apiService } from "@/services/api";
import { Ride } from "@/services/api/rideApi";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface UseRidePaymentProps {
  userId: string;
  pickupLocation: string;
  dropoffLocation: string;
  onSuccess: (ride: Ride) => void;
  onError: (errorMessage: string) => void;
}

export const useRidePayment = ({
  userId,
  pickupLocation,
  dropoffLocation,
  onSuccess,
  onError,
}: UseRidePaymentProps) => {
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRidePayment = async (ride: Ride, user: { name?: string; email?: string }) => {
    if (!userId) {
      onError("User ID is missing. Please log in again.");
      return;
    }

    setPaymentLoading(ride.rideId);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        onError("Failed to load Razorpay SDK. Please try again.");
        return;
      }

      const orderResponse = await apiService.ride.createRidePaymentOrder(ride.rideId);
      const { id: orderId, amount, currency } = orderResponse.order;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_KOCURsj88Mu4Sj",
        amount: amount,
        currency: currency,
        name: "Ride Sharing App",
        description: `Payment for Ride ${ride.rideId}`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyData = {
              rideId: ride.rideId,
              pickupLocation,
              dropoffLocation,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            };
            const verifyResponse = await apiService.ride.verifyAndJoinRide(verifyData);
            alert("Payment successful! You have joined the ride.");
            onSuccess(verifyResponse);
          } catch (err: any) {
            onError(err.message || "Payment verification failed. Please try again.");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#2563EB",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.on("payment.failed", (response: any) => {
        onError(`Payment failed: ${response.error.description}`);
      });
      razorpay.open();
    } catch (err: any) {
      onError(err.message || "Failed to initiate payment. Please try again.");
    } finally {
      setPaymentLoading(null);
    }
  };

  return { handleRidePayment, paymentLoading };
};