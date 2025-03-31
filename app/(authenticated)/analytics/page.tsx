"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { analyticsAPI, tasksAPI } from "@/lib/api"
import type { Task, AnalyticsData } from "@/lib/types"
import { toast } from "sonner"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [optimizationAlgorithm, setOptimizationAlgorithm] = useState("priority")

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return

      try {
        setIsLoading(true)

        // Get all tasks
        const allTasks = await tasksAPI.getAllTasks()
        setTasks(allTasks)

        // Get analytics data
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 3) // Last 3 months

        const endDate = new Date()

        // Get user task distribution
        const userDistribution = await analyticsAPI.getUserTaskDistribution(
          user.UserId,
          startDate.toISOString(),
          endDate.toISOString(),
        )

        // Get team performance
        const teamPerformance = await analyticsAPI.getTeamPerformance(
          user.Team || "",
          startDate.toISOString(),
          endDate.toISOString(),
        )

        setAnalyticsData([...userDistribution, ...teamPerformance])

        setIsLoading(false)
      } catch (error) {
        console.error("Analiz verileri alınamadı:", error)
        toast.error("Analiz verileri yüklenemedi")
        setIsLoading(false)
      }
    }

    if (user) {
      fetchAnalyticsData()
    }
  }, [user])

  // Prepare data for charts
  const statusData = [
    { name: "Başlanmadı", value: tasks.filter((t) => t.Status === "Not Started").length },
    { name: "Devam Ediyor", value: tasks.filter((t) => t.Status === "In Progress").length },
    { name: "Tamamlandı", value: tasks.filter((t) => t.Status === "Completed").length },
    { name: "Duraklatıldı", value: tasks.filter((t) => t.Status === "On Hold").length },
  ]

  const priorityData = [
    { name: "Düşük", value: tasks.filter((t) => t.Priority === "Low").length },
    { name: "Orta", value: tasks.filter((t) => t.Priority === "Medium").length },
    { name: "Yüksek", value: tasks.filter((t) => t.Priority === "High").length },
  ]

  // Prepare team performance data
  const teamPerformanceData = analyticsData
    .filter((data) => data.AssignedToUserId && data.TotalPlanned)
    .map((data) => ({
      name: `Kullanıcı ${data.AssignedToUserId}`,
      planned: data.TotalPlanned,
      spent: data.TotalSpent,
    }))

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  // Optimization algorithm visualization
  const getOptimizedTasks = () => {
    const tasksCopy = [...tasks]

    switch (optimizationAlgorithm) {
      case "priority":
        // Sort by priority (High > Medium > Low)
        return tasksCopy.sort((a, b) => {
          const priorityOrder = { High: 0, Medium: 1, Low: 2 }
          return (
            priorityOrder[a.Priority as keyof typeof priorityOrder] -
            priorityOrder[b.Priority as keyof typeof priorityOrder]
          )
        })
      case "valueSize":
        // Sort by value size (highest first)
        return tasksCopy.sort((a, b) => b.ValueSize - a.ValueSize)
      case "dueDate":
        // Sort by due date (earliest first)
        return tasksCopy.sort((a, b) => new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime())
      default:
        return tasksCopy
    }
  }

  const optimizedTasks = getOptimizedTasks()

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analiz</h1>
        {user?.Role === "manager" && (
          <Select value={optimizationAlgorithm} onValueChange={setOptimizationAlgorithm}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Algoritma seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Öncelik Bazlı</SelectItem>
              <SelectItem value="valueSize">İş Büyüklüğü Bazlı</SelectItem>
              <SelectItem value="dueDate">Tamamlanma Tarihi Bazlı</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="team">Ekip Performansı</TabsTrigger>
          <TabsTrigger value="optimization">Görev Optimizasyonu</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Görev Durumu Dağılımı</CardTitle>
                <CardDescription>Duruma göre görevlerin genel görünümü</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Görev Önceliği Dağılımı</CardTitle>
                <CardDescription>Önceliğe göre görevlerin genel görünümü</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle>Görev Tamamlama Oranı</CardTitle>
                <CardDescription>Tamamlanan görevlerin yüzdesi</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">
                      %
                      {tasks.length > 0
                        ? Math.round((tasks.filter((t) => t.Status === "Completed").length / tasks.length) * 100)
                        : 0}
                    </div>
                    <p className="text-muted-foreground">
                      {tasks.filter((t) => t.Status === "Completed").length} / {tasks.length} görev tamamlandı
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Planlanan ve Harcanan Saatler</CardTitle>
              <CardDescription>Görev başına planlanan ve harcanan saatlerin karşılaştırması</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tasks.slice(0, 5).map((task) => ({
                      name: task.Title.length > 20 ? task.Title.substring(0, 20) + "..." : task.Title,
                      planned: task.PlannedHours,
                      spent: task.SpentHours || 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#8884d8" name="Planlanan Saatler" />
                    <Bar dataKey="spent" fill="#82ca9d" name="Harcanan Saatler" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Ekip İş Yükü</CardTitle>
              <CardDescription>Ekip üyeleri arasında planlanan ve harcanan saatlerin dağılımı</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#8884d8" name="Planlanan Saatler" />
                    <Bar dataKey="spent" fill="#82ca9d" name="Harcanan Saatler" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ekip Verimliliği</CardTitle>
                <CardDescription>Harcanan saatlerin planlanan saatlere oranı</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={teamPerformanceData.map((member) => ({
                        name: member.name,
                        efficiency:
                          member.spent > 0 ? Math.min(Math.round((member.planned / member.spent) * 100), 100) : 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis unit="%" />
                      <Tooltip />
                      <Bar dataKey="efficiency" fill="#82ca9d" name="Verimlilik %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Görev Dağılımı</CardTitle>
                <CardDescription>Her ekip üyesine atanan görev sayısı</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData
                        .filter((data) => data.AssignedToUserId && data.TaskCount)
                        .map((data) => ({
                          name: `Kullanıcı ${data.AssignedToUserId}`,
                          tasks: data.TaskCount,
                        }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tasks" fill="#8884d8" name="Görev Sayısı" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Görev Optimizasyonu</CardTitle>
              <CardDescription>
                {optimizationAlgorithm === "priority"
                  ? "öncelik"
                  : optimizationAlgorithm === "valueSize"
                    ? "iş büyüklüğü"
                    : "tamamlanma tarihi"}{" "}
                bazlı optimize edilmiş görev dağılımı
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {optimizationAlgorithm === "priority" &&
                      "Görevler önceliğe göre sıralanmıştır, Yüksek öncelikli görevler ilk sırada."}
                    {optimizationAlgorithm === "valueSize" &&
                      "Görevler iş büyüklüğüne göre sıralanmıştır, en yüksek değerli görevler ilk sırada."}
                    {optimizationAlgorithm === "dueDate" &&
                      "Görevler tamamlanma tarihine göre sıralanmıştır, en acil görevler ilk sırada."}
                  </p>

                  <div className="space-y-2">
                    {optimizedTasks.slice(0, 5).map((task, index) => (
                      <div key={task.TaskId} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex-1">
                          <div className="font-medium">{task.Title}</div>
                          <div className="text-sm text-muted-foreground">
                            {task.Priority} Öncelik • {task.Status} • Değer: {task.ValueSize}/10
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {task.SpentHours || 0}/{task.PlannedHours} saat
                          </div>
                          <div className="text-xs text-muted-foreground">
                            %
                            {task.PlannedHours > 0 ? Math.round(((task.SpentHours || 0) / task.PlannedHours) * 100) : 0}
                            tamamlandı
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <h3 className="text-lg font-medium mb-2">Optimizasyon İçgörüleri</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <span>
                          {optimizationAlgorithm === "priority" &&
                            "Yüksek öncelikli görevler, kritik yol gecikmelerini en aza indirmek için önce ele alınmalıdır."}
                          {optimizationAlgorithm === "valueSize" &&
                            "Yüksek değerli görevlere öncelik vermek, iş etkisini en üst düzeye çıkarır."}
                          {optimizationAlgorithm === "dueDate" &&
                            "Tamamlanma tarihine göre düzenlemek, son tarihlerin kaçırılmasını önlemeye yardımcı olur."}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <span>
                          {optimizedTasks.length > 0 &&
                            `"${optimizedTasks[0].Title}" görevi ekibinizin şu anki odak noktası olmalıdır.`}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <span>
                          Ekip kapasitesini dengelemek ve teslimat sürelerini iyileştirmek için iş yükünün yeniden
                          dağıtılmasını düşünün.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optimizasyon Karşılaştırması</CardTitle>
              <CardDescription>Farklı optimizasyon stratejilerini karşılaştırın</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Öncelik Bazlı",
                        efficiency: 85,
                        completion: 70,
                        satisfaction: 75,
                      },
                      {
                        name: "İş Büyüklüğü Bazlı",
                        efficiency: 70,
                        completion: 65,
                        satisfaction: 90,
                      },
                      {
                        name: "Tamamlanma Tarihi Bazlı",
                        efficiency: 80,
                        completion: 90,
                        satisfaction: 65,
                      },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#8884d8" name="Ekip Verimliliği" />
                    <Bar dataKey="completion" fill="#82ca9d" name="Zamanında Tamamlama" />
                    <Bar dataKey="satisfaction" fill="#ffc658" name="Paydaş Memnuniyeti" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

