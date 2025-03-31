"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, Clock, Crown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Task, TaskUpdateRequest } from "@/lib/types"
import { tasksAPI, notificationsAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import TaskModal from "@/components/task-modal"

interface TaskListProps {
  tasks: Task[]
  onTaskUpdated?: () => void
}

export default function TaskList({ tasks, onTaskUpdated }: TaskListProps) {
  const { user } = useAuth()
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const canEditTask = (task: Task) => {
    return task.CreatedByUserId === user?.UserId
  }

  const canUpdateTask = (task: Task) => {
    return task.CreatedByUserId === user?.UserId || task.AssignedToUserId === user?.UserId
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "success"
      case "In Progress":
        return "warning"
      case "Not Started":
        return "secondary"
      case "On Hold":
        return "outline"
      default:
        return "secondary"
    }
  }

  const handleStatusChange = async (task: Task, completed: boolean) => {
    if (!user || !task.TaskId || !canUpdateTask(task)) return

    try {
      const updateData: TaskUpdateRequest = {
        task_update: {
          Status: completed ? "Completed" : "In Progress",
        }
      }

      await tasksAPI.updateTask(task.TaskId, updateData, user.UserId)

      // Create notification for task status change
      if (task.CreatedByUserId !== user.UserId) {
        await notificationsAPI.createNotification(task.TaskId, user.UserId, task.CreatedByUserId, "update")
      }

      toast.success(`Görev ${completed ? "tamamlandı" : "devam ediyor"} olarak işaretlendi`)

      if (onTaskUpdated) {
        onTaskUpdated()
      }
    } catch (error: any) {
      console.error("Görev durumu güncellenemedi:", error)
      toast.error(error.message || "Görev durumu güncellenemedi")
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!taskId || !user) return

    try {
      await tasksAPI.deleteTask(taskId, user.UserId)
      toast.success("Görev başarıyla silindi")

      if (onTaskUpdated) {
        onTaskUpdated()
      }
    } catch (error: any) {
      console.error("Görev silinemedi:", error)
      toast.error(error.message || "Görev silinemedi")
    }
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <Card key={task.TaskId} className="task-item">
          <CardContent className="p-0">
            <div className="flex items-start p-3 gap-3">
              <Checkbox
                checked={task.Status === "Completed"}
                onCheckedChange={(checked) => handleStatusChange(task, checked as boolean)}
                className="mt-1"
                disabled={!canUpdateTask(task)}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Link href={`/tasks/${task.TaskId}`} className="font-medium hover:underline">
                      {task.Title}
                    </Link>
                    {task.CreatedByUserId === user?.UserId && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Yönetici
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Menüyü aç</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEditTask(task) && (
                        <DropdownMenuItem onClick={() => setEditingTask(task)}>Düzenle</DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/tasks/${task.TaskId}`}>Detayları Görüntüle</Link>
                      </DropdownMenuItem>
                      {canEditTask(task) && (
                        <DropdownMenuItem
                          onClick={() => {
                            if (task.TaskId) {
                              handleDeleteTask(task.TaskId)
                            }
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          Sil
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{task.Description}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant={getPriorityColor(task.Priority) as any}>{task.Priority}</Badge>
                  <Badge variant={getStatusColor(task.Status) as any}>{task.Status}</Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    <span>
                      Son tarih: {formatDistanceToNow(new Date(task.DueDate), { addSuffix: true, locale: tr })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground ml-auto">
                    {task.SpentHours || 0}/{task.PlannedHours} saat
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {editingTask && (
        <TaskModal
          open={!!editingTask}
          onOpenChange={() => setEditingTask(null)}
          task={editingTask}
          onTaskUpdated={() => {
            toast.success("Görev başarıyla güncellendi")
            setEditingTask(null)
            if (onTaskUpdated) {
              onTaskUpdated()
            }
          }}
        />
      )}
    </div>
  )
}

