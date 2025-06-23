import { useState } from "react";
import { walletApi } from "@/services/user/walletApi";
import Swal from "sweetalert2";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface PaymentOptions {
  userId: string | undefined;
  amount: number;
  currency: string;
  user?: { name?: string; email?: string };
}

interface UseWalletPaymentProps {
  userId: string | undefined;
  onSuccess: (response: any) => void;
  onError: (errorMessage: string) => void;
}

export const useWalletPayment = ({ userId, onSuccess, onError }: UseWalletPaymentProps) => {
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
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

  const handlePayment = async (options: PaymentOptions) => {
    if (!userId || !options.amount || !options.currency) {
      onError("Invalid payment details: userId, amount, or currency is missing");
      return;
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!uuidRegex.test(userId) && !objectIdRegex.test(userId)) {
      onError("Invalid userId format. Please ensure a valid UUID or MongoDB ObjectId is provided.");
      return;
    }

    setPaymentLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        onError("Failed to load Razorpay SDK. Please try again.");
        setPaymentLoading(false);
        return;
      }

      const orderResponse = await walletApi.createOrder({
        userId,
        amount: options.amount,
        currency: options.currency,
      });
      console.log("Wallet createOrder response:", orderResponse);

      const { id: orderId, amount, currency } = orderResponse.order;
      const userDetails = options.user || { name: "Guest User", email: "guest@example.com" };

      const paymentOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_KOCURsj88Mu4Sj",
        amount: amount * 100, // Amount in paise
        currency: currency,
        name: "Your App Name",
        description: "Add funds to wallet",
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const addFundsData = {
              userId,
              amount: options.amount,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            };
            const walletResponse = await walletApi.addFunds(addFundsData);
            console.log("Wallet add funds response:", walletResponse);
            onSuccess(walletResponse);
            Swal.fire("Success!", "Funds added to wallet successfully.", "success");
          } catch (err: any) {
            onError(err.response?.data?.message || "Payment verification failed. Please try again.");
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
        },
        theme: {
          color: "#2563EB",
        },
      };

      const razorpay = new (window as any).Razorpay(paymentOptions);
      razorpay.on("payment.failed", (response: any) => {
        console.error("Payment failed:", response.error);
        onError(`Payment failed: ${response.error.description}`);
        setPaymentLoading(false);
      });
      razorpay.open();
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      onError(err.response?.data?.message || "Failed to initiate payment. Please try again.");
      setPaymentLoading(false);
    }
  };

  return { handlePayment, paymentLoading };
};