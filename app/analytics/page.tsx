"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const isManager = user?.role === "manager"

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analitik</h1>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Kişisel Analitik</TabsTrigger>
          {isManager && <TabsTrigger value="team">Ekip Analitik</TabsTrigger>}
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <PersonalAnalytics userId={user?.id} />
        </TabsContent>

        {isManager && (
          <TabsContent value="team" className="space-y-6">
            <TeamAnalytics teamId={user?.team_id} />
          </TabsContent>
        )}
      </Tabs>
    </AppShell>
  )
}

interface PersonalAnalyticsProps {
  userId: number | undefined
}

function PersonalAnalytics({ userId }: PersonalAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("month")
  const [taskDistribution, setTaskDistribution] = useState<any[]>([])
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return

      try {
        setIsLoading(true)

        let startDate, endDate
        const now = new Date()

        if (timeRange === "week") {
          startDate = startOfWeek(now)
          endDate = endOfWeek(now)
        } else if (timeRange === "month") {
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
        } else if (timeRange === "quarter") {
          startDate = startOfMonth(subMonths(now, 3))
          endDate = endOfMonth(now)
        } else {
          startDate = startOfMonth(subMonths(now, 12))
          endDate = endOfMonth(now)
        }

        const formattedStartDate = format(startDate, "yyyy-MM-dd")
        const formattedEndDate = format(endDate, "yyyy-MM-dd")

        // Fetch task distribution data
        const response = await api.get(
          `/analytics/user-task-distribution?user_id=${userId}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        )

        // Process data for charts
        processAnalyticsData(response)
      } catch (err) {
        console.error("Analitik verisi yüklenirken hata:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId, timeRange])

  const processAnalyticsData = (data: any[]) => {
    // Process task distribution by date
    const groupedByDate = data.reduce(
      (acc, item) => {
        const date = format(new Date(item.DueDate), "MM/dd")

        if (!acc[date]) {
          acc[date] = {
            date,
            High: 0,
            Medium: 0,
            Low: 0,
          }
        }

        acc[date][item.Priority] += item.TaskCount

        return acc
      },
      {} as Record<string, any>,
    )

    setTaskDistribution(Object.values(groupedByDate))

    // Process tasks by priority
    const priorityCounts = data.reduce(
      (acc, item) => {
        const priority = item.Priority
        acc[priority] = (acc[priority] || 0) + item.TaskCount
        return acc
      },
      {} as Record<string, number>,
    )

    const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({
      name,
      value,
    }))

    setTasksByPriority(priorityData)

    // Process tasks by work size (value)
    const statusCounts = data.reduce(
      (acc, item) => {
        const size = `Boyut ${item.ValueSize}`
        acc[size] = (acc[size] || 0) + item.TaskCount
        return acc
      },
      {} as Record<string, number>,
    )

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }))

    setTasksByStatus(statusData)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Zaman aralığı seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Bu Hafta</SelectItem>
            <SelectItem value="month">Bu Ay</SelectItem>
            <SelectItem value="quarter">Son 3 Ay</SelectItem>
            <SelectItem value="year">Son 12 Ay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Görev Dağılımı</CardTitle>
            <CardDescription>Seçilen zaman aralığında önceliğe göre görevler</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : taskDistribution.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Bu dönem için veri bulunmamaktadır
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskDistribution}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="High" stackId="a" fill="#ef4444" name="Yüksek Öncelik" />
                    <Bar dataKey="Medium" stackId="a" fill="#f97316" name="Orta Öncelik" />
                    <Bar dataKey="Low" stackId="a" fill="#22c55e" name="Düşük Öncelik" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Önceliğe Göre Görevler</CardTitle>
            <CardDescription>Öncelik seviyesine göre görev dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : tasksByPriority.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Bu dönem için veri bulunmamaktadır
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
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => {
                        const translatedName = name === "High" ? "Yüksek" : name === "Medium" ? "Orta" : "Düşük"
                        return `${translatedName} ${(percent * 100).toFixed(0)}%`
                      }}
                    >
                      {tasksByPriority.map((entry, index) => {
                        const COLORS = {
                          High: "#ef4444",
                          Medium: "#f97316",
                          Low: "#22c55e",
                        }
                        return (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#9ca3af"} />
                        )
                      })}
                    </Pie>
                    <Tooltip />
                    <Legend
                      formatter={(value) => (value === "High" ? "Yüksek" : value === "Medium" ? "Orta" : "Düşük")}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İş Büyüklüğüne Göre Görevler</CardTitle>
            <CardDescription>İş büyüklüğü değerine göre görev dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : tasksByStatus.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Bu dönem için veri bulunmamaktadır
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tasksByStatus}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" name="Görev Sayısı" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimize Edilmiş Görev Dağılımı</CardTitle>
            <CardDescription>Öncelik ve iş büyüklüğüne göre önerilen görev dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={taskDistribution}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="High" stroke="#ef4444" name="Yüksek Öncelik" strokeWidth={2} />
                    <Line type="monotone" dataKey="Medium" stroke="#f97316" name="Orta Öncelik" strokeWidth={2} />
                    <Line type="monotone" dataKey="Low" stroke="#22c55e" name="Düşük Öncelik" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

interface TeamAnalyticsProps {
  teamId: number | undefined
}

function TeamAnalytics({ teamId }: TeamAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("month")
  const [teamPerformance, setTeamPerformance] = useState<any[]>([])
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        const response = await api.get("/users")
        const userMap: Record<number, string> = {}

        response.forEach((user: any) => {
          userMap[user.id] = user.name
        })

        setUserNames(userMap)
      } catch (err) {
        console.error("Kullanıcı isimleri yüklenirken hata:", err)
      }
    }

    fetchUserNames()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!teamId) return

      try {
        setIsLoading(true)

        let startDate, endDate
        const now = new Date()

        if (timeRange === "month") {
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
        } else if (timeRange === "quarter") {
          startDate = startOfMonth(subMonths(now, 3))
          endDate = endOfMonth(now)
        } else {
          startDate = startOfMonth(subMonths(now, 12))
          endDate = endOfMonth(now)
        }

        const formattedStartDate = format(startDate, "yyyy-MM-dd")
        const formattedEndDate = format(endDate, "yyyy-MM-dd")

        const response = await api.get(
          `/analytics/team-performance?team_id=${teamId}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        )

        // Add user names to the data
        const processedData = response.map((item: any) => ({
          ...item,
          userName: userNames[item.UserId] || `Kullanıcı ${item.UserId}`,
          efficiency: item.TotalPlanned > 0 ? Math.round((item.TotalSpent / item.TotalPlanned) * 100) : 0,
        }))

        setTeamPerformance(processedData)
      } catch (err) {
        console.error("Ekip performansı yüklenirken hata:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (Object.keys(userNames).length > 0) {
      fetchData()
    }
  }, [teamId, timeRange, userNames])

  return (
    <>
      <div className="flex justify-end mb-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Zaman aralığı seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Bu Ay</SelectItem>
            <SelectItem value="quarter">Son 3 Ay</SelectItem>
            <SelectItem value="year">Son 12 Ay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Ekip Performansı</CardTitle>
            <CardDescription>Ekip üyelerine göre planlanan ve gerçekleşen çalışma saatleri</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : teamPerformance.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                Bu dönem için ekip performans verisi bulunmamaktadır
              </div>
            ) : (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamPerformance}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="userName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="TotalPlanned" fill="#3b82f6" name="Planlanan Saatler" />
                    <Bar dataKey="TotalSpent" fill="#22c55e" name="Gerçekleşen Saatler" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ekip Verimliliği</CardTitle>
            <CardDescription>Gerçekleşen ve planlanan çalışma saatleri oranı (%)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : teamPerformance.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Bu dönem için ekip verimlilik verisi bulunmamaktadır
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamPerformance}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="userName" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#8884d8" name="Verimlilik (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Görev Dağılımı Optimizasyonu</CardTitle>
            <CardDescription>Ekip kapasitesine göre önerilen görev dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={teamPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="TotalPlanned"
                      nameKey="userName"
                      label={({ userName, percent }) => `${userName} ${(percent * 100).toFixed(0)}%`}
                    >
                      {teamPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

