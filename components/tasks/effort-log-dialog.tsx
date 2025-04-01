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

interface EffortLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (hours: number, details: string) => void
}

export function EffortLogDialog({ open, onOpenChange, onSubmit }: EffortLogDialogProps) {
  const [hours, setHours] = useState<number>(0)
  const [details, setDetails] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (hours <= 0) return

    setIsSubmitting(true)
    try {
      await onSubmit(hours, details)
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
              placeholder="Describe what you worked on (e.g., 'Implemented login functionality', 'Fixed bug in reporting module')"
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

