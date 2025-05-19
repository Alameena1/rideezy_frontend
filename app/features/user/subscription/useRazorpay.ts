import { useState } from "react";
import { apiService } from "@/services/api";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface UseRazorpayProps {
  userId: string;
  onSuccess: (subscriptionResponse: any) => void;
  onError: (errorMessage: string) => void;
}

export const useRazorpay = ({ userId, onSuccess, onError }: UseRazorpayProps) => {
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

  const handleSubscribe = async (
    plan: { _id: string; name: string },
    user: { name?: string; email?: string }
  ) => {
    if (!userId) {
      onError("User ID is missing. Please log in again.");
      return;
    }

    setPaymentLoading(plan._id);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        onError("Failed to load Razorpay SDK. Please try again.");
        return;
      }

      const orderResponse = await apiService.subscription.createOrder(plan._id);
      const { id: orderId, amount, currency } = orderResponse.order;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_KOCURsj88Mu4Sj",
        amount: amount,
        currency: currency,
        name: "Your App Name",
        description: `Subscription to ${plan.name}`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyData = {
              userId,
              planId: plan._id,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            };
            const verifyResponse = await apiService.subscription.verifyAndSubscribe(verifyData);
            alert("Payment successful! Subscription activated.");
            const subscriptionResponse = await apiService.subscription.checkSubscription(userId);
            onSuccess(subscriptionResponse);
          } catch (err: any) {
            onError(err.response?.data?.message || "Payment verification failed. Please try again.");
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
      onError(err.response?.data?.message || "Failed to initiate payment. Please try again.");
    } finally {
      setPaymentLoading(null);
    }
  };

  return { handleSubscribe, paymentLoading };
};