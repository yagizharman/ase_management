"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusCircle, Search } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface User {
  id: number
  name: string
}

interface TaskAssignee {
  id: number
  task_id: number
  user_id: number
  role: string
  user?: User
}

interface Task {
  id: number
  description: string
  priority: string
  status: string
  completion_date: string
  start_date: string
  assignees: TaskAssignee[]
}

export default function TeamTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch users in the team
        const usersData = await api.get("/users")
        const teamUsers = usersData.filter((u: User & { team_id: number }) => u.team_id === user?.team_id)
        setUsers(teamUsers)

        // Fetch team tasks
        const tasksData = await api.get(`/tasks?team_id=${user?.team_id}`)

        // Add user details to assignees
        const tasksWithUserDetails = tasksData.map((task: Task) => {
          const assigneesWithUsers = task.assignees.map((assignee) => {
            const assigneeUser = usersData.find((u: User) => u.id === assignee.user_id)
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
        setError(err.message || "Ekip görevleri yüklenirken hata oluştu")
        console.error("Ekip görevleri yüklenirken hata:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.team_id) {
      fetchData()
    }
  }, [user?.team_id])

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
        result = result.filter((task) => {
          const completionDate = new Date(task.completion_date)
          completionDate.setHours(23, 59, 59, 999) // Set to end of the day
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Set to start of the day
          return completionDate < today && task.status !== "Completed"
        })
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

    // Assignee filter
    if (assigneeFilter !== "all") {
      const assigneeId = Number.parseInt(assigneeFilter)
      result = result.filter((task) => task.assignees.some((assignee) => assignee.user_id === assigneeId))
    }

    setFilteredTasks(result)
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
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
        return "info"
      case "Paused":
        return "warning"
      case "Not Started":
        return "secondary"
      case "Cancelled":
        return "destructive"
      default:
        return "secondary"
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
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Ekip Görevleri</h1>
        <Link href="/tasks/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Görev
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Görevlerde ara..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
                  <SelectItem value="upcoming">Yaklaşan</SelectItem>
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

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Görevli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Görevliler</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-[250px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center text-destructive">Hata: {error}</CardContent>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Filtrelere uygun görev bulunamadı.
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className={isOverdue(task) ? "border-destructive" : ""}>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="space-y-1">
                    <h4 className="font-medium">{task.description}</h4>
                    <div className="flex items-center text-sm text-muted-foreground">
                      Bitiş: {format(new Date(task.completion_date), "dd MMM yyyy")}
                      {isOverdue(task) && (
                        <Badge variant="destructive" className="ml-2">
                          Gecikmiş
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getPriorityColor(task.priority) as any}>
                      {task.priority === "High" ? "Yüksek" : task.priority === "Medium" ? "Orta" : "Düşük"}
                    </Badge>
                    <Badge variant={getStatusColor(task.status) as any}>
                      {task.status === "Not Started"
                        ? "Başlamadı"
                        : task.status === "In Progress"
                          ? "Devam Ediyor"
                          : task.status === "Paused"
                            ? "Duraklatıldı"
                            : task.status === "Completed"
                              ? "Tamamlandı"
                              : "İptal Edildi"}
                    </Badge>
                    <div className="flex -space-x-2">
                      {task.assignees
                        .filter((a) => a.role === "assignee" || a.role === "partner")
                        .slice(0, 3)
                        .map((assignee) => (
                          <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-[10px]">
                              {assignee.user?.name ? getInitials(assignee.user.name) : "K"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      {task.assignees.filter((a) => a.role === "assignee" || a.role === "partner").length > 3 && (
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[10px]">
                            +{task.assignees.filter((a) => a.role === "assignee" || a.role === "partner").length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <Link href={`/tasks/${task.id}`}>
                      <Button variant="ghost" size="sm">
                        Görüntüle
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  )
}

