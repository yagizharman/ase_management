"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { emailService } from "@/lib/email-service"

interface EffortLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (hours: number, details: string) => void
  taskDescription?: string // Add task description for email notifications
  taskId?: number // Add task ID for email notifications
}

export function EffortLogDialog({ open, onOpenChange, onSubmit, taskDescription, taskId }: EffortLogDialogProps) {
  const [hours, setHours] = useState<number>(0)
  const [details, setDetails] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async () => {
    if (hours <= 0) return

    setIsSubmitting(true)
    try {
      await onSubmit(hours, details)

      // Send notification to team manager if task ID and description are provided
      if (taskId && taskDescription && user) {
        // Get the team manager's email
        try {
          const usersData = await api.get("/users")
          const teamManager = usersData.find((u: any) => u.role === "manager" && u.team_id === user.team_id)

          if (teamManager) {
            const updateDetails = details ? `${hours} saat çalışma: ${details}` : `${hours} saat çalışma kaydedildi`

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
                actual_labor: taskData.actual_labor + hours,
                work_size: taskData.work_size,
                roadmap: taskData.roadmap,
                status: taskData.status as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
                assignees: taskData.assignees.map((a: any) => ({
                  user_id: a.user_id,
                  role: a.role,
                  planned_labor: a.planned_labor,
                  actual_labor: a.user_id === user.id ? a.actual_labor + hours : a.actual_labor,
                  user: usersData.find((u: any) => u.id === a.user_id)
                }))
              },
              user.name
            )
          }
        } catch (error) {
          console.error("Error sending effort log notification:", error)
        }
      }

      setHours(0)
      setDetails("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Çalışma Kaydı Ekle</DialogTitle>
          <DialogDescription>Bu görev için harcadığınız çalışma saatini ve detayları girin.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hours" className="text-right">
              Saat
            </Label>
            <Input
              id="hours"
              type="number"
              min="0.5"
              step="0.5"
              value={hours || ""}
              onChange={(e) => setHours(Number.parseFloat(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="details" className="text-right pt-2">
              Detaylar
            </Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Yapılan çalışma hakkında detaylar..."
              className="col-span-3 min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={hours <= 0 || isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

