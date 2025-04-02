"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { tr } from "date-fns/locale"
import { addDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  type TooltipProps,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Calendar,
  Clock,
  BarChart2,
  PieChartIcon,
  CalendarDays,
  Timer,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface User {
  id: number;
  name: string;
  role: string;
  team_id: number;
}

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
  work_size: number
  assignees: TaskAssignee[]
  creator_id: number
  team_id: number
  created_at: string
}

interface DailyDistribution {
  date: string
  planned_labor: number
  actual_labor: number
  remaining_labor: number
  tasks: Task[]
}

interface OptimizationResult {
  user_id: number
  user_name: string
  daily_distribution: DailyDistribution[]
}

interface OptimizationResponse {
  user_id: number
  user_name: string
  daily_distribution: DailyDistribution[]
}

export default function TaskAnalyticsPage() {
  const { user } = useAuth() as { user: User | null }
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState("")

  // Filters and sorting
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [timeRangePreset, setTimeRangePreset] = useState<string>("month")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("completion_date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [optimizationParam, setOptimizationParam] = useState<string>("priority")
  const [viewMode, setViewMode] = useState<string>("optimize")

  // Fetch team members if user is a manager
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user?.id || user.role !== 'manager') return

      try {
        const response = await api.get(`/teams/${user.team_id}/members`)
        setTeamMembers(response)
      } catch (err: any) {
        console.error("Error fetching team members:", err)
        toast.error("Takım üyeleri yüklenirken hata oluştu")
      }
    }

    fetchTeamMembers()
  }, [user?.id, user?.role])

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.id) return

      try {
        setIsLoading(true)
        setError("")

        // Fetch all users first
        const usersData = await api.get("/users")
        
        // If user is a manager, get all team members
        if (user.role === 'manager') {
          const teamUsers = usersData.filter((u: any) => u.team_id === user.team_id)
          setTeamMembers(teamUsers)
        }

        // Fetch tasks based on user role and selection
        let tasksData
        if (user.role === 'manager') {
          // For managers, fetch all team tasks
          tasksData = await api.get(`/tasks?team_id=${user.team_id}`)
        } else {
          // For regular users, fetch only their tasks
          tasksData = await api.get(`/users/${user.id}/tasks`)
        }

        // Add user details to assignees
        const tasksWithUserDetails = tasksData.map((task: Task) => {
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

        // Filter tasks if a specific user is selected (for managers)
        if (user.role === 'manager' && selectedUserId) {
          const filteredTasks = tasksWithUserDetails.filter(task => 
            task.assignees.some(assignee => assignee.user_id === selectedUserId)
          )
          setTasks(filteredTasks)
        } else {
          setTasks(tasksWithUserDetails)
        }

      } catch (err: any) {
        console.error("Error fetching tasks:", err)
        setError(err.message || "Görevler yüklenirken hata oluştu")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [user?.id, user?.role, user?.team_id, selectedUserId])

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setTimeRangePreset(value)
    const now = new Date()

    let from: Date
    let to: Date = now

    switch (value) {
      case "week":
        from = startOfWeek(now, { weekStartsOn: 1 }) // Monday as start of week
        to = endOfWeek(now, { weekStartsOn: 1 })
        break
      case "month":
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case "quarter":
        from = addDays(now, -90) // Roughly 3 months back
        break
      case "year":
        from = addDays(now, -365) // 1 year back
        break
      case "custom":
        // Keep the current date range
        return
      default:
        from = subDays(now, 30)
    }

    setDateRange({ from, to })
  }

  // Apply filters and sorting
  useEffect(() => {
    if (!tasks.length) return

    let result = [...tasks]

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      const fromDate = new Date(dateRange.from)
      const toDate = new Date(dateRange.to)

      // Set time to beginning and end of day for accurate comparison
      fromDate.setHours(0, 0, 0, 0)
      toDate.setHours(23, 59, 59, 999)

      result = result.filter((task) => {
        const taskDate = new Date(task.start_date)
        return taskDate >= fromDate && taskDate <= toDate
      })
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((task) => task.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.priority === priorityFilter)
    }

    // Sorting
    result.sort((a, b) => {
      let valueA, valueB

      switch (sortBy) {
        case "priority":
          const priorityValues = { High: 3, Medium: 2, Low: 1 }
          valueA = priorityValues[a.priority as keyof typeof priorityValues] || 0
          valueB = priorityValues[b.priority as keyof typeof priorityValues] || 0
          break
        case "work_size":
          valueA = a.work_size || 0
          valueB = b.work_size || 0
          break
        case "planned_labor":
          valueA = a.planned_labor || 0
          valueB = b.planned_labor || 0
          break
        case "actual_labor":
          valueA = a.actual_labor || 0
          valueB = b.actual_labor || 0
          break
        case "completion_date":
          valueA = new Date(a.completion_date).getTime()
          valueB = new Date(b.completion_date).getTime()
          break
        case "start_date":
          valueA = new Date(a.start_date).getTime()
          valueB = new Date(b.start_date).getTime()
          break
        case "created_at":
          valueA = new Date(a.created_at).getTime()
          valueB = new Date(b.created_at).getTime()
          break
        default:
          valueA = new Date(a.completion_date).getTime()
          valueB = new Date(b.completion_date).getTime()
      }

      return sortOrder === "asc" ? (valueA > valueB ? 1 : -1) : valueA < valueB ? 1 : -1
    })

    setFilteredTasks(result)
  }, [tasks, dateRange, statusFilter, priorityFilter, sortBy, sortOrder])

  // Calculate task score based on multiple factors
  const calculateTaskScore = (task: Task) => {
    // Priority weights - much more dramatic differences
    const priorityWeights = {
      High: 1000,
      Medium: 100,
      Low: 10
    }

    // Status weights - bigger spread between states
    const statusWeights = {
      "In Progress": 500,
      "Not Started": 400,
      "Paused": 300,
      "Cancelled": -500
    }

    // Calculate days until deadline
    const daysUntilDeadline = Math.ceil(
      (new Date(task.completion_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calculate completion percentage
    const completionPercentage = task.actual_labor / task.planned_labor * 100

    // Calculate individual scores with more dramatic scaling
    const priorityScore = priorityWeights[task.priority as keyof typeof priorityWeights] || 0
    const statusScore = statusWeights[task.status as keyof typeof statusWeights] || 0
    const deadlineScore = Math.max(0, 1000 - (Math.max(daysUntilDeadline, 0) * 10)) // Much steeper deadline penalty
    const workSizeScore = task.work_size * 100 // Linear scaling with work size
    const completionScore = Math.max(0, 1000 - (completionPercentage * 10)) // Steeper completion penalty

    let finalScore = 0
    switch (optimizationParam) {
      case "priority":
        finalScore = priorityScore * 3 + deadlineScore * 0.5 + workSizeScore * 0.3
        break
      case "work_size":
        finalScore = workSizeScore * 3 + priorityScore * 0.5 + deadlineScore * 0.3
        break
      case "completion_date":
        finalScore = deadlineScore * 3 + priorityScore * 0.5 + workSizeScore * 0.3
        break
      default:
        finalScore = priorityScore + deadlineScore + workSizeScore
    }

    // Apply status modifier
    finalScore += statusScore

    return {
      task,
      score: finalScore,
      isCompleted: task.status === "Completed"
    }
  }

  // Optimize tasks
  const handleOptimize = async () => {
    if (!filteredTasks.length) {
      toast.error("Optimize edilecek görev bulunamadı")
      return
    }

    try {
      setIsOptimizing(true)
      setError("")

      // First, separate completed and non-completed tasks
      const completedTasks = filteredTasks.filter(task => task.status === "Completed")
      const nonCompletedTasks = filteredTasks.filter(task => task.status !== "Completed")

      // Score and sort non-completed tasks
      const scoredNonCompletedTasks = nonCompletedTasks
        .map(calculateTaskScore)
        .sort((a, b) => b.score - a.score)
        .map(scored => scored.task)

      // Sort completed tasks by the same criteria but keep them separate
      const scoredCompletedTasks = completedTasks
        .map(calculateTaskScore)
        .sort((a, b) => b.score - a.score)
        .map(scored => scored.task)

      // Combine tasks with completed tasks at the end
      const sortedTasks = [...scoredNonCompletedTasks, ...scoredCompletedTasks]

      // Group tasks by date and calculate workload distribution
      const dailyDistribution = sortedTasks.reduce((acc, task) => {
        const date = format(new Date(task.start_date), "yyyy-MM-dd")
        if (!acc[date]) {
          acc[date] = {
            date,
            planned_labor: 0,
            actual_labor: 0,
            remaining_labor: 0,
            tasks: [],
          }
        }
        acc[date].planned_labor += task.planned_labor
        acc[date].actual_labor += task.actual_labor
        acc[date].remaining_labor += task.planned_labor - task.actual_labor
        acc[date].tasks.push(task)
        return acc
      }, {} as Record<string, DailyDistribution>)

      // Create optimization result with tasks in the correct order
      setOptimizationResult([{
        user_id: user?.id || 0,
        user_name: user?.name || "",
        daily_distribution: [{
          date: format(new Date(), "yyyy-MM-dd"),
          planned_labor: sortedTasks.reduce((sum, task) => sum + task.planned_labor, 0),
          actual_labor: sortedTasks.reduce((sum, task) => sum + task.actual_labor, 0),
          remaining_labor: sortedTasks.reduce((sum, task) => sum + (task.planned_labor - task.actual_labor), 0),
          tasks: sortedTasks // Keep the sorted order
        }]
      }])

      const optimizationDescription = {
        priority: "Yüksek öncelikli ve yaklaşan görevler öncelikli olarak planlandı",
        work_size: "Büyük iş yüklü görevler ve öncelikli işler dengeli dağıtıldı",
        completion_date: "Yaklaşan son tarihli ve kritik görevler öne çekildi"
      }

      toast.success(
        `Görevler optimize edildi: ${optimizationDescription[optimizationParam as keyof typeof optimizationDescription]}`
      )
    } catch (err: any) {
      console.error("Error optimizing tasks:", err)
      setError(err.message || "Görevler optimize edilirken hata oluştu")
      toast.error("Optimizasyon sırasında bir hata oluştu")
    } finally {
      setIsOptimizing(false)
    }
  }

  // Helper functions for labels
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "default"
      case "Low":
        return "secondary"
      default:
        return "secondary"
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
      case "Not Started":
        return <Clock className="h-4 w-4" />
      case "In Progress":
        return <Timer className="h-4 w-4" />
      case "Paused":
        return <AlertTriangle className="h-4 w-4" />
      case "Completed":
        return <CheckCircle2 className="h-4 w-4" />
      case "Cancelled":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getOptimizationLabel = (param: string) => {
    switch (param) {
      case "priority":
        return "Öncelik"
      case "work_size":
        return "İş Büyüklüğü"
      case "completion_date":
        return "Tamamlanma Tarihi"
      default:
        return param
    }
  }

  const getSortLabel = (field: string) => {
    switch (field) {
      case "priority":
        return "Öncelik"
      case "work_size":
        return "İş Büyüklüğü"
      case "planned_labor":
        return "Planlanan İş Saati"
      case "actual_labor":
        return "Gerçekleşen İş Saati"
      case "completion_date":
        return "Tamamlanma Tarihi"
      case "start_date":
        return "Başlangıç Tarihi"
      case "created_at":
        return "Oluşturulma Tarihi"
      default:
        return field
    }
  }

  // Chart data preparation
  const tasksByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {
      "Not Started": 0,
      "In Progress": 0,
      Paused: 0,
      Completed: 0,
      Cancelled: 0,
    }

    filteredTasks.forEach((task) => {
      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status]++
      }
    })

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0) // Filter out zero values
      .map(([status, count]) => ({
        name: getStatusLabel(status),
        value: count,
        status,
      }))
  }, [filteredTasks])

  const tasksByPriority = useMemo(() => {
    const priorityCounts: Record<string, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    }

    filteredTasks.forEach((task) => {
      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority]++
      }
    })

    return Object.entries(priorityCounts)
      .filter(([_, count]) => count > 0) // Filter out zero values
      .map(([priority, count]) => ({
        name: getPriorityLabel(priority),
        value: count,
        priority,
      }))
  }, [filteredTasks])

  const laborDistribution = useMemo(() => {
    if (!optimizationResult) return []

    // Combine all daily distributions from all users
    const allDays = optimizationResult.flatMap(userResult => 
      userResult.daily_distribution.map(day => ({
        date: format(new Date(day.date), "dd MMM", { locale: tr }),
        plannedLabor: Number.parseFloat(day.planned_labor.toFixed(1)),
        actualLabor: Number.parseFloat(day.actual_labor.toFixed(1)),
        remainingLabor: Number.parseFloat(day.remaining_labor.toFixed(1)),
        tasks: day.tasks,
      }))
    )

    // Group by date and sum the values
    const groupedDays = allDays.reduce((acc, day) => {
      const existingDay = acc.find(d => d.date === day.date)
      if (existingDay) {
        existingDay.plannedLabor += day.plannedLabor
        existingDay.actualLabor += day.actualLabor
        existingDay.remainingLabor += day.remainingLabor
        existingDay.tasks = [...existingDay.tasks, ...day.tasks]
      } else {
        acc.push(day)
      }
      return acc
    }, [] as typeof allDays)

    return groupedDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [optimizationResult])

  // Status colors for pie chart
  const STATUS_COLORS = {
    "Not Started": "var(--chart-1)",
    "In Progress": "var(--chart-2)",
    "Paused": "var(--chart-3)",
    "Completed": "var(--chart-4)",
    "Cancelled": "var(--chart-5)",
  }

  // Priority colors for pie chart
  const PRIORITY_COLORS = {
    High: "var(--destructive)",
    Medium: "var(--chart-2)",
    Low: "var(--chart-1)",
  }

  // Custom tooltip for pie charts
  const CustomPieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.value} görev ({((data.value / filteredTasks.length) * 100).toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Custom tooltip for bar charts
  const CustomBarTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-muted-foreground">{entry.name}:</span>
                </div>
                <span className="text-xs font-medium">{entry.value} saat</span>
              </div>
            ))}
          </div>
          {payload[0].payload.tasks && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs font-medium mb-1">Görevler:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {payload[0].payload.tasks.map((task: Task) => (
                  <div key={task.id} className="text-xs flex items-center gap-1">
                    <Badge variant={getPriorityColor(task.priority) as any} className="text-[10px] h-4">
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    <span className="truncate">{task.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
    return null
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
        <h1 className="text-2xl font-bold tracking-tight">Görev Dağılımı</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user?.role === 'manager' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Takım Üyesi</label>
                <Select 
                  value={selectedUserId?.toString() || "all"} 
                  onValueChange={(value) => setSelectedUserId(value === "all" ? null : Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Takım üyesi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Takım</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Zaman Aralığı</label>
              <Select value={timeRangePreset} onValueChange={handleTimeRangeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Zaman aralığı seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Bu Hafta</SelectItem>
                  <SelectItem value="month">Bu Ay</SelectItem>
                  <SelectItem value="quarter">Son 3 Ay</SelectItem>
                  <SelectItem value="year">Son 1 Yıl</SelectItem>
                  <SelectItem value="custom">Özel Aralık</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tarih Aralığı</label>
              <DatePickerWithRange
                dateRange={dateRange}
                onDateRangeChange={(range) => {
                  setDateRange(range)
                  setTimeRangePreset("custom")
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Görünüm</label>
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === "chart" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("chart")}
                >
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Grafik
                </Button>
                <Button
                  variant={viewMode === "optimize" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("optimize")}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Optimize
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Durum Filtresi</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Öncelik Filtresi</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Öncelik seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Öncelikler</SelectItem>
                  <SelectItem value="High">Yüksek</SelectItem>
                  <SelectItem value="Medium">Orta</SelectItem>
                  <SelectItem value="Low">Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sıralama</label>
              <div className="flex space-x-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sıralama kriteri" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Öncelik</SelectItem>
                    <SelectItem value="work_size">İş Büyüklüğü</SelectItem>
                    <SelectItem value="planned_labor">Planlanan İş Saati</SelectItem>
                    <SelectItem value="actual_labor">Gerçekleşen İş Saati</SelectItem>
                    <SelectItem value="completion_date">Tamamlanma Tarihi</SelectItem>
                    <SelectItem value="start_date">Başlangıç Tarihi</SelectItem>
                    <SelectItem value="created_at">Oluşturulma Tarihi</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  title={sortOrder === "asc" ? "Artan sıralama" : "Azalan sıralama"}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "chart" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Durum Dağılımı
              </CardTitle>
              <CardDescription>Görevlerin durum dağılımı</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p>Seçilen kriterlere uygun görev bulunamadı</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tasksByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        animationDuration={750}
                        animationBegin={0}
                      >
                        {tasksByStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Öncelik Dağılımı
              </CardTitle>
              <CardDescription>Görevlerin öncelik dağılımı</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p>Seçilen kriterlere uygun görev bulunamadı</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tasksByPriority}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        animationDuration={750}
                        animationBegin={0}
                      >
                        {tasksByPriority.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart2 className="h-5 w-5 mr-2" />
                İş Saati Dağılımı
              </CardTitle>
              <CardDescription>Görevlerin planlanan ve gerçekleşen iş saati dağılımı</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[500px] w-full" />
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p>Seçilen kriterlere uygun görev bulunamadı</p>
                </div>
              ) : (
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredTasks.map((task) => ({
                        name:
                          task.description.length > 20 ? task.description.substring(0, 20) + "..." : task.description,
                        plannedLabor: task.planned_labor,
                        actualLabor: task.actual_labor,
                        priority: task.priority,
                        status: task.status,
                        id: task.id,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      />
                      <YAxis
                        label={{ value: "Saat", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)" }}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar
                        dataKey="plannedLabor"
                        name="Planlanan İş Saati"
                        fill="var(--chart-2)"
                        radius={[4, 4, 0, 0]}
                        animationDuration={750}
                        animationBegin={0}
                      />
                      <Bar
                        dataKey="actualLabor"
                        name="Gerçekleşen İş Saati"
                        fill="var(--chart-4)"
                        radius={[4, 4, 0, 0]}
                        animationDuration={750}
                        animationBegin={250}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === "optimize" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Görev Optimizasyonu</CardTitle>
              <CardDescription>Görevlerinizi seçtiğiniz parametreye göre optimize edin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={optimizationParam} onValueChange={setOptimizationParam}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Optimizasyon parametresi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Öncelik</SelectItem>
                        <SelectItem value="work_size">İş Büyüklüğü</SelectItem>
                        <SelectItem value="completion_date">Tamamlanma Tarihi</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={handleOptimize} disabled={isOptimizing}>
                      {isOptimizing ? "Optimize Ediliyor..." : "Optimize Et"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg mb-6">
                <h3 className="text-sm font-medium mb-2">Optimizasyon Bilgisi</h3>
                <p className="text-sm text-muted-foreground">
                  {optimizationParam === "priority"
                    ? "Görevler öncelik sırasına göre optimize edilecektir. Yüksek öncelikli görevler önce planlanır."
                    : optimizationParam === "work_size"
                      ? "Görevler iş büyüklüğüne göre optimize edilecektir. Büyük işler daha dengeli dağıtılır."
                      : "Görevler tamamlanma tarihine göre optimize edilecektir. Yaklaşan son tarihli görevler önceliklidir."}
                </p>
              </div>

              {optimizationResult ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300">Toplam Planlanan</h4>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {optimizationResult[0].daily_distribution.reduce((sum, day) => sum + day.planned_labor, 0).toFixed(1)} saat
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-green-700 dark:text-green-300">Toplam Gerçekleşen</h4>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {optimizationResult[0].daily_distribution.reduce((sum, day) => sum + day.actual_labor, 0).toFixed(1)} saat
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-red-700 dark:text-red-300">Toplam Kalan</h4>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {optimizationResult[0].daily_distribution.reduce((sum, day) => sum + day.remaining_labor, 0).toFixed(1)} saat
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Görev</TableHead>
                          <TableHead className="w-[120px]">Durum</TableHead>
                          <TableHead className="w-[100px]">Öncelik</TableHead>
                          <TableHead className="w-[120px]">Başlangıç</TableHead>
                          <TableHead className="w-[120px]">Bitiş</TableHead>
                          <TableHead className="w-[100px] text-right">Planlanan</TableHead>
                          <TableHead className="w-[100px] text-right">Gerçekleşen</TableHead>
                          <TableHead className="w-[100px] text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {optimizationResult[0].daily_distribution.flatMap(day => day.tasks).map((task, index) => (
                          <TableRow 
                            key={`${task.id}-${index}`} 
                            className={
                              task.status === "Completed" 
                                ? "bg-green-50 dark:bg-green-950/20" 
                                : isOverdue(task) 
                                  ? "bg-red-50 dark:bg-red-950/20" 
                                  : ""
                            }
                          >
                            <TableCell className="font-medium max-w-[300px] truncate">{task.description}</TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusColor(task.status) as any}
                                className="flex items-center gap-1 whitespace-nowrap"
                              >
                                {getStatusIcon(task.status)}
                                {getStatusLabel(task.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPriorityColor(task.priority) as any}>
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(task.start_date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(task.completion_date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="text-right">{task.planned_labor} saat</TableCell>
                            <TableCell className="text-right">{task.actual_labor} saat</TableCell>
                            <TableCell className="text-right">
                              <Link href={`/tasks/${task.id}`}>
                                <Button variant="outline" size="sm">
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p>Görevlerinizi optimize etmek için "Optimize Et" butonuna tıklayın</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  )
}

