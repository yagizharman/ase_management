"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"

interface HistoryItem {
  id: number
  task_id: number
  user_id: number
  action: string
  timestamp: string
  details: string
  user?: {
    id: number
    name: string
  }
}

interface TaskHistoryProps {
  taskId: number
}

export function TaskHistory({ taskId }: TaskHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [users, setUsers] = useState<Record<number, { name: string }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true)

        // Fetch users first to get names
        const usersData = await api.get("/users")
        const usersMap: Record<number, { name: string }> = {}
        usersData.forEach((user: any) => {
          usersMap[user.id] = { name: user.name }
        })
        setUsers(usersMap)

        // Fetch task history
        const historyData = await api.get(`/tasks/${taskId}/history`)

        // Add user details to history items
        const historyWithUsers = historyData.map((item: HistoryItem) => ({
          ...item,
          user: usersMap[item.user_id],
        }))

        setHistory(historyWithUsers)
      } catch (err: any) {
        setError(err.message || "Görev geçmişi yüklenirken hata oluştu")
        console.error("Error fetching task history:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [taskId])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const translateAction = (action: string) => {
    const actionMap: Record<string, string> = {
      create: "oluşturma",
      update: "güncelleme",
      delete: "silme",
    }

    return actionMap[action] || action
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-destructive">Hata: {error}</div>
  }

  if (history.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">Bu görev için geçmiş bilgisi bulunmuyor.</div>
  }

  return (
    <div className="space-y-6">
      {history.map((item) => (
        <div key={item.id} className="flex items-start space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{item.user?.name ? getInitials(item.user.name) : "U"}</AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{item.user?.name || `Kullanıcı ${item.user_id}`}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(item.timestamp), "d MMMM yyyy HH:mm")}</p>
            </div>
            <p className="text-sm">
              <span className="font-medium">{translateAction(item.action)}</span>
              {item.details && `: ${item.details}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

