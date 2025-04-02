"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PlusCircle,
  Search,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Hourglass,
  Filter,
  X,
  Eye,
  Crown,
} from "lucide-react"
import Link from "next/link"
import { format, isAfter, isBefore, addDays } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface User {
  id: number
  name: string
  email: string
  role: string
  avatar_url?: string
}

interface TaskAssignee {
  id: number
  task_id: number
  user_id: number
  role: string
  user?: User
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
  work_size: number
  team_id: number
  creator_id: number
  assignees: TaskAssignee[]
  creator?: User
}

export default function TeamTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("deadline")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [activeTab, setActiveTab] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const isOverdue = (task: Task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    return completionDate < today && task.status !== "Completed"
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch users in the team
        const usersData = await api.get("/users")
        setUsers(usersData)

        // Fetch team tasks
        const tasksData = await api.get(`/tasks?team_id=${user?.team_id}`)

        // Add user details to assignees and creator
        const tasksWithUserDetails = tasksData.map((task: Task) => {
          // Add assignee details
          const assigneesWithUsers = task.assignees.map((assignee) => {
            const assigneeUser = usersData.find((u: User) => u.id === assignee.user_id)
            return {
              ...assignee,
              user: assigneeUser,
            }
          })

          // Add creator details
          const creator = usersData.find((u: User) => u.id === task.creator_id)

          return {
            ...task,
            assignees: assigneesWithUsers,
            creator,
          }
        })

        setTasks(tasksWithUserDetails)
      } catch (err: any) {
        setError(err.message || "Ekip görevleri yüklenirken hata oluştu")
        toast.error("Ekip görevleri yüklenirken hata oluştu")
        console.error("Ekip görevleri yüklenirken hata:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.team_id) {
      fetchData()
    }
  }, [user?.team_id])

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // Apply tab filter first
    if (activeTab === "active") {
      result = result.filter((task) => task.status === "In Progress")
    } else if (activeTab === "upcoming") {
      const today = new Date()
      const nextWeek = addDays(today, 7)
      result = result.filter((task) => {
        const dueDate = new Date(task.completion_date)
        return (
          isAfter(dueDate, today) &&
          isBefore(dueDate, nextWeek) &&
          task.status !== "Completed" &&
          task.status !== "Cancelled"
        )
      })
    } else if (activeTab === "overdue") {
      result = result.filter((task) => isOverdue(task))
    } else if (activeTab === "completed") {
      result = result.filter((task) => task.status === "Completed")
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((task) => task.description.toLowerCase().includes(query))
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((task) => task.status === statusFilter)
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.priority === priorityFilter)
    }

    // Apply assignee filter
    if (assigneeFilter !== "all") {
      const assigneeId = Number.parseInt(assigneeFilter)
      result = result.filter((task) => task.assignees.some((assignee) => assignee.user_id === assigneeId))
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "deadline") {
        return sortOrder === "asc"
          ? new Date(a.completion_date).getTime() - new Date(b.completion_date).getTime()
          : new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
      } else if (sortBy === "priority") {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 }
        return sortOrder === "asc"
          ? (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) -
              (priorityOrder[b.priority as keyof typeof priorityOrder] || 0)
          : (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
              (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
      } else if (sortBy === "workSize") {
        return sortOrder === "asc" ? a.work_size - b.work_size : b.work_size - a.work_size
      } else if (sortBy === "progress") {
        const progressA = a.planned_labor > 0 ? (a.actual_labor / a.planned_labor) * 100 : 0
        const progressB = b.planned_labor > 0 ? (b.actual_labor / b.planned_labor) * 100 : 0
        return sortOrder === "asc" ? progressA - progressB : progressB - progressA
      }
      return 0
    })

    return result
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, sortBy, sortOrder, activeTab])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="h-3.5 w-3.5" />
      case "In Progress":
        return <Hourglass className="h-3.5 w-3.5" />
      case "Paused":
        return <AlertTriangle className="h-3.5 w-3.5" />
      case "Not Started":
        return <Clock className="h-3.5 w-3.5" />
      case "Cancelled":
        return <X className="h-3.5 w-3.5" />
      default:
        return <Clock className="h-3.5 w-3.5" />
    }
  }

  const getTaskProgress = (task: Task) => {
    if (task.planned_labor === 0) return 0
    const progress = (task.actual_labor / task.planned_labor) * 100
    return Math.min(progress, 100) // Cap at 100%
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500"
    if (progress >= 75) return "bg-emerald-500"
    if (progress >= 50) return "bg-amber-500"
    if (progress >= 25) return "bg-orange-500"
    return "bg-red-500"
  }

  const getTimeRemaining = (task: Task) => {
    const today = new Date()
    const dueDate = new Date(task.completion_date)

    if (isOverdue(task)) {
      const diffTime = Math.abs(today.getTime() - dueDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return `${diffDays} gün gecikmiş`
    }

    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Bugün son gün"
    if (diffDays === 1) return "Yarın son gün"
    return `${diffDays} gün kaldı`
  }

  const getTimeRemainingColor = (task: Task) => {
    if (isOverdue(task)) return "text-red-500"

    const today = new Date()
    const dueDate = new Date(task.completion_date)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 2) return "text-red-500"
    if (diffDays <= 5) return "text-amber-500"
    return "text-green-500"
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setAssigneeFilter("all")
    setSortBy("deadline")
    setSortOrder("asc")
  }

  const taskCountByStatus = {
    all: tasks.length,
    active: tasks.filter((task) => task.status === "In Progress").length,
    upcoming: tasks.filter((task) => {
      const today = new Date()
      const nextWeek = addDays(today, 7)
      const dueDate = new Date(task.completion_date)
      return (
        isAfter(dueDate, today) &&
        isBefore(dueDate, nextWeek) &&
        task.status !== "Completed" &&
        task.status !== "Cancelled"
      )
    }).length,
    overdue: tasks.filter((task) => isOverdue(task)).length,
    completed: tasks.filter((task) => task.status === "Completed").length,
  }

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ekip Görevleri</h1>
          <p className="text-muted-foreground mt-1">Ekibinizin tüm görevlerini görüntüleyin ve yönetin</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
            <Filter className="mr-2 h-4 w-4" />
            Filtreler
          </Button>

          <Link href="/tasks/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Görev
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
          <TabsTrigger value="all" className="relative">
            Tümü
            <Badge variant="secondary" className="ml-1 text-xs">
              {taskCountByStatus.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktif
            <Badge variant="secondary" className="ml-1 text-xs">
              {taskCountByStatus.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Yaklaşan
            <Badge variant="secondary" className="ml-1 text-xs">
              {taskCountByStatus.upcoming}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Gecikmiş
            <Badge variant="secondary" className="ml-1 text-xs">
              {taskCountByStatus.overdue}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Tamamlanan
            <Badge variant="secondary" className="ml-1 text-xs">
              {taskCountByStatus.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mb-4 overflow-hidden"
            >
              <Card>
                <CardContent className="pt-6 pb-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Görevlerde ara..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Durum</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Durum" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tüm Durumlar</SelectItem>
                            <SelectItem value="Not Started">Başlamadı</SelectItem>
                            <SelectItem value="In Progress">Devam Ediyor</SelectItem>
                            <SelectItem value="Paused">Duraklatıldı</SelectItem>
                            <SelectItem value="Completed">Tamamlandı</SelectItem>
                            <SelectItem value="Cancelled">İptal Edildi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Öncelik</label>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                          <SelectTrigger>
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

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Görevli</label>
                        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                          <SelectTrigger>
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

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Sıralama</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sıralama" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deadline">Son Tarih</SelectItem>
                            <SelectItem value="priority">Öncelik</SelectItem>
                            <SelectItem value="workSize">İş Büyüklüğü</SelectItem>
                            <SelectItem value="progress">İlerleme</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Filtreleri Sıfırla
                      </Button>
                      <Button variant="outline" size="sm" onClick={toggleSortOrder}>
                        {sortOrder === "asc" ? "Artan" : "Azalan"}
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="hidden md:block md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtreler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Görevlerde ara..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Durum</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Durum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Durumlar</SelectItem>
                        <SelectItem value="Not Started">Başlamadı</SelectItem>
                        <SelectItem value="In Progress">Devam Ediyor</SelectItem>
                        <SelectItem value="Paused">Duraklatıldı</SelectItem>
                        <SelectItem value="Completed">Tamamlandı</SelectItem>
                        <SelectItem value="Cancelled">İptal Edildi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Öncelik</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
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

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Görevli</label>
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                      <SelectTrigger>
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

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Sıralama</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sıralama" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deadline">Son Tarih</SelectItem>
                        <SelectItem value="priority">Öncelik</SelectItem>
                        <SelectItem value="workSize">İş Büyüklüğü</SelectItem>
                        <SelectItem value="progress">İlerleme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Filtreleri Sıfırla
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleSortOrder}>
                    {sortOrder === "asc" ? "Artan" : "Azalan"}
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            <TabsContent value="all" className="m-0">
              <TaskList tasks={filteredTasks} isLoading={isLoading} error={error} emptyMessage="Görev bulunamadı." />
            </TabsContent>

            <TabsContent value="active" className="m-0">
              <TaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                error={error}
                emptyMessage="Aktif görev bulunamadı."
              />
            </TabsContent>

            <TabsContent value="upcoming" className="m-0">
              <TaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                error={error}
                emptyMessage="Yaklaşan görev bulunamadı."
              />
            </TabsContent>

            <TabsContent value="overdue" className="m-0">
              <TaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                error={error}
                emptyMessage="Gecikmiş görev bulunamadı."
              />
            </TabsContent>

            <TabsContent value="completed" className="m-0">
              <TaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                error={error}
                emptyMessage="Tamamlanan görev bulunamadı."
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </AppShell>
  )

  function TaskList({
    tasks,
    isLoading,
    error,
    emptyMessage,
  }: {
    tasks: Task[]
    isLoading: boolean
    error: string
    emptyMessage: string
  }) {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex flex-col space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-2 w-full mt-2" />
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex space-x-1">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Hata: {error}</p>
          </CardContent>
        </Card>
      )
    }

    if (tasks.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 bg-muted rounded-full w-12 h-12 flex items-center justify-center">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
            <p className="text-muted-foreground mb-4">
              Filtreleri değiştirerek daha fazla görev görüntüleyebilirsiniz.
            </p>
            <Button variant="outline" onClick={resetFilters}>
              Filtreleri Sıfırla
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`overflow-hidden ${isOverdue(task) ? "border-red-300 dark:border-red-800" : ""}`}>
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-lg line-clamp-2">{task.description}</h3>
                      <div className="flex items-center space-x-2">
                      {task.creator?.role === 'manager' && (
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
                        <Badge variant={getPriorityColor(task.priority) as any} className="flex items-center gap-1">
                          {task.priority === "High" ? "Yüksek" : task.priority === "Medium" ? "Orta" : "Düşük"}
                        </Badge>
                        <Badge variant={getStatusColor(task.status) as any} className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
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
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex items-center text-sm text-muted-foreground space-x-4">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          <span>Başlangıç: {format(new Date(task.start_date), "dd MMM yyyy")}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          <span>Bitiş: {format(new Date(task.completion_date), "dd MMM yyyy")}</span>
                        </div>
                      </div>

                      <div className={`text-sm font-medium ${getTimeRemainingColor(task)}`}>
                        {getTimeRemaining(task)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>İlerleme</span>
                        <span>{Math.round(getTaskProgress(task))}%</span>
                      </div>
                      <Progress
                        value={getTaskProgress(task)}
                        className="h-2"
                        indicatorClassName={getProgressColor(getTaskProgress(task))}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="flex -space-x-2 mr-3">
                          {task.assignees
                            .filter((a) => a.role === "assignee" || a.role === "partner")
                            .slice(0, 3)
                            .map((assignee, i) => (
                              <Avatar key={i} className="h-8 w-8 border-2 border-background">
                                {assignee.user?.avatar_url ? (
                                  <AvatarImage src={assignee.user.avatar_url} alt={assignee.user.name} />
                                ) : (
                                  <AvatarFallback>
                                    {assignee.user?.name ? getInitials(assignee.user.name) : "U"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            ))}
                          {task.assignees.filter((a) => a.role === "assignee" || a.role === "partner").length > 3 && (
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarFallback>
                                +
                                {task.assignees.filter((a) => a.role === "assignee" || a.role === "partner").length - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        {task.creator && (
                          <div className="text-xs text-muted-foreground">Oluşturan: {task.creator.name}</div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/tasks/${task.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Görüntüle</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }
}

