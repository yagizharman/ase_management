"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, MoreHorizontal, Users, Crown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { tasksAPI, notificationsAPI, usersAPI } from "@/lib/api"
import type { Task, User } from "@/lib/types"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import TaskModal from "@/components/task-modal"
import PartnerTaskModal from "@/components/partner-task-modal"

interface KanbanBoardProps {
  tasks: Task[]
  onTaskUpdated?: () => void
  showEmptyColumns?: boolean
}

interface TasksByStatus {
  [key: string]: Task[]
}

interface EnhancedTask extends Task {
  creatorName?: string
  assigneeName?: string
  partners?: { id: number; name: string }[]
}

export default function KanbanBoard({ tasks, onTaskUpdated, showEmptyColumns = true }: KanbanBoardProps) {
  const { user } = useAuth()
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>({})
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingPartnerTask, setEditingPartnerTask] = useState<{task: Task, partnerInfo: any} | null>(null)
  const [enhancedTasks, setEnhancedTasks] = useState<EnhancedTask[]>([])
  const [users, setUsers] = useState<{ [key: number]: User }>({})
  const [isLoading, setIsLoading] = useState(true)

  const canEditTask = (task: Task) => {
    return task.CreatedByUserId === user?.UserId
  }

  const canUpdateTask = (task: Task) => {
    return task.CreatedByUserId === user?.UserId || 
           task.AssignedToUserId === user?.UserId ||
           task.Partners?.some(partner => partner.UserId === user?.UserId)
  }

  const isPartnerOnly = (task: Task) => {
    return task.CreatedByUserId !== user?.UserId && 
           task.AssignedToUserId !== user?.UserId &&
           task.Partners?.some(partner => partner.UserId === user?.UserId)
  }

  const getPartnerInfo = (task: Task) => {
    return task.Partners?.find(partner => partner.UserId === user?.UserId)
  }

  // Status columns in the desired order
  const statusColumns = [
    { id: "Not Started", title: "Başlanmadı" },
    { id: "In Progress", title: "Devam Ediyor" },
    { id: "On Hold", title: "Duraklatıldı" },
    { id: "Completed", title: "Tamamlandı" },
  ]

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await usersAPI.getAllUsers()
        const usersMap = allUsers.reduce((acc: { [key: number]: User }, user: User) => {
          acc[user.UserId] = user
          return acc
        }, {})
        setUsers(usersMap)
        return usersMap
      } catch (error) {
        console.error("Kullanıcılar alınamadı:", error)
        return {}
      }
    }

    const enhanceTasksWithUserInfo = async (usersMap: { [key: number]: User }) => {
      return Promise.all(
        tasks.map(async (task) => {
          const enhancedTask: EnhancedTask = { ...task }

          // Add creator name
          if (task.CreatedByUserId && usersMap[task.CreatedByUserId]) {
            enhancedTask.creatorName = usersMap[task.CreatedByUserId].FullName
          }

          // Add assignee name
          if (task.AssignedToUserId && usersMap[task.AssignedToUserId]) {
            enhancedTask.assigneeName = usersMap[task.AssignedToUserId].FullName
          }

          // Add partners with their names
          if (task.Partners && task.Partners.length > 0) {
            enhancedTask.partners = task.Partners.map(partner => ({
              id: partner.UserId,
              name: usersMap[partner.UserId]?.FullName || "Bilinmiyor"
            }))
          } else {
            enhancedTask.partners = []
          }

          return enhancedTask
        }),
      )
    }

    const loadData = async () => {
      setIsLoading(true)
      const usersMap = await fetchUsers()
      const enhanced = await enhanceTasksWithUserInfo(usersMap)
      setEnhancedTasks(enhanced)
      setIsLoading(false)
    }

    loadData()
  }, [tasks])

  useEffect(() => {
    // Group tasks by status
    const grouped = enhancedTasks.reduce((acc: TasksByStatus, task) => {
      const status = task.Status || "Not Started"
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(task)
      return acc
    }, {})

    // Ensure all status columns exist even if empty
    if (showEmptyColumns) {
      statusColumns.forEach((column) => {
        if (!grouped[column.id]) {
          grouped[column.id] = []
        }
      })
    }

    setTasksByStatus(grouped)
  }, [enhancedTasks, showEmptyColumns])

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

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    // If dropped outside a droppable area
    if (!destination) {
      return
    }

    // If dropped in the same place
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Find the task that was dragged
    const taskId = Number.parseInt(draggableId)
    const task = tasks.find((t) => t.TaskId === taskId)

    if (!task || !canUpdateTask(task)) {
      return
    }

    // Update task status
    const newStatus = destination.droppableId

    try {
      // Update local state first for immediate feedback
      const sourceList = [...(tasksByStatus[source.droppableId] || [])]
      const destList = [...(tasksByStatus[destination.droppableId] || [])]

      const [removed] = sourceList.splice(source.index, 1)
      const movedTask = { ...removed, Status: newStatus }
      destList.splice(destination.index, 0, movedTask)

      setTasksByStatus({
        ...tasksByStatus,
        [source.droppableId]: sourceList,
        [destination.droppableId]: destList,
      })

      // Update in the API
      await tasksAPI.updateTask(taskId, {
        task_update: {
          Status: newStatus
        }
      }, user!.UserId)

      // Create notification for task status change
      if (user && task.CreatedByUserId !== user.UserId) {
        await notificationsAPI.createNotification(taskId, user.UserId, task.CreatedByUserId, "update")
      }

      toast.success(`Görev durumu "${statusColumns.find((col) => col.id === newStatus)?.title}" olarak güncellendi`)

      if (onTaskUpdated) {
        onTaskUpdated()
      }
    } catch (error) {
      console.error("Görev durumu güncellenemedi:", error)
      toast.error("Görev durumu güncellenemedi")

      // Revert the local state change
      if (onTaskUpdated) {
        onTaskUpdated()
      }
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusColumns.map((column) => (
          <div key={column.id} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="font-medium text-sm">{column.title}</h3>
              <Badge variant="outline">0</Badge>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 flex-1 min-h-[200px]">
              <Card className="mb-2 opacity-50">
                <CardContent className="p-3 h-[100px]"></CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="kanban-board">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusColumns.map((column) => (
            <div key={column.id} className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-medium text-sm">{column.title}</h3>
                <Badge variant="outline">{tasksByStatus[column.id]?.length || 0}</Badge>
              </div>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-muted/50 rounded-lg p-2 flex-1 min-h-[200px] overflow-y-auto"
                  >
                    {tasksByStatus[column.id]?.map((task, index) => (
                      <Draggable
                        key={task.TaskId?.toString()}
                        draggableId={task.TaskId?.toString() || ""}
                        index={index}
                        isDragDisabled={!canUpdateTask(task)}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-2 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <CardContent className="p-3">
                              <div className="space-y-2">
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
                                      {isPartnerOnly(task) && (
                                        <DropdownMenuItem onClick={() => setEditingPartnerTask({task, partnerInfo: getPartnerInfo(task)})}>
                                          Partner Bilgilerini Güncelle
                                        </DropdownMenuItem>
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

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <Badge variant={getPriorityColor(task.Priority) as any}>{task.Priority}</Badge>
                                  <Badge variant={getStatusColor(task.Status) as any}>{task.Status}</Badge>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center">
                                    <Clock className="mr-1 h-3 w-3" />
                                    <span>
                                      {formatDistanceToNow(new Date(task.DueDate), { addSuffix: true, locale: tr })}
                                    </span>
                                  </div>
                                  <div>
                                    {task.SpentHours || 0}/{task.PlannedHours} saat
                                  </div>
                                </div>

                                <div className="border-t pt-2 mt-2">
                                  <div className="flex justify-between items-center">
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Oluşturan: </span>
                                      <span className="font-medium">
                                        {(task as EnhancedTask).creatorName || "Bilinmiyor"}
                                      </span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Atanan: </span>
                                      <span className="font-medium">
                                        {(task as EnhancedTask).assigneeName || "Bilinmiyor"}
                                      </span>
                                    </div>
                                  </div>

                                  {task.Partners && task.Partners.length > 0 && (
                                    <div className="flex items-center mt-1 text-xs">
                                      <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                                      <span className="text-muted-foreground mr-1">İş Ortakları:</span>
                                      <div className="flex -space-x-2">
                                        {task.Partners.map((partner) => {
                                          const partnerUser = users[partner.UserId]
                                          return (
                                            <Avatar key={partner.UserId} className="h-4 w-4 border border-background">
                                              <AvatarFallback className="text-[8px]">
                                                {partnerUser?.FullName
                                                  ?.split(" ")
                                                  .map((n) => n[0])
                                                  .join("") || "?"}
                                              </AvatarFallback>
                                            </Avatar>
                                          )
                                        })}
                                      </div>
                                      {task.Partners.some(p => p.UserId === user?.UserId) && (
                                        <Badge variant="outline" className="ml-2 text-[10px] h-4">
                                          Partner
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

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

      {editingPartnerTask && (
        <PartnerTaskModal
          open={!!editingPartnerTask}
          onOpenChange={() => setEditingPartnerTask(null)}
          task={editingPartnerTask.task}
          partnerInfo={editingPartnerTask.partnerInfo}
          onTaskUpdated={() => {
            toast.success("Partner bilgileri başarıyla güncellendi")
            setEditingPartnerTask(null)
            if (onTaskUpdated) {
              onTaskUpdated()
            }
          }}
        />
      )}
    </div>
  )
}

