"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Clock, PenLine, Trash2, AlertTriangle, Crown } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  creator_role?: string
}

interface TaskCardProps {
  task: Task
  onLogEffort: (taskId: number) => void
  onDeleteTask: (taskId: number) => void
  canEdit: boolean
  canDelete: boolean
  isCreatorManager?: boolean
}

export function TaskCard({ task, onLogEffort, onDeleteTask, canEdit, canDelete, isCreatorManager }: TaskCardProps) {
  // Use useDraggable instead of useSortable for simpler dragging
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: "task",
      task,
    },
    disabled: !canEdit, // Disable dragging if user can't edit
  })
  console.log(task)
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
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

  const isOverdue = (task: Task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    return completionDate < today && task.status !== "Completed"
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(canEdit ? listeners : {})} className="touch-manipulation">
      <Card
        className={`mb-2 ${canEdit ? "cursor-grab hover:border-primary" : ""} transition-colors active:cursor-grabbing ${!canEdit ? "border-muted" : ""}`}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="font-medium line-clamp-2 flex items-center gap-1">
              {task.description}
              {isOverdue(task) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Görevinizin bitiş tarihi geçmiştir.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isCreatorManager && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Yönetici tarafından oluşturuldu</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {format(new Date(task.completion_date), "d MMM")}
            </div>

            <div className="flex items-center justify-between">
              <Badge
                variant={
                  task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"
                }
                className="text-xs"
              >
                {getPriorityLabel(task.priority)}
              </Badge>

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {task.actual_labor}/{task.planned_labor}s
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {task.assignees
                  .filter((a) => a.role === "assignee" || a.role === "partner")
                  .slice(0, 2)
                  .map((assignee, i) => (
                    <Avatar key={i} className="h-5 w-5 border-2 border-background">
                      <AvatarFallback className="text-[8px]">
                        {assignee.user?.name ? getInitials(assignee.user.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                {task.assignees.filter((a) => a.role === "assignee" || a.role === "partner").length > 2 && (
                  <Avatar className="h-5 w-5 border-2 border-background">
                    <AvatarFallback className="text-[8px]">
                      +{task.assignees.filter((a) => a.role === "assignee" || a.role === "partner").length - 2}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              <div className="flex gap-1">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onLogEffort(task.id)
                    }}
                  >
                    <PenLine className="h-3 w-3" />
                    <span className="sr-only">Çalışma Gir</span>
                  </Button>
                )}

                <Link href={`/tasks/${task.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Clock className="h-3 w-3" />
                    <span className="sr-only">Detaylar</span>
                  </Button>
                </Link>

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDeleteTask(task.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Sil</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

