"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Calendar, ShieldAlert, Clock, CheckCircle2, AlertTriangle, Timer, ArrowRight } from "lucide-react"
import Link from "next/link"
import { format, differenceInDays } from "date-fns"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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
  creator_id: number
  planned_labor: number
  actual_labor: number
  work_size: number
  team_id: number
  creator?: {
    id: number
    name: string
    role: string
  }
  assignees: TaskAssignee[]
}

export default function YearlyTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"cards" | "detailed">("cards")

  // Generate year options (current year and 5 years back)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString())

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)

        // Fetch all tasks for the user
        const response = await api.get(`/users/${user?.id}/tasks`)

        // Fetch users to get creator details
        const usersData = await api.get("/users")

        // Add creator details to tasks
        const tasksWithCreators = response.map((task: Task) => {
          const creator = usersData.find((u: any) => u.id === task.creator_id)

          // Add user details to assignees
          const assigneesWithUsers = task.assignees.map((assignee) => {
            const assigneeUser = usersData.find((u: any) => u.id === assignee.user_id)
            return {
              ...assignee,
              user: assigneeUser,
            }
          })

          return {
            ...task,
            creator,
            assignees: assigneesWithUsers,
          }
        })

        setTasks(tasksWithCreators)
      } catch (err: any) {
        setError(err.message || "Görevler yüklenirken hata oluştu")
        toast.error("Görevler yüklenirken hata oluştu")
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
    // Filter tasks by year, status, priority and search query
    const selectedYear = Number.parseInt(yearFilter)

    let result = tasks.filter((task) => {
      const taskYear = new Date(task.start_date).getFullYear()
      return taskYear === selectedYear
    })

    // Apply status filter
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

    // Apply priority filter
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.priority === priorityFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((task) => task.description.toLowerCase().includes(query))
    }

    setFilteredTasks(result)
  }, [tasks, yearFilter, statusFilter, priorityFilter, searchQuery])

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Completed":
        return "Tamamlandı"
      case "In Progress":
        return "Devam Ediyor"
      case "Paused":
        return "Duraklatıldı"
      case "Not Started":
        return "Başlamadı"
      case "Cancelled":
        return "İptal Edildi"
      default:
        return status
    }
  }

  const isCreatedByManager = (task: Task) => {
    return task.creator?.role === "manager"
  }

  const isOverdue = (task: Task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    return completionDate < today && task.status !== "Completed"
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getTaskDuration = (task: Task) => {
    const startDate = new Date(task.start_date)
    const endDate = new Date(task.completion_date)
    return differenceInDays(endDate, startDate) + 1 // +1 to include both start and end days
  }

  const getEfficiencyRate = (task: Task) => {
    if (task.planned_labor === 0) return 0
    return Math.round((task.actual_labor / task.planned_labor) * 100)
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Yıllık Görevler</h1>
        <div className="flex gap-2">
          <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" onClick={() => setViewMode("cards")}>
            Kartlar
          </Button>
          <Button
            variant={viewMode === "detailed" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("detailed")}
          >
            Detaylı Görünüm
          </Button>
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
            <div className="flex flex-wrap gap-2">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Yıla Göre Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">Hata: {error}</CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Seçilen yıl için görev bulunamadı.
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className={isOverdue(task) ? "border-destructive" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {task.description}
                      {isCreatedByManager(task) && (
                        <ShieldAlert className="h-4 w-4 text-amber-500" title="Yönetici tarafından oluşturuldu" />
                      )}
                    </CardTitle>
                    <CardDescription>Oluşturan: {task.creator?.name || `Kullanıcı ${task.creator_id}`}</CardDescription>
                  </div>
                  <Badge variant={getPriorityColor(task.priority) as any}>{getPriorityLabel(task.priority)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(new Date(task.start_date), "d MMM")} -{" "}
                        {format(new Date(task.completion_date), "d MMM yyyy")}
                      </span>
                    </div>
                    <Badge variant={getStatusColor(task.status) as any}>{getStatusLabel(task.status)}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">İş Büyüklüğü:</span>
                      <span className="font-medium">{task.work_size}/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Planlanan İş Saati:</span>
                      <span className="font-medium">{task.planned_labor} saat</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gerçekleşen İş Saati:</span>
                      <span className="font-medium">{task.actual_labor} saat</span>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">İlerleme:</span>
                        <span
                          className={`font-medium ${getEfficiencyRate(task) > 100 ? "text-destructive" : "text-green-600"}`}
                        >
                          {getEfficiencyRate(task)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(getEfficiencyRate(task), 100)}
                        className="h-2"
                        indicatorClassName={getEfficiencyRate(task) > 100 ? "bg-destructive" : ""}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {task.assignees
                        .filter((a) => a.role === "assignee" || a.role === "partner")
                        .slice(0, 3)
                        .map((assignee, i) => (
                          <Avatar key={i} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-[10px]">
                              {assignee.user?.name ? getInitials(assignee.user.name) : "U"}
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
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/tasks/${task.id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    Detayları Görüntüle
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className={isOverdue(task) ? "border-destructive" : ""}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Task description and badges */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{task.description}</h3>
                      {isCreatedByManager(task) && (
                        <ShieldAlert className="h-4 w-4 text-amber-500" title="Yönetici tarafından oluşturuldu" />
                      )}
                      {isOverdue(task) && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Gecikmiş
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant={getPriorityColor(task.priority) as any}>{getPriorityLabel(task.priority)}</Badge>
                      <Badge variant={getStatusColor(task.status) as any} className="flex items-center gap-1">
                        {task.status === "Completed" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : task.status === "In Progress" ? (
                          <Timer className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {format(new Date(task.start_date), "d MMM yyyy")} -{" "}
                        {format(new Date(task.completion_date), "d MMM yyyy")}
                      </div>
                      <div>Süre: {getTaskDuration(task)} gün</div>
                    </div>
                  </div>

                  {/* Task details */}
                  <div className="md:col-span-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">İş Büyüklüğü:</span>
                      <span className="font-medium">{task.work_size}/5</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Planlanan İş Saati:</span>
                      <span className="font-medium">{task.planned_labor} saat</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Gerçekleşen İş Saati:</span>
                      <span className="font-medium">{task.actual_labor} saat</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Verimlilik:</span>
                      <span
                        className={`font-medium ${getEfficiencyRate(task) > 100 ? "text-destructive" : "text-green-600"}`}
                      >
                        {getEfficiencyRate(task)}%
                      </span>
                    </div>
                    <div className="pt-1">
                      <Progress
                        value={Math.min(getEfficiencyRate(task), 100)}
                        className="h-2"
                        indicatorClassName={getEfficiencyRate(task) > 100 ? "bg-destructive" : ""}
                      />
                    </div>
                  </div>

                  {/* Assignees and actions */}
                  <div className="md:col-span-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Görevliler:</div>
                      <div className="flex flex-wrap gap-1">
                        {task.assignees
                          .filter((a) => a.role === "assignee" || a.role === "partner")
                          .map((assignee, i) => (
                            <div key={i} className="flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-md">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[8px]">
                                  {assignee.user?.name ? getInitials(assignee.user.name) : "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{assignee.user?.name || `Kullanıcı ${assignee.user_id}`}</span>
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                {assignee.role === "assignee" ? "Görevli" : "Ortak"}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Link href={`/tasks/${task.id}`}>
                        <Button variant="outline" size="sm">
                          Detayları Görüntüle
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}

