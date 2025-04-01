"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, CheckCircle2 } from "lucide-react"
import { format, isToday } from "date-fns"
import Link from "next/link"

interface DailyTaskPopupProps {
  userId: number | undefined
}

export function DailyTaskPopup({ userId }: DailyTaskPopupProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [taskCount, setTaskCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return

      try {
        setIsLoading(true)

        // Fetch all tasks for the user
        const response = await api.get(`/users/${userId}/tasks`)

        // Filter for today's tasks and overdue tasks
        const todayTasks = response.filter((task: any) => {
          const completionDate = new Date(task.completion_date)
          completionDate.setHours(23, 59, 59, 999) // Set to end of the day
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Set to start of the day
          const isOverdue = completionDate < today && task.status !== "Completed"
         
          return isToday(completionDate) || isOverdue
        })

        // Sort by priority (High > Medium > Low)
        todayTasks.sort((a: any, b: any) => {
          const priorityOrder = { High: 0, Medium: 1, Low: 2 }
          return (
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder]
          )
        })

        setTasks(todayTasks)
        setTaskCount(todayTasks.length)
      } catch (err: any) {
        setError(err.message || "Failed to fetch tasks")
        console.error("Error fetching daily tasks:", err)
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch tasks when component mounts and when dialog opens
    fetchTasks()
  }, [userId, isOpen])

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

  const isOverdue = (task: any) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    return completionDate < today && task.status !== "Completed"
  }

  const [hours, setHours] = useState(0.5)

  const handleHoursChange = (action: "increase" | "decrease") => {
    if (action === "increase") {
      setHours((prev) => prev + 0.5)
    } else {
      setHours((prev) => Math.max(0.5, prev - 0.5))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="mr-2 h-4 w-4" />
          Bugünkü Görevler
          {taskCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {taskCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            {format(new Date(), "d MMMM yyyy")} Tarihli Görevler
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-destructive">{error}</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>Bugün için planlanmış görev bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{task.description}</h3>
                      <div className="flex space-x-2">
                        <Badge variant={getPriorityColor(task.priority) as any}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        <Badge variant={getStatusColor(task.status) as any}>{getStatusLabel(task.status)}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      Son Tarih: {format(new Date(task.completion_date), "d MMMM yyyy")}
                      {isOverdue(task) && (
                        <Badge variant="destructive" className="ml-2">
                          Gecikmiş
                        </Badge>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Link href={`/tasks/${task.id}`}>
                        <Button variant="outline" size="sm">
                          Detayları Görüntüle
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

