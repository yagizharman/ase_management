"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, CheckCircle2, AlertTriangle, Calendar, ArrowRight, PlusCircle, Timer } from 'lucide-react'
import { ManagerAlerts } from "@/components/dashboard/manager-alerts"
import { TeamTaskDistribution } from "@/components/analytics/team-task-distribution"
import { TeamPerformance } from "@/components/dashboard/team-performance"
import Link from "next/link"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

export default function ManagerDashboardPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    upcomingTasks: 0,
    inProgressTasks: 0,
    notStartedTasks: 0,
    completionRate: 0,
    efficiencyRate: 0,
  })

  useEffect(() => {
    // Redirect if not a manager
    if (user && user.role !== "manager") {
      window.location.href = "/dashboard"
    }
  }, [user])

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!user?.team_id) return

      try {
        setIsLoading(true)

        // Fetch team members
        const usersResponse = await api.get("/users")
        const teamUsers = usersResponse.filter((u: any) => u.team_id === user.team_id)
        setTeamMembers(teamUsers)

        // Fetch team tasks
        const tasksResponse = await api.get(`/tasks?team_id=${user.team_id}`)
        setTeamTasks(tasksResponse)

        // Calculate stats
        const now = new Date()
        const completed = tasksResponse.filter((t: any) => t.status === "Completed").length
        const inProgress = tasksResponse.filter((t: any) => t.status === "In Progress").length
        const notStarted = tasksResponse.filter((t: any) => t.status === "Not Started").length
        const overdue = tasksResponse.filter((t: any) => {
          const completionDate = new Date(t.completion_date)
          completionDate.setHours(23, 59, 59, 999) // Set to end of the day
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Set to start of the day
          return completionDate < today && t.status !== "Completed"
        }).length
        const upcoming = tasksResponse.filter((t: any) => {
          const dueDate = new Date(t.completion_date)
          const diffTime = dueDate.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays <= 3 && diffDays > 0 && t.status !== "Completed"
        }).length

        // Calculate efficiency rate (actual vs planned labor)
        const totalPlannedLabor = tasksResponse.reduce((sum: number, task: any) => sum + task.planned_labor, 0)
        const totalActualLabor = tasksResponse.reduce((sum: number, task: any) => sum + task.actual_labor, 0)
        const efficiencyRate = totalPlannedLabor > 0 ? Math.round((totalActualLabor / totalPlannedLabor) * 100) : 0

        setTeamStats({
          totalTasks: tasksResponse.length,
          completedTasks: completed,
          overdueTasks: overdue,
          upcomingTasks: upcoming,
          inProgressTasks: inProgress,
          notStartedTasks: notStarted,
          completionRate: tasksResponse.length > 0 ? Math.round((completed / tasksResponse.length) * 100) : 0,
          efficiencyRate,
        })
      } catch (err) {
        console.error("Error fetching team data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.team_id) {
      fetchTeamData()
    }
  }, [user?.team_id])

  if (!user || user.role !== "manager") {
    return null // Will redirect in useEffect
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yönetici Paneli</h1>
          <p className="text-muted-foreground mt-1">Ekip genel bakışı ve performans metrikleri</p>
        </div>
        <Link href="/tasks/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Görev
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Ekip Görev Dağılımı</CardTitle>
          <CardDescription>Optimize edilmiş görev dağılımı</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamTaskDistribution />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Ekip Üyeleri</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold mt-1">{teamMembers.length}</h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/team" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Ekip detaylarını görüntüle
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Tamamlanma Oranı</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold mt-1">{teamStats.completionRate}%</h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={teamStats.completionRate}
                className="h-2 bg-green-200 dark:bg-green-700"
                indicatorClassName="bg-green-600 dark:bg-green-400"
              />
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {teamStats.completedTasks} / {teamStats.totalTasks} görev tamamlandı
              </p>
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
                  <h3 className="text-2xl font-bold mt-1">{teamStats.inProgressTasks}</h3>
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
                {teamStats.inProgressTasks} aktif görev
              </Badge>
              <Link
                href="/team-tasks?filter=In Progress"
                className="text-xs text-amber-600 dark:text-amber-400 ml-2 hover:underline"
              >
                Görüntüle
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            teamStats.overdueTasks > 0
              ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800"
              : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 border-gray-200 dark:border-gray-800"
          }
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Gecikmiş Görevler</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3
                    className={`text-2xl font-bold mt-1 ${teamStats.overdueTasks > 0 ? "text-red-600 dark:text-red-400" : ""}`}
                  >
                    {teamStats.overdueTasks}
                  </h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {teamStats.overdueTasks > 0 ? (
                <Link
                  href="/team-tasks?filter=overdue"
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

      <ManagerAlerts teamId={user.team_id} />

      <Tabs defaultValue="performance" className="mt-6">
        <TabsList>
          <TabsTrigger value="performance">Ekip Performansı</TabsTrigger>
          <TabsTrigger value="upcoming">Yaklaşan Görevler</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ekip Performans Metrikleri</CardTitle>
              <CardDescription>Planlanan ve gerçekleşen iş saatlerini karşılaştırın</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamPerformance teamId={user.team_id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Yaklaşan Görevler</CardTitle>
              <CardDescription>Önümüzdeki 7 gün içinde tamamlanması gereken görevler</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : teamTasks.filter((task) => {
                  const dueDate = new Date(task.completion_date)
                  const now = new Date()
                  const diffTime = dueDate.getTime() - now.getTime()
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                  return diffDays <= 7 && diffDays > 0 && task.status !== "Completed"
                }).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Önümüzdeki 7 gün içinde tamamlanması gereken görev bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamTasks
                    .filter((task) => {
                      const dueDate = new Date(task.completion_date)
                      const now = new Date()
                      const diffTime = dueDate.getTime() - now.getTime()
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      return diffDays <= 7 && diffDays > 0 && task.status !== "Completed"
                    })
                    .slice(0, 5)
                    .map((task) => (
                      <div key={task.id} className="flex items-center justify-between border-b pb-3">
                        <div className="flex-1">
                          <p className="font-medium truncate">{task.description}</p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(task.completion_date), "d MMMM", { locale: tr })}
                            <span className="mx-2">•</span>
                            <span>
                              Görevli:{" "}
                              {task.assignees.find((a: any) => a.role === "assignee")?.user?.name || "Atanmamış"}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            task.priority === "High"
                              ? "destructive"
                              : task.priority === "Medium"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {task.priority === "High" ? "Yüksek" : task.priority === "Medium" ? "Orta" : "Düşük"}
                        </Badge>
                        <Link href={`/tasks/${task.id}`}>
                          <Button variant="ghost" size="sm" className="ml-2">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/team-tasks" className="text-sm text-primary hover:underline">
                Tüm ekip görevlerini görüntüle
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
