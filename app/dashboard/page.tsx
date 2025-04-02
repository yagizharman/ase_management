"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PlusCircle,
  ArrowRight,
  Calendar,
  CheckCheck,
  Timer,
  AlertTriangle,
  BarChart3,
  Users,
  TrendingUp,
  CheckSquare,
} from "lucide-react"
import Link from "next/link"
import { format, isAfter, isBefore, addDays } from "date-fns"
import { TaskDistributionChart } from "@/components/dashboard/task-distribution-chart"
import { TaskStatusSummary } from "@/components/dashboard/task-status-summary"
import { RecentTasks } from "@/components/dashboard/recent-tasks"
import { TeamPerformance } from "@/components/dashboard/team-performance"

interface Task {
  id: number
  description: string
  priority: string
  status: string
  completion_date: string
  start_date: string
  planned_labor: number
  actual_labor: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const isManager = user?.role === "manager"

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        // Fetch tasks for the current user
        const response = await api.get(`/users/${user?.id}/tasks`)
        setTasks(response)
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

  // Calculate alerts
  const overdueTasks = tasks.filter((task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    console.log(completionDate, today, task.status)
    return completionDate < today && task.status !== "Completed"
  })

  const upcomingTasks = tasks.filter((task) => {
    const dueDate = new Date(task.completion_date)
    const today = new Date()
    // Set both dates to start of day for accurate comparison
    dueDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays >= 0 && task.status !== "Completed"
  })



  const notStartedTasks = tasks.filter((task) => {
    const startDate = new Date(task.start_date)
    const today = new Date()
    return startDate <= today && task.status === "Not Started"
  })

  // Calculate task statistics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === "Completed").length
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress").length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate total planned and actual labor
  const totalPlannedLabor = tasks.reduce((sum, task) => sum + task.planned_labor, 0)
  const totalActualLabor = tasks.reduce((sum, task) => sum + task.actual_labor, 0)
  const laborEfficiency = totalPlannedLabor > 0 ? Math.round((totalActualLabor / totalPlannedLabor) * 100) : 0

