"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import {
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Timer,
  CheckSquare,
  User,
  Users,
} from "lucide-react"
import Link from "next/link"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"

interface UserType {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  team_id: number
  team_name?: string
  join_date?: string
  avatar?: string
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
}

interface TeamMemberProfileProps {
  userId: number
}

export function TeamMemberProfile({ userId }: TeamMemberProfileProps) {
  const [user, setUser] = useState<UserType | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    efficiencyRate: 0,
    avgTasksPerWeek: 0,
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)

        // Fetch user details
        const userData = await api.get(`/users/${userId}`)

        // Fetch team details to get team name
        const teamsData = await api.get("/teams")
        const team = teamsData.find((t: any) => t.id === userData.team_id)

        setUser({
          ...userData,
          team_name: team?.name || "Bilinmeyen Ekip",
          join_date: userData.join_date || "2023-01-01", // Default if not available
        })

        // Fetch user's tasks
        const tasksData = await api.get(`/users/${userId}/tasks`)
        setTasks(tasksData)

        // Calculate stats
        const completed = tasksData.filter((t: Task) => t.status === "Completed").length
        const inProgress = tasksData.filter((t: Task) => t.status === "In Progress").length
        const overdue = tasksData.filter((t: Task) => {
          const completionDate = new Date(t.completion_date)
          completionDate.setHours(23, 59, 59, 999)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return completionDate < today && t.status !== "Completed"
        }).length

        // Calculate efficiency rate
        const totalPlannedLabor = tasksData.reduce((sum: number, task: Task) => sum + task.planned_labor, 0)
        const totalActualLabor = tasksData.reduce((sum: number, task: Task) => sum + task.actual_labor, 0)
        const efficiencyRate = totalPlannedLabor > 0 ? Math.round((totalActualLabor / totalPlannedLabor) * 100) : 0

        // Calculate average tasks per week (assuming tasks from the last 3 months)
        const avgTasksPerWeek = Math.round((tasksData.length / 12) * 10) / 10

        setStats({
          totalTasks: tasksData.length,
          completedTasks: completed,
          inProgressTasks: inProgress,
          overdueTasks: overdue,
          completionRate: tasksData.length > 0 ? Math.round((completed / tasksData.length) * 100) : 0,
          efficiencyRate,
          avgTasksPerWeek,
        })
      } catch (err: any) {
        setError(err.message || "Kullanıcı verileri yüklenirken hata oluştu")
        console.error("Error fetching user data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [userId])

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

  const isOverdue = (task: Task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return completionDate < today && task.status !== "Completed"
  }

  // Prepare data for charts
  const prepareStatusData = () => {
    const statusCounts = tasks.reduce(
      (acc, task) => {
        const status = getStatusLabel(task.status)
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }))
  }

  const preparePriorityData = () => {
    const priorityCounts = tasks.reduce(
      (acc, task) => {
        const priority = getPriorityLabel(task.priority)
        acc[priority] = (acc[priority] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(priorityCounts).map(([name, value]) => ({
      name,
      value,
    }))
  }

  const prepareEfficiencyData = () => {
    // Group tasks by month
    const monthlyData = tasks.reduce(
      (acc, task) => {
        const month = format(new Date(task.completion_date), "MMM", { locale: tr })
        if (!acc[month]) {
          acc[month] = {
            month,
            planned: 0,
            actual: 0,
          }
        }
        acc[month].planned += task.planned_labor
        acc[month].actual += task.actual_labor
        return acc
      },
      {} as Record<string, { month: string; planned: number; actual: number }>,
    )

    return Object.values(monthlyData)
  }

  const COLORS = {
    Tamamlandı: "#22c55e",
    "Devam Ediyor": "#3b82f6",
    Duraklatıldı: "#f97316",
    Başlamadı: "#94a3b8",
    "İptal Edildi": "#ef4444",
    Yüksek: "#ef4444",
    Orta: "#f97316",
    Düşük: "#22c55e",
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error || !user) {
    return <div className="p-4 text-destructive">Hata: {error || "Kullanıcı bulunamadı"}</div>
  }

  return (
    <div className="space-y-6">
      {/* User Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <Avatar className="h-24 w-24 border-4 border-background">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
              )}
            </Avatar>

            <div className="space-y-4 text-center md:text-left flex-1">
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground">{user.role === "manager" ? "Yönetici" : "Çalışan"}</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{user.team_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Katılım: {format(new Date(user.join_date), "d MMMM yyyy", { locale: tr })}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Badge variant={user.role === "manager" ? "default" : "outline"} className="ml-auto">
                {user.role === "manager" ? "Yönetici" : "Çalışan"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Toplam Görevler</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalTasks}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={stats.completionRate}
                className="h-2 bg-blue-200 dark:bg-blue-700"
                indicatorClassName="bg-blue-600 dark:bg-blue-400"
              />
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{stats.completionRate}% tamamlandı</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Tamamlanan</p>
                <h3 className="text-2xl font-bold mt-1">{stats.completedTasks}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <Badge
                variant="outline"
                className="bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700"
              >
                {stats.completedTasks} / {stats.totalTasks}
              </Badge>
              <span className="text-xs text-green-600 dark:text-green-400 ml-2">görev tamamlandı</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Devam Eden</p>
                <h3 className="text-2xl font-bold mt-1">{stats.inProgressTasks}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                <Timer className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <Badge
                variant="outline"
                className="bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700"
              >
                {stats.inProgressTasks} aktif görev
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Gecikmiş</p>
                <h3 className="text-2xl font-bold mt-1">{stats.overdueTasks}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {stats.overdueTasks > 0 ? (
                <Badge variant="destructive">{stats.overdueTasks} gecikmiş görev</Badge>
              ) : (
                <span className="text-xs text-green-600 dark:text-green-400">Gecikmiş görev yok</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-2" />
            Görevler
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analitikler
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aktif Görevler</CardTitle>
              <CardDescription>Çalışanın devam eden görevleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.filter((task) => task.status === "In Progress").length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Aktif görev bulunmuyor</div>
                ) : (
                  tasks
                    .filter((task) => task.status === "In Progress")
                    .map((task) => (
                      <div key={task.id} className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-1">
                          <div className="font-medium">{task.description}</div>
                          <div className="text-sm text-muted-foreground">
                            Son Tarih: {format(new Date(task.completion_date), "d MMMM yyyy", { locale: tr })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(task.priority) as any}>
                            {getPriorityLabel(task.priority)}
                          </Badge>
                          <Link href={`/tasks/${task.id}`}>
                            <Button variant="ghost" size="sm">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yaklaşan Görevler</CardTitle>
              <CardDescription>Önümüzdeki 7 gün içinde tamamlanması gereken görevler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.filter((task) => {
                  const dueDate = new Date(task.completion_date)
                  const today = new Date()
                  const diffTime = dueDate.getTime() - today.getTime()
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                  return diffDays <= 7 && diffDays > 0 && task.status !== "Completed"
                }).length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Yaklaşan görev bulunmuyor</div>
                ) : (
                  tasks
                    .filter((task) => {
                      const dueDate = new Date(task.completion_date)
                      const today = new Date()
                      const diffTime = dueDate.getTime() - today.getTime()
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      return diffDays <= 7 && diffDays > 0 && task.status !== "Completed"
                    })
                    .map((task) => (
                      <div key={task.id} className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-1">
                          <div className="font-medium">{task.description}</div>
                          <div className="text-sm text-muted-foreground">
                            Son Tarih: {format(new Date(task.completion_date), "d MMMM yyyy", { locale: tr })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(task.priority) as any}>
                            {getPriorityLabel(task.priority)}
                          </Badge>
                          <Link href={`/tasks/${task.id}`}>
                            <Button variant="ghost" size="sm">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tüm Görevler</CardTitle>
              <CardDescription>Çalışanın tüm görevleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Görev bulunmuyor</div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between border-b pb-4">
                      <div className="space-y-1">
                        <div className="font-medium">{task.description}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Başlangıç: {format(new Date(task.start_date), "d MMM", { locale: tr })}</span>
                          <span>Son Tarih: {format(new Date(task.completion_date), "d MMM yyyy", { locale: tr })}</span>
                          <span>
                            İş Saati: {task.actual_labor}/{task.planned_labor}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(task.priority) as any}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        <Badge variant={getStatusColor(task.status) as any}>{getStatusLabel(task.status)}</Badge>
                        <Link href={`/tasks/${task.id}`}>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/tasks?user=${userId}`} className="text-sm text-primary hover:underline">
                Tüm görevleri görüntüle
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Görev Durumu Dağılımı</CardTitle>
                <CardDescription>Görevlerin duruma göre dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {prepareStatusData().length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareStatusData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {prepareStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#9ca3af"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Görev Önceliği Dağılımı</CardTitle>
                <CardDescription>Görevlerin önceliğe göre dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {preparePriorityData().length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePriorityData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {preparePriorityData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#9ca3af"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Verimlilik Analizi</CardTitle>
                <CardDescription>Planlanan ve gerçekleşen iş saatleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {prepareEfficiencyData().length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={prepareEfficiencyData()}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="planned" name="Planlanan Saat" fill="#3b82f6" />
                        <Bar dataKey="actual" name="Gerçekleşen Saat" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performans Özeti</CardTitle>
                <CardDescription>Çalışanın genel performans metrikleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tamamlama Oranı</span>
                      <span className="font-medium">{stats.completionRate}%</span>
                    </div>
                    <Progress value={stats.completionRate} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Verimlilik Oranı</span>
                      <span
                        className={`font-medium ${stats.efficiencyRate > 100 ? "text-destructive" : "text-green-600"}`}
                      >
                        {stats.efficiencyRate}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(stats.efficiencyRate, 100)}
                      className="h-2"
                      indicatorClassName={stats.efficiencyRate > 100 ? "bg-destructive" : ""}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Haftalık Ortalama Görev</span>
                      <span className="font-medium">{stats.avgTasksPerWeek}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Görev Tamamlama Süresi</CardTitle>
                <CardDescription>Ortalama görev tamamlama süreleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Yüksek Öncelikli Görevler</span>
                    <span className="font-medium">
                      {tasks.filter((t) => t.priority === "High" && t.status === "Completed").length > 0
                        ? Math.round(
                            tasks
                              .filter((t) => t.priority === "High" && t.status === "Completed")
                              .reduce((sum, t) => sum + t.actual_labor, 0) /
                              tasks.filter((t) => t.priority === "High" && t.status === "Completed").length,
                          )
                        : 0}{" "}
                      saat
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Orta Öncelikli Görevler</span>
                    <span className="font-medium">
                      {tasks.filter((t) => t.priority === "Medium" && t.status === "Completed").length > 0
                        ? Math.round(
                            tasks
                              .filter((t) => t.priority === "Medium" && t.status === "Completed")
                              .reduce((sum, t) => sum + t.actual_labor, 0) /
                              tasks.filter((t) => t.priority === "Medium" && t.status === "Completed").length,
                          )
                        : 0}{" "}
                      saat
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Düşük Öncelikli Görevler</span>
                    <span className="font-medium">
                      {tasks.filter((t) => t.priority === "Low" && t.status === "Completed").length > 0
                        ? Math.round(
                            tasks
                              .filter((t) => t.priority === "Low" && t.status === "Completed")
                              .reduce((sum, t) => sum + t.actual_labor, 0) /
                              tasks.filter((t) => t.priority === "Low" && t.status === "Completed").length,
                          )
                        : 0}{" "}
                      saat
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı Bilgileri</CardTitle>
              <CardDescription>Çalışan hakkında detaylı bilgiler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Ad Soyad</h3>
                    <p>{user.name}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">E-posta</h3>
                    <p>{user.email}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Rol</h3>
                    <p>{user.role === "manager" ? "Yönetici" : "Çalışan"}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Ekip</h3>
                    <p>{user.team_name}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Katılım Tarihi</h3>
                    <p>{format(new Date(user.join_date), "d MMMM yyyy", { locale: tr })}</p>
                  </div>

                  {user.phone && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Telefon</h3>
                      <p>{user.phone}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Performans Özeti</h3>
                  <p>
                    {user.name} şu ana kadar toplam {stats.totalTasks} görev üzerinde çalışmış ve bunların{" "}
                    {stats.completedTasks} tanesini tamamlamıştır. Tamamlama oranı %{stats.completionRate} ve verimlilik
                    oranı %{stats.efficiencyRate} olarak hesaplanmıştır. Şu anda {stats.inProgressTasks} aktif görevi
                    bulunmaktadır ve {stats.overdueTasks} görevi gecikmiş durumdadır.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

