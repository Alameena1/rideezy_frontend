import { useState } from "react";
import Swal from "sweetalert2";
import { subscriptionApi } from "@/services/user/subscriptionApi";
import { walletApi } from "@/services/user/walletApi";

interface RazorpayOptions {
  userId: string;
  onSuccess: (response: any) => void;
  onError: (error: string) => void;
}

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

interface User {
  _id?: string;
  name?: string;
  email?: string;
}

// Function to load the Razorpay script dynamically
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay SDK loaded successfully");
      resolve(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const useRazorpay = ({ userId, onSuccess, onError }: RazorpayOptions) => {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script on component mount
  useState(() => {
    loadRazorpayScript().then((loaded) => {
      setRazorpayLoaded(loaded);
      if (!loaded) {
        console.error("Razorpay script failed to load");
      }
    });
  });

  const handleSubscribe = async (plan: SubscriptionPlan, user: User) => {
    if (!userId || !user) {
      onError("User information is missing. Please log in again.");
      return;
    }

    // Ensure Razorpay is loaded
    if (!razorpayLoaded) {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        onError("Failed to load payment processor. Please try again.");
        return;
      }
      setRazorpayLoaded(true);
    }

    // Fetch wallet balance
    let walletBalance = 0;
    try {
      const walletResponse = await walletApi.getWallet(userId);
      walletBalance = walletResponse.balance || 0;
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      onError("Failed to fetch wallet balance. Please try again.");
      return;
    }

    // Show SweetAlert with payment options
    Swal.fire({
      title: "Choose Payment Method",
      text: `Plan: ${plan.name} (₹${plan.price})`,
      icon: "question",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      showDenyButton: true,
      confirmButtonText: walletBalance >= plan.price ? "Pay with Wallet" : "Wallet (Insufficient Balance)",
      denyButtonText: "Pay with Razorpay",
      confirmButtonColor: walletBalance >= plan.price ? "#2563EB" : "#D1D5DB",
      denyButtonColor: "#2563EB",
      allowOutsideClick: false,
    }).then(async (result) => {
      if (result.isConfirmed && walletBalance >= plan.price) {
        // Wallet payment
        setPaymentLoading(true);
        try {
          const response = await subscriptionApi.subscribeWithWallet({ userId, planId: plan._id });
          if (response.success) {
            Swal.fire({
              icon: "success",
              title: "Subscription Successful",
              text: "You have successfully subscribed using your wallet!",
              confirmButtonColor: "#2563EB",
            });
            onSuccess(response);
          } else {
            throw new Error(response.message || "Failed to subscribe with wallet");
          }
        } catch (error: any) {
          Swal.fire({
            icon: "error",
            title: "Subscription Failed",
            text: error.message || "Failed to subscribe with wallet. Please try again.",
            confirmButtonColor: "#2563EB",
          });
          onError(error.message || "Failed to subscribe with wallet");
        } finally {
          setPaymentLoading(false);
        }
      } else if (result.isDenied) {
        // Razorpay payment
        setPaymentLoading(true);
        try {
          const orderResponse = await subscriptionApi.createOrder(plan._id);
          if (!orderResponse.success) {
            throw new Error(orderResponse.message || "Failed to create order");
          }

          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_0o5iV9J7s9C6i9",
            amount: orderResponse.order.amount,
            currency: orderResponse.order.currency,
            name: "Subscription Payment",
            description: `Subscription for ${plan.name}`,
            order_id: orderResponse.order.id,
            handler: async function (response: any) {
              try {
                const verifyResponse = await subscriptionApi.verifyAndSubscribe({
                  userId,
                  planId: plan._id,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                });
                if (verifyResponse.success) {
                  Swal.fire({
                    icon: "success",
                    title: "Subscription Successful",
                    text: "You have successfully subscribed!",
                    confirmButtonColor: "#2563EB",
                  });
                  onSuccess(verifyResponse);
                } else {
                  throw new Error(verifyResponse.message || "Payment verification failed");
                }
              } catch (error: any) {
                Swal.fire({
                  icon: "error",
                  title: "Payment Failed",
                  text: error.message || "Payment verification failed. Please try again.",
                  confirmButtonColor: "#2563EB",
                });
                onError(error.message || "Payment verification failed");
              }
            },
            prefill: {
              name: user.name || "Guest User",
              email: user.email || "guest@example.com",
            },
            theme: {
              color: "#2563EB",
            },
            modal: {
              ondismiss: function() {
                console.log('Checkout form closed by user');
                setPaymentLoading(false);
              }
            }
          };

          // Check if Razorpay is available
          if (!(window as any).Razorpay) {
            throw new Error("Payment processor not available. Please refresh the page and try again.");
          }

          const rzp = new (window as any).Razorpay(options);
          rzp.on("payment.failed", function (response: any) {
            Swal.fire({
              icon: "error",
              title: "Payment Failed",
              text: response.error.description || "Payment failed. Please try again.",
              confirmButtonColor: "#2563EB",
            });
            onError(response.error.description || "Payment failed");
            setPaymentLoading(false);
          });
          rzp.open();
        } catch (error: any) {
          Swal.fire({
            icon: "error",
            title: "Order Creation Failed",
            text: error.message || "Failed to create payment order. Please try again.",
            confirmButtonColor: "#2563EB",
          });
          onError(error.message || "Failed to create payment order");
        } finally {
          setPaymentLoading(false);
        }
      }
    });
  };

  return { handleSubscribe, paymentLoading, razorpayLoaded };
};