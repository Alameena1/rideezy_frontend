import { api } from "../api";

export const walletApi = {
  getWallet: async (userId: string) => {
  try {
    const response = await api.get(`/wallet/balance/${userId}`);
    return {
      success: response.data.success,
      balance: response.data.balance,
      transactions: response.data.transactions || [],
    };
  } catch (error) {
    console.error(`Failed to fetch wallet for user ${userId}:`, error);
    throw error;
  }
},

  createOrder: async (data: { userId: string; amount: number; currency: string }) => {
    try {
      const response = await api.post("/wallet/create-deposit-order", data);
      return response.data;
    } catch (error) {
      console.error("Failed to create Razorpay order:", error);
      throw error;
    }
  },


  addFunds: async (data: {
    userId: string;
    amount: number;
    paymentId: string;
    orderId: string;
    signature: string;
  }) => {
    try {
      const response = await api.post("/wallet/deposit", data);
      console.log("Add funds response:", response);
      return response.data; 
    } catch (error) {
      console.error("Failed to add funds to wallet:", error);
      throw error;
    }
  },
};