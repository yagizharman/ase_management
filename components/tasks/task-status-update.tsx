"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Pause, Play, XCircle } from "lucide-react"

interface TaskStatusUpdateProps {
  currentStatus: string
  onStatusChange: (newStatus: string) => Promise<void>
  isDisabled?: boolean
}

export function TaskStatusUpdate({ currentStatus, onStatusChange, isDisabled = false }: TaskStatusUpdateProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || isDisabled) return

    try {
      setIsUpdating(true)
      await onStatusChange(newStatus)
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

