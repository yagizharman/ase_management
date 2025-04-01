"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  Clock,
  PenLine,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Pause,
  XCircle,
} from "lucide-react"

interface TaskAssignee {
  user_id: number
  role: string
  user?: {
    id: number
    name: string
  }
  planned_labor: number
  actual_labor: number
}

interface Task {
  id: number
  description: string
  priority: string
  status: string
  completion_date: string
  start_date: string
  planned_labor: number
  actual_labor: number
  assignees: TaskAssignee[]
  creator_id: number
  team_id: number
}

interface TaskListViewProps {
  tasks: Task[]
  isLoading: boolean
  error: string
  onLogEffort: (taskId: number) => void
  onDeleteTask: (taskId: number) => void
  canEditTask: (task: Task) => boolean
  canDeleteTask: (task: Task) => boolean
}

export function TaskListView({
  tasks,
  isLoading,
  error,
  onLogEffort,
  onDeleteTask,
  canEditTask,
  canDeleteTask,
}: TaskListViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">Hata: {error}</CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Görev bulunamadı. Yeni bir görev oluşturun.
        </CardContent>
      </Card>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Not Started":
        return <Clock className="h-4 w-4" />
      case "In Progress":
        return <Timer className="h-4 w-4" />
      case "Paused":
        return <Pause className="h-4 w-4" />
      case "Completed":
        return <CheckCircle2 className="h-4 w-4" />
      case "Cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Not Started":
        return "Başlamadı"
      case "In Progress":
        return "Devam Ediyor"
      case "Paused":
        return "Duraklatıldı"
      case "Completed":
        return "Tamamlandı"
      case "Cancelled":
        return "İptal Edildi"
      default:
        return status
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

  const isOverdue = (task: Task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    return completionDate < today && task.status !== "Completed"
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className={isOverdue(task) ? "border-destructive" : ""}>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Task description and badges */}
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lg">{task.description}</h3>
                  {isOverdue(task) && (
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Gecikmiş
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={getPriorityColor(task.priority) as any}>{getPriorityLabel(task.priority)}</Badge>
                  <Badge variant={getStatusColor(task.status) as any} className="flex items-center gap-1">
                    {getStatusIcon(task.status)}
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>

                <div className="flex items-center text-sm text-muted-foreground gap-4">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    Başlangıç: {format(new Date(task.start_date), "d MMM yyyy")}
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    Bitiş: {format(new Date(task.completion_date), "d MMM yyyy")}
                  </div>
                </div>
              </div>

              {/* Task details */}
              <div className="md:col-span-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Planlanan İş Saati:</span>
                  <span className="font-medium">{task.planned_labor} saat</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gerçekleşen İş Saati:</span>
                  <span className="font-medium">{task.actual_labor} saat</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.assignees
                    .filter((a) => a.role === "assignee" || a.role === "partner")
                    .map((assignee, i) => (
                      <Avatar key={i} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-[10px]">
                          {assignee.user?.name ? getInitials(assignee.user.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="md:col-span-3 flex items-center justify-end gap-2">
                {canEditTask(task) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onLogEffort(task.id)
                    }}
                  >
                    <PenLine className="h-4 w-4 mr-1" />
                    Çalışma Gir
                  </Button>
                )}

                <Link href={`/tasks/${task.id}`}>
                  <Button variant="outline" size="sm">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Detaylar
                  </Button>
                </Link>

                {canDeleteTask(task) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDeleteTask(task.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Sil
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

