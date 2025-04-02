import { api } from "@/lib/api"

// Interface for notification data
interface Notification {
  id: number
  recipient_email: string
  subject: string
  body: string
  sent_at: string
  is_read: boolean
}

// API for handling notifications
export const notificationsApi = {
  // Create a new notification
  createNotification: async (data: {
    recipient_email: string
    subject: string
    body: string
  }) => {
    return api.post("/notifications", {
      ...data,
      sent_at: new Date().toISOString(),
      is_read: false,
    })
  },

  // Get notifications for a user
  getUserNotifications: async (email: string) => {
    return api.get(`/notifications?recipient_email=${email}`)
  },

  // Mark a notification as read
  markAsRead: async (notificationId: number, email: string) => {
    return api.put(`/notifications/${notificationId}/read`, {
      recipient_email: email,
    })
  },

  // Mark all notifications as read
  markAllAsRead: async (email: string) => {
    return api.put(`/notifications/read-all`, {
      recipient_email: email,
    })
  },
}

