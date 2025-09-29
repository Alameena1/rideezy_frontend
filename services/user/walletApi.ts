import { serverApiInstance } from "../api";

export const walletApi = {
  getWallet: async (userId: string, page: number = 1, limit: number = 10) => {
    try {
      // Fetch balance
      const balanceResponse = await serverApiInstance.get(`/wallet/balance/${userId}`);
      // Fetch paginated transactions
      const transactionsResponse = await serverApiInstance.get(`/wallet/transactions/${userId}`, {
        params: { page, limit },
      });

      console.log("Balance API response:", balanceResponse);
      console.log("Transactions API response:", transactionsResponse);
      return {
        success: balanceResponse.data.success && transactionsResponse.data.success,
        balance: balanceResponse.data.balance || 0,
        transactions: transactionsResponse.data.transactions || [],
        total: transactionsResponse.data.total || 0,
        totalPages: transactionsResponse.data.totalPages || 1,
        currentPage: transactionsResponse.data.currentPage || 1,
      };
    } catch (error) {
      console.error(`Failed to fetch wallet for user ${userId}:`, error);
      throw error;
    }
  },

  createOrder: async (data: { userId: string; amount: number; currency: string }) => {
    try {
      const response = await serverApiInstance.post("/wallet/create-deposit-order", data);
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
      const response = await serverApiInstance.post("/wallet/deposit", data);
      console.log("Add funds response:", response);
      return response.data;
    } catch (error) {
      console.error("Failed to add funds to wallet:", error);
      throw error;
    }
  },
};