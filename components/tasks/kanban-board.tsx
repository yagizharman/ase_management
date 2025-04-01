"use client"

import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskCard } from "./task-card"

interface TaskAssignee {
  user_id: number
  role: string
  user?: {
    id: number
    name: string
    role: string
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

interface KanbanBoardProps<T extends Task> {
  id: string
  title: string
  tasks: T[]
  isLoading: boolean
  error: string
  onLogEffort: (taskId: number) => void
  onDeleteTask: (taskId: number) => void
  canEditTask: (task: T) => boolean
  canDeleteTask: (task: T) => boolean
}

const isCreatorManager = (task: Task): boolean => {
  // Find the creator in the assignees list
  const creator = task.assignees.find(assignee => assignee.user?.id === task.creator_id)
  // Check if the creator's role is manager
  console.log("creator", creator)
  return creator?.user?.role === "manager"
  
}

export function KanbanBoard<T extends Task>({
  id,
  title,
  tasks,
  isLoading,
  error,
  onLogEffort,
  onDeleteTask,
  canEditTask,
  canDeleteTask,
}: KanbanBoardProps<T>) {
  // Use the useDroppable hook to make this column a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  })

  return (
    <Card
      className={`h-full flex flex-col ${isOver ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}
      ref={setNodeRef}
    >
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title}</span>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">{tasks.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 overflow-y-auto max-h-full flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-destructive text-sm">Hata: {error}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Bu durumda görev bulunmuyor</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onLogEffort={onLogEffort}
                onDeleteTask={onDeleteTask}
                canEdit={canEditTask(task)}
                canDelete={canDeleteTask(task)}
                isCreatorManager={isCreatorManager(task)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

