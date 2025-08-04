import { api } from "../api";

export const notificationApi = {
  getUserNotifications: async (userId: string) => {
    try {
      const response = await api.get(`/notifications/${userId}`);
      return {
        success: response.data.success,
        notifications: response.data.notifications || [],
      };
    } catch (error) {
      console.error(`Failed to fetch notifications for user ${userId}:`, error);
      throw error;
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return {
        success: response.data.success,
        notification: response.data.notification,
      };
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as read:`, error);
      throw error;
    }
  },
};