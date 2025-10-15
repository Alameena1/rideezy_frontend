// stores/subscriptionStore.ts
import clientApiService from "@/services/client/client-api";
import { create } from "zustand";

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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface SubscriptionStore {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  searchTerm: string;
  currentSubscription: any | null;
  
  fetchPlans: (page?: number, limit?: number, search?: string) => Promise<void>;
  setSearchTerm: (search: string) => void;
  fetchCurrentSubscription: (userId: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  plans: [],
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  searchTerm: '',
  currentSubscription: null,

  fetchPlans: async (page: number = 1, limit: number = 9, search: string = '') => {
    set({ isLoading: true, error: null });
    try {
      const response = await clientApiService.subscription.getSubscriptionPlans({ 
        page, 
        limit, 
        search 
      });

      console.log("Plans API Response:", response);

      if (response?.success && response.data) {
        const plansData = response.data.plans || [];
        const paginationData = response.data.pagination || {};

        set({ 
          plans: plansData,
          pagination: {
            currentPage: paginationData.currentPage || 1,
            totalPages: paginationData.totalPages || 0,
            totalCount: paginationData.totalCount || 0,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          },
          searchTerm: search
        });
      } else {
        set({ error: "Failed to fetch subscription plans. Please try again." });
      }
    } catch (error: any) {
      console.error("Error fetching subscription plans:", error);
      set({ error: error.response?.data?.message || "Failed to fetch subscription plans. Please try again." });
    } finally {
      set({ isLoading: false });
    }
  },

  setSearchTerm: (search: string) => {
    set({ searchTerm: search });
  },

  fetchCurrentSubscription: async (userId: string) => {
    try {
      const response = await clientApiService.subscription.checkSubscription(userId);
      
      if (response && response.isSubscribed && response.subscription) {
        set({ currentSubscription: response.subscription });
      } else {
        set({ currentSubscription: null });
      }
    } catch (error: any) {
      console.error("Error fetching current subscription:", error);
      set({ error: error.response?.data?.message || "Failed to fetch subscription status." });
    }
  },
}));