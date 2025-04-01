"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, Search, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCorners,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core"
import { KanbanBoard } from "@/components/tasks/kanban-board"
import { TaskCard } from "@/components/tasks/task-card"
import { toast } from "sonner"
import { EffortLogDialog } from "@/components/tasks/effort-log-dialog"
import { TaskListView } from "@/components/tasks/task-list-view"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

export default function TasksPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get("filter")

  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [effortLogOpen, setEffortLogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Configure DnD sensors with better touch support
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  )

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        // Fetch tasks for the current user
        const response = await api.get(`/users/${user?.id}/tasks`)

        // Fetch users to get assignee details
        const usersData = await api.get("/users")

        // Add user details to assignees
        const tasksWithUserDetails = response.map((task: Task) => {
          const assigneesWithUsers = task.assignees.map((assignee) => {
            const assigneeUser = usersData.find((u: any) => u.id === assignee.user_id)
            return {
              ...assignee,
              user: assigneeUser,
            }
          })

          return {
            ...task,
            assignees: assigneesWithUsers,
          }
        })

        setTasks(tasksWithUserDetails)
      } catch (err: any) {
        setError(err.message || "Görevler yüklenirken hata oluştu")
        console.error("Error fetching tasks:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id) {
      fetchTasks()
    }
  }, [user?.id])

  useEffect(() => {
    // Apply URL filter parameter if present
    if (filterParam) {
      switch (filterParam) {
        case "overdue":
          setStatusFilter("overdue")
          break
        case "upcoming":
          setStatusFilter("upcoming")
          break
        case "not-started":
          setStatusFilter("Not Started")
          break
        default:
          setStatusFilter("all")
      }
    }
  }, [filterParam])

  useEffect(() => {
    // Apply filters to tasks
    let result = [...tasks]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((task) => task.description.toLowerCase().includes(query))
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        result = result.filter((task) => new Date(task.completion_date) < new Date() && task.status !== "Completed")
      } else if (statusFilter === "upcoming") {
        result = result.filter((task) => {
          const dueDate = new Date(task.completion_date)
          const today = new Date()
          const diffTime = dueDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays <= 3 && diffDays > 0 && task.status !== "Completed"
        })
      } else {
        result = result.filter((task) => task.status === statusFilter)
      }
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.priority === priorityFilter)
    }

    setFilteredTasks(result)
  }, [tasks, searchQuery, statusFilter, priorityFilter])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const taskId = active.id.toString().split("-")[1]

    if (!taskId) return

    setActiveId(active.id.toString())
    const task = tasks.find((t) => t.id.toString() === taskId)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    setActiveTask(null)

    if (!over) return

    // Extract task ID from the active element ID
    const taskId = active.id.toString().split("-")[1]

    // The over.id is the column ID (status)
    const newStatus = over.id.toString()

    console.log(`Moving task ${taskId} to status ${newStatus}`)

    if (
      !taskId ||
      !newStatus ||
      !["Not Started", "In Progress", "Paused", "Completed", "Cancelled"].includes(newStatus)
    )
      return

    try {
      // Find the task
      const taskToUpdate = tasks.find((task) => task.id.toString() === taskId)

      if (!taskToUpdate || taskToUpdate.status === newStatus) return

      // Check if user is allowed to update this task
      if (!canEditTask(taskToUpdate)) {
        toast.error("Bu görevi düzenleme yetkiniz yok")
        return
      }

      // Update the task status locally first for immediate feedback
      const updatedTasks = tasks.map((task) => {
        if (task.id.toString() === taskId) {
          return { ...task, status: newStatus }
        }
        return task
      })

      setTasks(updatedTasks)

      // Send the update to the API
      await api.put(`/tasks/${taskId}`, {
        status: newStatus,
        history_note: `Durum "${getStatusLabel(taskToUpdate.status)}" -> "${getStatusLabel(newStatus)}" olarak değiştirildi`,
      })

      toast.success(`Görev durumu "${getStatusLabel(newStatus)}" olarak güncellendi`)
    } catch (error) {
      console.error("Error updating task status:", error)
      toast.error("Görev durumu güncellenirken hata oluştu")

      // Revert the change if the API call fails
      setTasks([...tasks])
    }
  }

  const handleLogEffort = (taskId: number) => {
    setSelectedTaskId(taskId)
    setEffortLogOpen(true)
  }

  const handleEffortSubmit = async (hours: number, details: string) => {
    if (!selectedTaskId || !user) return

    try {
      const task = tasks.find((t) => t.id === selectedTaskId)
      if (!task) return

      // Find the current user's assignee record
      const userAssignee = task.assignees.find(
        (a) => a.user_id === user.id && (a.role === "assignee" || a.role === "partner"),
      )

      if (!userAssignee) {
        toast.error("Bu göreve katkıda bulunma yetkiniz yok")
        return
      }

      // Update the assignee's actual labor
      const updatedAssignees = task.assignees.map((a) => {
        if (a.user_id === user.id && (a.role === "assignee" || a.role === "partner")) {
          return {
            ...a,
            actual_labor: a.actual_labor + hours,
          }
        }
        return a
      })

      // Calculate new total actual labor
      const newActualLabor = task.assignees.reduce((total, a) => {
        if (a.user_id === user.id && (a.role === "assignee" || a.role === "partner")) {
          return total + hours
        }
        return total + a.actual_labor
      }, 0)

      // Update task locally
      const updatedTasks = tasks.map((t) => {
        if (t.id === selectedTaskId) {
          return {
            ...t,
            assignees: updatedAssignees,
            actual_labor: newActualLabor,
          }
        }
        return t
      })

      setTasks(updatedTasks)

      // Send update to API with details
      await api.put(`/tasks/${selectedTaskId}`, {
        assignees: [
          {
            user_id: user.id,
            role: userAssignee.role,
            planned_labor: userAssignee.planned_labor,
            actual_labor: userAssignee.actual_labor + hours,
          },
        ],
        // Add a history entry with the details
        history_note: details ? `${hours} saat çalışma: ${details}` : `${hours} saat çalışma kaydedildi`,
      })

      toast.success(`${hours} saat çalışma kaydedildi`)
      setEffortLogOpen(false)
    } catch (error) {
      console.error("Error logging effort:", error)
      toast.error("Çalışma saati kaydedilirken hata oluştu")
    }
  }

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      setIsDeleting(true)

      // Find the task
      const task = tasks.find((t) => t.id === taskToDelete)
      if (!task) {
        toast.error("Görev bulunamadı")
        return
      }

      // Check if user can delete this task
      if (!canDeleteTask(task)) {
        toast.error("Bu görevi silme yetkiniz yok")
        return
      }

      // Log task data for debugging
      console.log("Deleting task:", {
        taskId: task.id,
        creatorId: task.creator_id,
        teamId: task.team_id,
        userRole: user?.role,
        userTeamId: user?.team_id,
      })

      // Delete the task
      await api.delete(`/tasks/${taskToDelete}`)

      // Update local state
      setTasks(tasks.filter((t) => t.id !== taskToDelete))
      toast.success("Görev başarıyla silindi")
    } catch (error: any) {
      console.error("Error deleting task:", error)
      // Show the error message from the backend if available
      toast.error(error.message || "Görev silinirken hata oluştu")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setTaskToDelete(null)
    }
  }

  const confirmDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId)
    setDeleteDialogOpen(true)
  }

  // Permission checks
  const canEditTask = (task: Task) => {
    if (!user) return false

    // User is the creator
    if (task.creator_id === user.id) return true

    // User is a manager
    if (user.role === "manager") return true

    // User is an assignee or partner
    return task.assignees.some((a) => a.user_id === user.id && (a.role === "assignee" || a.role === "partner"))
  }

  const canDeleteTask = (task: Task) => {
    if (!user) return false

    // User is the creator
    if (task.creator_id === user.id) return true

    // User is a manager of the team that owns the task
    if (user.role === "manager" && task.team_id === user.team_id) return true

    return false
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

  // Group tasks by status for the Kanban board
  const tasksByStatus = {
    "Not Started": filteredTasks.filter((task) => task.status === "Not Started"),
    "In Progress": filteredTasks.filter((task) => task.status === "In Progress"),
    Paused: filteredTasks.filter((task) => task.status === "Paused"),
    Completed: filteredTasks.filter((task) => task.status === "Completed"),
    Cancelled: filteredTasks.filter((task) => task.status === "Cancelled"),
  }

  const statusColumns = [
    { id: "Not Started", title: "Başlamadı" },
    { id: "In Progress", title: "Devam Ediyor" },
    { id: "Paused", title: "Duraklatıldı" },
    { id: "Completed", title: "Tamamlandı" },
    { id: "Cancelled", title: "İptal Edildi" },
  ]

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Görevlerim</h1>
        <div className="flex items-center gap-2">
          <div className="bg-muted/50 p-1 rounded-md flex">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1" />
              Liste
            </Button>
          </div>
          <Link href="/tasks/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Görev
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Görevleri ara..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="Not Started">Başlamadı</SelectItem>
                  <SelectItem value="In Progress">Devam Ediyor</SelectItem>
                  <SelectItem value="Paused">Duraklatıldı</SelectItem>
                  <SelectItem value="Completed">Tamamlandı</SelectItem>
                  <SelectItem value="Cancelled">İptal Edildi</SelectItem>
                  <SelectItem value="overdue">Gecikmiş</SelectItem>
                  <SelectItem value="upcoming">Yakında Dolacak</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Öncelik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Öncelikler</SelectItem>
                  <SelectItem value="High">Yüksek</SelectItem>
                  <SelectItem value="Medium">Orta</SelectItem>
                  <SelectItem value="Low">Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
            {statusColumns.map((column) => (
              <KanbanBoard
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={tasksByStatus[column.id as keyof typeof tasksByStatus]}
                isLoading={isLoading}
                error={error}
                onLogEffort={handleLogEffort}
                onDeleteTask={confirmDeleteTask}
                canEditTask={canEditTask}
                canDeleteTask={canDeleteTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeId && activeTask && (
              <div className="w-[250px] opacity-80">
                <TaskCard
                  task={activeTask}
                  onLogEffort={() => {}}
                  onDeleteTask={() => {}}
                  canEdit={canEditTask(activeTask)}
                  canDelete={canDeleteTask(activeTask)}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <TaskListView
          tasks={filteredTasks}
          isLoading={isLoading}
          error={error}
          onLogEffort={handleLogEffort}
          onDeleteTask={confirmDeleteTask}
          canEditTask={canEditTask}
          canDeleteTask={canDeleteTask}
        />
      )}

      <EffortLogDialog open={effortLogOpen} onOpenChange={setEffortLogOpen} onSubmit={handleEffortSubmit} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Sil</DialogTitle>
            <DialogDescription>Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
              {isDeleting ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

