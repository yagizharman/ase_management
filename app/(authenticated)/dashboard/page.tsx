"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clock, AlertTriangle, CheckCircle2, Plus, BarChart3, ListTodo, Users } from "lucide-react"
import Link from "next/link"
import KanbanBoard from "@/components/kanban-board"
import TaskModal from "@/components/task-modal"
import { tasksAPI } from "@/lib/api"
import type { Task } from "@/lib/types"
import { toast } from "sonner"

export default function DashboardPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  })

  const fetchTasks = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const allTasksData = await tasksAPI.getAllTasks()

      // Filter tasks for the current user
      const userTasks = allTasksData.filter((task: Task) => task.AssignedToUserId === user.UserId)
      setAllTasks(userTasks)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Filter tasks by date
      const todayTasksList = userTasks.filter((task: Task) => {
        const dueDate = new Date(task.DueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate.getTime() === today.getTime()
      })

      const overdueTasksList = userTasks.filter((task: Task) => {
        const dueDate = new Date(task.DueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate.getTime() < today.getTime() && task.Status !== "Completed"
      })

      const upcomingTasksList = userTasks.filter((task: Task) => {
        const dueDate = new Date(task.DueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate.getTime() > today.getTime()
      })

      setTodayTasks(todayTasksList)
      setOverdueTasks(overdueTasksList)
      setUpcomingTasks(upcomingTasksList)

      // Calculate task stats
      setTaskStats({
        total: userTasks.length,
        completed: userTasks.filter((t: Task) => t.Status === "Completed").length,
        inProgress: userTasks.filter((t: Task) => t.Status === "In Progress").length,
        notStarted: userTasks.filter((t: Task) => t.Status === "Not Started").length,
      })

      // Show alert for overdue tasks
      if (overdueTasksList.length > 0) {
        toast.error(`${overdueTasksList.length} adet gecikmiş göreviniz var`, {
          description: "Bu görevler acil dikkat gerektiriyor.",
        })
      }
    } catch (error) {
      console.error("Gösterge paneli verileri alınamadı:", error)
      toast.error("Görevler yüklenemedi", {
        description: "Lütfen daha sonra tekrar deneyin",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [user])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Gösterge Paneli</h1>
        <Button onClick={() => setShowTaskModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Görev Oluştur
        </Button>
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Görevler</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{taskStats.total}</div>
            )}
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devam Eden</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{taskStats.inProgress}</div>
            )}
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{taskStats.completed}</div>
            )}
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Başlanmamış</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{taskStats.notStarted}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {overdueTasks.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Gecikmiş Görevler</AlertTitle>
          <AlertDescription>Acil dikkat gerektiren {overdueTasks.length} adet gecikmiş göreviniz var.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="kanban" className="space-y-3">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Panosu</TabsTrigger>
          <TabsTrigger value="today">
            Bugünkü Görevler
            {todayTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {todayTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Gecikmiş
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {overdueTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Yaklaşan
            {upcomingTasks.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {upcomingTasks.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : allTasks.length > 0 ? (
            <KanbanBoard tasks={allTasks} onTaskUpdated={fetchTasks} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Hiç görev bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Henüz hiç göreviniz yok. Yeni bir görev oluşturmak için tıklayın.
              </p>
              <Button onClick={() => setShowTaskModal(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Görev Oluştur
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="today" className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : todayTasks.length > 0 ? (
            <KanbanBoard tasks={todayTasks} onTaskUpdated={fetchTasks} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Bugün için görev yok</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tüm görevleriniz tamamlandı! Yeni bir görev oluşturmak için tıklayın.
              </p>
              <Button onClick={() => setShowTaskModal(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Görev Oluştur
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : overdueTasks.length > 0 ? (
            <KanbanBoard tasks={overdueTasks} onTaskUpdated={fetchTasks} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Gecikmiş görev yok</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Görevlerinizi zamanında tamamladığınız için tebrikler!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : upcomingTasks.length > 0 ? (
            <KanbanBoard tasks={upcomingTasks} onTaskUpdated={fetchTasks} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Yaklaşan görev yok</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Önümüzdeki günler için planlanmış göreviniz bulunmuyor.
              </p>
              <Button onClick={() => setShowTaskModal(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Görev Oluştur
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Görev Dağılımı</CardTitle>
            <CardDescription>Öncelik ve duruma göre görevlerinizin genel görünümü</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-2" />
                <p>Görev dağılım grafiği burada görünecek</p>
                <Button variant="link" asChild>
                  <Link href="/analytics">Detaylı analizi görüntüle</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Son Aktiviteler</CardTitle>
            <CardDescription>Görevlerinizdeki son güncellemeler</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-primary/10 p-1">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Görev güncellendi</p>
                    <p className="text-xs text-muted-foreground">
                      {todayTasks.length > 0 ? `"${todayTasks[0].Title}" - Bugün` : "Son güncelleme yok"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-primary/10 p-1">
                    <Plus className="h-3 w-3 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Yeni görev atandı</p>
                    <p className="text-xs text-muted-foreground">
                      {upcomingTasks.length > 0 ? `"${upcomingTasks[0].Title}" - Yakın zamanda` : "Yeni görev yok"}
                    </p>
                  </div>
                </div>
                <Button variant="link" className="px-0" asChild>
                  <Link href="/tasks">Tüm görevleri görüntüle</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showTaskModal && (
        <TaskModal
          open={showTaskModal}
          onOpenChange={setShowTaskModal}
          onTaskCreated={() => {
            toast.success("Görev başarıyla oluşturuldu")
            fetchTasks()
          }}
        />
      )}
    </div>
  )
}

