"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Pause, Play, XCircle } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { emailService } from "@/lib/email-service"

interface TaskStatusUpdateProps {
  currentStatus: string
  onStatusChange: (newStatus: string) => Promise<void>
  isDisabled?: boolean
  taskId?: number // Add task ID for email notifications
  taskDescription?: string // Add task description for email notifications
}

export function TaskStatusUpdate({
  currentStatus,
  onStatusChange,
  isDisabled = false,
  taskId,
  taskDescription,
}: TaskStatusUpdateProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const { user } = useAuth()

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || isDisabled) return

    try {
      setIsUpdating(true)
      await onStatusChange(newStatus)

      // Send notification to team manager if task ID and description are provided
      if (taskId && taskDescription && user && user.role !== "manager") {
        // Get the team manager's email
        try {
          const usersData = await api.get("/users")
          const teamManager = usersData.find((u: any) => u.role === "manager" && u.team_id === user.team_id)

          if (teamManager) {
            const updateDetails = `Status changed from "${getStatusLabel(status)}" to "${getStatusLabel(newStatus)}"`

            // Get task details
            const taskData = await api.get(`/tasks/${taskId}`)

            await emailService.sendTaskUpdateNotification(
              taskId, 
              taskDescription, 
              teamManager.email, 
              updateDetails,
              {
                id: taskData.id,
                description: taskData.description,
                priority: taskData.priority as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
                team_id: taskData.team_id,
                start_date: taskData.start_date,
                completion_date: taskData.completion_date,
                creator_id: taskData.creator_id,
                planned_labor: taskData.planned_labor,
                actual_labor: taskData.actual_labor,
                work_size: taskData.work_size,
                roadmap: taskData.roadmap,
                status: newStatus as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled", // Use the new status
                assignees: taskData.assignees.map((a: any) => ({
                  user_id: a.user_id,
                  role: a.role,
                  planned_labor: a.planned_labor,
                  actual_labor: a.actual_labor,
                  user: usersData.find((u: any) => u.id === a.user_id)
                }))
              },
              user.name
            )
          }
        } catch (error) {
          console.error("Error sending status update notification:", error)
        }
      }

      setStatus(newStatus)
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setIsUpdating(false)
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={status === "Not Started" ? "default" : "outline"}
          className="justify-start"
          onClick={() => handleStatusChange("Not Started")}
          disabled={isUpdating || isDisabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          Başlamadı
        </Button>

        <Button
          variant={status === "In Progress" ? "default" : "outline"}
          className="justify-start"
          onClick={() => handleStatusChange("In Progress")}
          disabled={isUpdating || isDisabled}
        >
          <Play className="mr-2 h-4 w-4" />
          Devam Ediyor
        </Button>

        <Button
          variant={status === "Paused" ? "default" : "outline"}
          className="justify-start"
          onClick={() => handleStatusChange("Paused")}
          disabled={isUpdating || isDisabled}
        >
          <Pause className="mr-2 h-4 w-4" />
          Duraklatıldı
        </Button>

        <Button
          variant={status === "Completed" ? "default" : "outline"}
          className="justify-start"
          onClick={() => handleStatusChange("Completed")}
          disabled={isUpdating || isDisabled}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Tamamlandı
        </Button>

        <Button
          variant={status === "Cancelled" ? "default" : "outline"}
          className="justify-start col-span-2"
          onClick={() => handleStatusChange("Cancelled")}
          disabled={isUpdating || isDisabled}
        >
          <XCircle className="mr-2 h-4 w-4" />
          İptal Edildi
        </Button>
      </div>

      {isUpdating && <div className="text-center text-sm text-muted-foreground">Durum güncelleniyor...</div>}
      {isDisabled && <div className="text-center text-sm text-muted-foreground">Durum değiştirme yetkiniz yok</div>}
    </div>
  )
}

