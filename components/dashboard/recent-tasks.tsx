"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ArrowRight, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface Task {
  id: number
  description: string
  priority: string
  status: string
  completion_date: string
}

interface RecentTasksProps {
  userId: number | undefined
}

export function RecentTasks({ userId }: RecentTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return

      try {
        setIsLoading(true)
        const response = await api.get(`/users/${userId}/tasks?limit=5&sort=created_at:desc`)
        setTasks(response)
      } catch (err: any) {
        setError(err.message || "Görevler yüklenirken hata oluştu")
        console.error("Error fetching recent tasks:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [userId])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "warning"
      case "Low":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "success"
      case "In Progress":
        return "info"
      case "Paused":
        return "warning"
      case "Not Started":
        return "secondary"
      case "Cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "High":
        return "Yüksek"
      case "Medium":
        return "Orta"
      case "Low":
        return "Düşük"
      default:
        return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Completed":
        return "Tamamlandı"
      case "In Progress":
        return "Devam Ediyor"
      case "Paused":
        return "Duraklatıldı"
      case "Not Started":
        return "Başlamadı"
      case "Cancelled":
        return "İptal Edildi"
      default:
        return status
    }
  }

  const isOverdue = (task: Task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    console.log(completionDate, today, task.status)
    return completionDate < today && task.status !== "Completed"
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-destructive">{error}</div>
  }

  if (tasks.length === 0) {
    return <div className="text-center text-muted-foreground">Henüz görev bulunmuyor.</div>
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{task.description}</h4>
                {isOverdue(task) && <AlertTriangle className="h-4 w-4 text-destructive" />}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
                Son Tarih: {format(new Date(task.completion_date), "d MMMM yyyy")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getPriorityColor(task.priority) as any}>{getPriorityLabel(task.priority)}</Badge>
              <Badge variant={getStatusColor(task.status) as any}>{getStatusLabel(task.status)}</Badge>
              <Link href={`/tasks/${task.id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