  // Get tasks due this week
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Set to start of day
  const endOfWeek = addDays(today, 7)
  endOfWeek.setHours(23, 59, 59, 999) // Set to end of day
  const tasksThisWeek = tasks.filter((task) => {
    const dueDate = new Date(task.completion_date)
    return (dueDate >= today && dueDate <= endOfWeek) && task.status !== "Completed"
  })

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gösterge Paneli</h1>
          <p className="text-muted-foreground mt-1">Hoş geldiniz, {user?.name}</p>
        </div>
        <Link href="/tasks/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Görev
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Toplam Görevler</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold mt-1">{totalTasks}</h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={completionRate}
                className="h-2 bg-blue-200 dark:bg-blue-700"
                indicatorClassName="bg-blue-600 dark:bg-blue-400"
              />
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{completionRate}% tamamlandı</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Tamamlanan</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold mt-1">{completedTasks}</h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <CheckCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <Badge
                variant="outline"
                className="bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700"
              >
                {completedTasks} / {totalTasks}
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
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold mt-1">{inProgressTasks}</h3>
                )}
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
                {inProgressTasks} aktif görev
              </Badge>
              {inProgressTasks > 0 && (
                <Link
                  href="/tasks?filter=in-progress"
                  className="text-xs text-amber-600 dark:text-amber-400 ml-2 hover:underline"
                >
                  Görüntüle
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Gecikmiş</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold mt-1">{overdueTasks.length}</h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {overdueTasks.length > 0 ? (
                <Link
                  href="/tasks?filter=overdue"
                  className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center"
                >
                  Gecikmiş görevleri görüntüle
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              ) : (
                <span className="text-xs text-green-600 dark:text-green-400">Gecikmiş görev yok</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(overdueTasks.length > 0 || upcomingTasks.length > 0 || notStartedTasks.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {overdueTasks.length > 0 && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-600 dark:text-red-400">Gecikmiş Görevler</AlertTitle>
              <AlertDescription className="text-red-600/90 dark:text-red-400/90">
                {overdueTasks.length} adet gecikmiş {overdueTasks.length === 1 ? "göreviniz" : "göreviniz"} var.
                <Link href="/tasks?filter=overdue" className="block underline mt-2 text-red-600 dark:text-red-400">
                  Tüm gecikmiş görevleri görüntüle
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {upcomingTasks.length > 0 && (
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-600 dark:text-amber-400">Yaklaşan Son Tarihler</AlertTitle>
              <AlertDescription className="text-amber-600/90 dark:text-amber-400/90">
                Önümüzdeki 3 gün içinde {upcomingTasks.length} {upcomingTasks.length === 1 ? "görevin" : "görevin"} son
                tarihi dolacak.
                <Link href="/tasks?filter=upcoming" className="block underline mt-2 text-amber-600 dark:text-amber-400">
                  Yaklaşan görevleri görüntüle
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {notStartedTasks.length > 0 && (
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-600 dark:text-blue-400">Başlatılacak Görevler</AlertTitle>
              <AlertDescription className="text-blue-600/90 dark:text-blue-400/90">
                Başlatmanız gereken {notStartedTasks.length} {notStartedTasks.length === 1 ? "görev" : "görev"} var.
                <Link
                  href="/tasks?filter=not-started"
                  className="block underline mt-2 text-blue-600 dark:text-blue-400"
                >
                  Başlatılacak görevleri görüntüle
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background">
            <BarChart3 className="h-4 w-4 mr-2" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-background">
            <CheckSquare className="h-4 w-4 mr-2" />
            Görevler
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="team" className="data-[state=active]:bg-background">
              <Users className="h-4 w-4 mr-2" />
              Ekip
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Görev Dağılımı</CardTitle>
                <CardDescription>Zaman içindeki görev dağılımınız</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskDistributionChart userId={user?.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Görev Durumu</CardTitle>
                <CardDescription>Mevcut görev durumu dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskStatusSummary tasks={tasks} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Bu Hafta Teslim Edilecek Görevler</CardTitle>
                <CardDescription>Önümüzdeki 7 gün içinde tamamlanması gereken görevler</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : tasksThisWeek.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>Bu hafta teslim edilecek görev bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {tasksThisWeek.slice(0, 5).map((task) => (
                      <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                        <div className="flex items-center justify-between border-b pb-3 hover:bg-muted/50 rounded-lg p-2 -mx-2 cursor-pointer">
                          <div className="flex-1 min-w-0"> {/* min-width: 0 prevents flex item from overflowing */}
                            <p className="font-medium truncate">{task.description}</p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                              {format(new Date(task.completion_date), "d MMMM")}
                            </div>
                          </div>
                          <Badge
                            variant={
                              task.priority === "High"
                                ? "destructive"
                                : task.priority === "Medium"
                                  ? "default"
                                  : "secondary"
                            }
                            className="ml-2 flex-shrink-0"
                          >
                            {task.priority === "High" ? "Yüksek" : task.priority === "Medium" ? "Orta" : "Düşük"}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
              {tasksThisWeek.length > 5 && (
                <CardFooter>
                  <Link href="/tasks" className="text-sm text-primary hover:underline">
                    Tüm görevleri görüntüle
                  </Link>
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Verimlilik</CardTitle>
                <CardDescription>Planlanan ve gerçekleşen iş saatleri</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Planlanan İş Saati</span>
                        <span className="text-sm">{totalPlannedLabor} saat</span>
                      </div>
                     
                      
                      <Progress value={100} className="h-2" />
                    </div>

                    <div className="space-y-2">\
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Gerçekleşen İş Saati</span>
                        <span className="text-sm">{totalActualLabor} saat</span>
                      </div>
                      <Progress
                        value={totalPlannedLabor > 0 ? (totalActualLabor / totalPlannedLabor) * 100 : 0}
                        className="h-2"
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Verimlilik</span>
                        <div className="flex items-center">
                          <TrendingUp
                            className={`h-4 w-4 mr-1 ${laborEfficiency > 100 ? "text-red-500" : "text-green-500"}`}
                          />
                          <span className={`text-sm ${laborEfficiency > 100 ? "text-red-500" : "text-green-500"}`}>
                            {laborEfficiency}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {laborEfficiency > 100
                          ? "Planlanan süreden daha fazla zaman harcandı"
                          : laborEfficiency < 100
                            ? "Planlanan süreden daha az zaman harcandı"
                            : "Planlanan süre kadar zaman harcandı"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Son Görevler</CardTitle>
              <CardDescription>En son görevleriniz ve durumları</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentTasks userId={user?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Ekip Performansı</CardTitle>
                <CardDescription>Ekip üyelerinizin performans metrikleri</CardDescription>
              </CardHeader>
              <CardContent>
                <TeamPerformance teamId={user?.team_id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </AppShell>
  )
}

