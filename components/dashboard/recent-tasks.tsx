"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ArrowRight, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"
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
        
        // Sort tasks: Incomplete first, then by completion status, then by priority
        const sortedTasks = response.sort((a: Task, b: Task) => {
          // First sort by completion status (incomplete first)
          if (a.status === "Completed" && b.status !== "Completed") return 1
          if (a.status !== "Completed" && b.status === "Completed") return -1

          // Then sort by overdue status
          const isAOverdue = isOverdue(a)
          const isBOverdue = isOverdue(b)
          if (isAOverdue && !isBOverdue) return -1
          if (!isAOverdue && isBOverdue) return 1

          // Finally sort by priority
          const priorityOrder = { High: 0, Medium: 1, Low: 2 }
          return (
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder]
          )
        })

        setTasks(sortedTasks)
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
        return "default"
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
    return completionDate < today && task.status !== "Completed"
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
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
      {tasks.map((task) => {
        const isTaskCompleted = task.status === "Completed"
        const isTaskOverdue = isOverdue(task)

        return (
          <Link key={task.id} href={`/tasks/${task.id}`}>
            <Card className={`p-4 transition-colors relative hover:bg-muted/50 ${
              isTaskCompleted
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : ""
            }`}>
              {isTaskCompleted && (
                <div className="absolute right-2 top-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              )}
              <div className="flex flex-col space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h4 className={`font-medium flex-1 ${isTaskCompleted ? "text-green-700 dark:text-green-300" : ""}`}>
                    {task.description}
                  </h4>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge 
                      variant={getPriorityColor(task.priority) as any}
                      className="flex-shrink-0"
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    <Badge 
                      variant={getStatusColor(task.status) as any}
                      className={`flex-shrink-0 ${
                        isTaskCompleted ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300" : ""
                      }`}
                    >
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                  Son Tarih: {format(new Date(task.completion_date), "d MMMM yyyy")}
                  {isTaskOverdue && !isTaskCompleted && (
                    <Badge variant="destructive" className="ml-2 flex-shrink-0">
                      Gecikmiş
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

