"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import type { Task, TaskPartner } from "@/lib/types"
import { tasksAPI } from "@/lib/api"
import { toast } from "sonner"

interface PartnerTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  partnerInfo: TaskPartner
  onTaskUpdated?: () => void
}

export default function PartnerTaskModal({ open, onOpenChange, task, partnerInfo, onTaskUpdated }: PartnerTaskModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [spentHours, setSpentHours] = useState(partnerInfo.SpentHours || 0)
  const [roadMap, setRoadMap] = useState(partnerInfo.RoadMap || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !task.TaskId) return

    setIsLoading(true)

    try {
      // Update partner information
      await tasksAPI.updateTask(task.TaskId, {
        task_update: {},
        partners: [{
          TaskId: task.TaskId,
          UserId: user.UserId,
          PlannedHours: partnerInfo.PlannedHours,
          SpentHours: spentHours,
          RoadMap: roadMap
        }]
      }, user.UserId)

      if (onTaskUpdated) {
        onTaskUpdated()
      }
    } catch (error: any) {
      console.error("Partner bilgileri güncellenemedi:", error)
      toast.error(error.message || "Partner bilgileri güncellenemedi")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partner Bilgilerini Güncelle</DialogTitle>
          <DialogDescription>
            {task.Title} görevi için partner bilgilerinizi güncelleyin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spentHours">Harcanan Saat</Label>
            <Input
              id="spentHours"
              type="number"
              min="0"
              value={spentHours}
              onChange={(e) => setSpentHours(Number(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roadMap">Yol Haritası</Label>
            <Textarea
              id="roadMap"
              value={roadMap}
              onChange={(e) => setRoadMap(e.target.value)}
              placeholder="Görev için yol haritanızı güncelleyin..."
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Güncelle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 