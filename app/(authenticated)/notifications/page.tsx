"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle, Clock, AlertTriangle, User, Calendar } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { notificationsAPI, usersAPI } from "@/lib/api"
import type { Notification } from "@/lib/types"
import { toast } from "sonner"

export default function NotificationsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        const notificationsData = await notificationsAPI.getNotifications(user.UserId)

        // Enhance notifications with additional info
        const enhancedNotifications = await Promise.all(
          notificationsData.map(async (notification: Notification) => {
            try {
              // Get sender info
              const sender = await usersAPI.getUserById(notification.SenderUserId)

              // Create message based on notification type
              let message = ""
              switch (notification.NotificationType) {
                case "assignment":
                  message = `${sender.FullName} size yeni bir görev atadı`
                  break
                case "update":
                  message = `${sender.FullName} dahil olduğunuz bir görevi güncelledi`
                  break
                case "deadline":
                  message = "Bir görevin son tarihi yaklaşıyor"
                  break
                case "mention":
                  message = `${sender.FullName} sizi bir yorumda etiketledi`
                  break
                default:
                  message = "Yeni bir bildiriminiz var"
              }

              return {
                ...notification,
                senderName: sender.FullName,
                message,
              }
            } catch (error) {
              console.error("Bildirim geliştirme hatası:", error)
              return {
                ...notification,
                senderName: "Bilinmeyen Kullanıcı",
                message: "Yeni bir bildiriminiz var",
              }
            }
          }),
        )

        setNotifications(enhancedNotifications)
      } catch (error) {
        console.error("Bildirimler alınamadı:", error)
        toast.error("Bildirimler yüklenemedi")
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchNotifications()
    }
  }, [user])

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead(notificationId)

      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notification.NotificationId === notificationId ? { ...notification, IsRead: true } : notification,
        ),
      )

      toast.success("Bildirim okundu olarak işaretlendi")
    } catch (error) {
      console.error("Bildirim okundu olarak işaretlenemedi:", error)
      toast.error("Bildirim güncellenemedi")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // Mark each unread notification as read
      const unreadNotifications = notifications.filter((n) => !n.IsRead)

      await Promise.all(
        unreadNotifications.map((notification) => notificationsAPI.markAsRead(notification.NotificationId)),
      )

      // Update local state
      setNotifications(
        notifications.map((notification) => ({
          ...notification,
          IsRead: true,
        })),
      )

      toast.success("Tüm bildirimler okundu olarak işaretlendi")
    } catch (error) {
      console.error("Tüm bildirimler okundu olarak işaretlenemedi:", error)
      toast.error("Bildirimler güncellenemedi")
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.IsRead
    return notification.NotificationType === activeTab
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "update":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "deadline":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "mention":
        return <User className="h-5 w-5 text-purple-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
        <Button variant="outline" onClick={handleMarkAllAsRead}>
          Tümünü Okundu İşaretle
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList>
          <TabsTrigger value="all">
            Tümü
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Okunmamış
            {notifications.filter((n) => !n.IsRead).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.filter((n) => !n.IsRead).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assignment">Görev Atamaları</TabsTrigger>
          <TabsTrigger value="deadline">Son Tarihler</TabsTrigger>
          <TabsTrigger value="update">Güncellemeler</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all" && "Tüm Bildirimler"}
                {activeTab === "unread" && "Okunmamış Bildirimler"}
                {activeTab === "assignment" && "Görev Atamaları"}
                {activeTab === "deadline" && "Son Tarih Uyarıları"}
                {activeTab === "update" && "Görev Güncellemeleri"}
              </CardTitle>
              <CardDescription>
                {activeTab === "all" && "Tüm bildirimlerinizi görüntüleyin"}
                {activeTab === "unread" && "Henüz okumadığınız bildirimler"}
                {activeTab === "assignment" && "Size atanan görevler"}
                {activeTab === "deadline" && "Yaklaşan veya geçmiş son tarihi olan görevler"}
                {activeTab === "update" && "Görevlerinizle ilgili son güncellemeler"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.NotificationId}
                      className={`flex items-start gap-4 p-3 rounded-lg border ${
                        !notification.IsRead ? "bg-muted" : ""
                      }`}
                    >
                      <div className="mt-1">{getNotificationIcon(notification.NotificationType)}</div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{notification.message}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(notification.NotificationDate), {
                              addSuffix: true,
                              locale: tr,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {notification.TaskId && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/tasks/${notification.TaskId}`}>Görevi Görüntüle</Link>
                          </Button>
                        )}
                        {!notification.IsRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.NotificationId)}
                          >
                            Okundu İşaretle
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Bildirim yok</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === "all" && "Henüz hiç bildiriminiz yok."}
                    {activeTab === "unread" && "Tüm bildirimlerinizi okudunuz."}
                    {activeTab === "assignment" && "Hiç görev atamanız yok."}
                    {activeTab === "deadline" && "Hiç son tarih uyarınız yok."}
                    {activeTab === "update" && "Hiç görev güncellemeniz yok."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

