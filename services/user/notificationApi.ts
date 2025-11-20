import { serverApiInstance } from "../api";
import { NOTIFICATION_ROUTES } from "../../constants/apiRoutes";

export const notificationApi = {
  getUserNotifications: async (userId: string) => {
    try {
      const response = await serverApiInstance.get(NOTIFICATION_ROUTES.GET_USER_NOTIFICATIONS(userId));
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
      const response = await serverApiInstance.put(NOTIFICATION_ROUTES.MARK_AS_READ(notificationId));
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