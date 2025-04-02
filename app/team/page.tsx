"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "recharts"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import {
  LucideUser,
  Mail,
  Phone,
  Users,
  BarChart2,
  PieChartIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"

interface UserType {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  team_id: number
}

interface TeamType {
  id: number
  name: string
  manager_id: number | null
}

interface TeamPerformanceData {
  UserId: number
  TotalPlanned: number
  TotalSpent: number
  userName?: string
  efficiency?: number
}

export default function TeamPage() {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<UserType[]>([])
  const [team, setTeam] = useState<TeamType | null>(null)
  const [teamManager, setTeamManager] = useState<UserType | null>(null)
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [timeFrame, setTimeFrame] = useState("month")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError("")

        // Fetch team details
        if (user?.team_id) {
          const teamData = await api.get(`/teams/${user.team_id}`)
          setTeam(teamData)

          // Fetch team manager if exists
          if (teamData.manager_id) {
            const managerData = await api.get(`/users/${teamData.manager_id}`)
            setTeamManager(managerData)
          }
        }

        // Fetch all users
        const usersData = await api.get("/users")

        // Filter users by team
        const teamUsers = usersData.filter((u: UserType) => u.team_id === user?.team_id)
        setTeamMembers(teamUsers)

        // Set date range based on selected time frame
        let startDate, endDate
        const today = new Date()

        switch (timeFrame) {
          case "week":
            startDate = new Date(today)
            startDate.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
            endDate = new Date(startDate)
            endDate.setDate(startDate.getDate() + 6) // End of week (Saturday)
            break
          case "month":
            startDate = startOfMonth(today)
            endDate = endOfMonth(today)
            break
          case "quarter":
            startDate = startOfMonth(subMonths(today, 2))
            endDate = endOfMonth(today)
            break
          case "custom":
            startDate = dateRange?.from || startOfMonth(today)
            endDate = dateRange?.to || endOfMonth(today)
            break
          default:
            startDate = startOfMonth(today)
            endDate = endOfMonth(today)
        }

        const formattedStartDate = format(startDate, "yyyy-MM-dd")
        const formattedEndDate = format(endDate, "yyyy-MM-dd")

        // Fetch team performance data
        const performanceData = await api.get(
          `/analytics/team-performance?team_id=${user?.team_id}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        )

        // Add user names to the performance data
        const processedData = performanceData.map((item: TeamPerformanceData) => ({
          ...item,
          userName: teamUsers.find((u: UserType) => u.id === item.UserId)?.name || `Kullanıcı ${item.UserId}`,
          efficiency: item.TotalPlanned > 0 ? Math.round((item.TotalSpent / item.TotalPlanned) * 100) : 0,
        }))

        setTeamPerformance(processedData)
      } catch (err: any) {
        setError(err.message || "Ekip verileri yüklenirken hata oluştu")
        console.error("Error fetching team data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.team_id) {
      fetchData()
    }
  }, [user?.team_id, timeFrame, dateRange])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

  const prepareRoleDistributionData = () => {
    const roleCounts = teamMembers.reduce(
      (acc, member) => {
        const role = member.role === "manager" ? "Yönetici" : "Çalışan"
        acc[role] = (acc[role] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(roleCounts).map(([name, value]) => ({
      name,
      value,
    }))
  }

  const prepareEfficiencyData = () => {
    return teamPerformance.map((item) => ({
      name: item.userName,
      value: item.efficiency || 0,
    }))
  }

  const getStatusCounts = () => {
    let completed = 0
    let inProgress = 0
    let overdue = 0

    // This would ideally come from an API endpoint
    // For now, using the performance data as a proxy
    teamPerformance.forEach((item) => {
      if (item.TotalSpent >= item.TotalPlanned) {
        completed += 1
      } else if (item.TotalSpent > 0) {
        inProgress += 1
      } else {
        overdue += 1
      }
    })

    return { completed, inProgress, overdue }
  }

  const statusCounts = getStatusCounts()

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ekip Yönetimi</h1>
          {team && <p className="text-muted-foreground">Ekip: {team.name}</p>}
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zaman Aralığı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="quarter">Son 3 Ay</SelectItem>
              <SelectItem value="custom">Özel Aralık</SelectItem>
            </SelectContent>
          </Select>

          {timeFrame === "custom" && (
            <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-[300px]" />
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setTimeFrame(timeFrame) // Trigger refetch
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Ekip Üyeleri
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart2 className="h-4 w-4 mr-2" />
            Performans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Team Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Tamamlanan Görevler</p>
                    <h3 className="text-2xl font-bold mt-1">{statusCounts.completed}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Devam Eden Görevler</p>
                    <h3 className="text-2xl font-bold mt-1">{statusCounts.inProgress}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Gecikmiş Görevler</p>
                    <h3 className="text-2xl font-bold mt-1">{statusCounts.overdue}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ekip Yapısı</CardTitle>
                <CardDescription>Ekip üyelerinin rol dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : error ? (
                  <div className="text-destructive">Hata: {error}</div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">Ekip üyesi bulunamadı.</div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareRoleDistributionData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {prepareRoleDistributionData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verimlilik Dağılımı</CardTitle>
                <CardDescription>Ekip üyelerinin verimlilik oranları</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : error ? (
                  <div className="text-destructive">Hata: {error}</div>
                ) : teamPerformance.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">Performans verisi bulunamadı.</div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareEfficiencyData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: %${value}`}
                        >
                          {prepareEfficiencyData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `%${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Manager Card */}
          {teamManager && (
            <Card>
              <CardHeader>
                <CardTitle>Ekip Yöneticisi</CardTitle>
                <CardDescription>Ekibin sorumlu yöneticisi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>{getInitials(teamManager.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{teamManager.name}</h3>
                    <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {teamManager.email}
                      </div>
                      {teamManager.phone && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {teamManager.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className="ml-auto">Yönetici</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ekip Üyeleri</CardTitle>
              <CardDescription>Ekibinizdeki üyeler ve rolleri</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-destructive">Hata: {error}</div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">Ekip üyesi bulunamadı.</div>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between border p-4 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {member.email}
                            </div>
                            {member.phone && (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {member.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        <Badge variant={member.role === "manager" ? "default" : "outline"}>
                          {member.role === "manager" ? "Yönetici" : "Çalışan"}
                        </Badge>
                        <Link href={`/team/${member.id}`}>
                          <Button variant="outline" size="sm">
                            <LucideUser className="h-4 w-4 mr-2" />
                            Profili Görüntüle
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ekip Performansı</CardTitle>
              <CardDescription>Planlanan ve gerçekleşen iş saatleri</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : error ? (
                <div className="text-destructive">Hata: {error}</div>
              ) : teamPerformance.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Bu dönem için performans verisi bulunmuyor.
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
                      <Bar dataKey="TotalPlanned" fill="#3b82f6" name="Planlanan Saat" />
                      <Bar dataKey="TotalSpent" fill="#22c55e" name="Gerçekleşen Saat" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verimlilik Analizi</CardTitle>
              <CardDescription>Ekip üyelerinin verimlilik oranları</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : error ? (
                <div className="text-destructive">Hata: {error}</div>
              ) : teamPerformance.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">Verimlilik verisi bulunmuyor.</div>
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
                      <Tooltip formatter={(value) => `%${value}`} />
                      <Legend />
                      <Bar dataKey="efficiency" fill="#8884d8" name="Verimlilik (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}

