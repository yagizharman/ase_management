"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"

interface Notification {
  id: number
  recipient_email: string
  subject: string
  body: string
  sent_at: string
  is_read: boolean
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.email) return

      try {
        setIsLoading(true)
        const response = await api.get(`/notifications?recipient_email=${user.email}`)
        setNotifications(response)
        setUnreadCount(response.filter((n: Notification) => !n.is_read).length)
      } catch (err: any) {
        setError(err.message || "Failed to fetch notifications")
        console.error("Error fetching notifications:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.email) {
      fetchNotifications()

      // Set up polling for new notifications every minute
      const intervalId = setInterval(fetchNotifications, 60000)
      return () => clearInterval(intervalId)
    }
  }, [user?.email])

  const markAsRead = async (notificationId: number) => {
    try {
      await api.put(`/notifications/${notificationId}/read`, {
        recipient_email: user?.email
      })

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))

      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/read-all`, {
        recipient_email: user?.email
      })

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

      setUnreadCount(0)
    } catch (err) {
      console.error("Error marking all notifications as read:", err)
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  }
}

