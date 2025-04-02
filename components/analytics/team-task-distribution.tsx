"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { tr } from "date-fns/locale"
import { useAuth } from "@/context/auth-context"
import {
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
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Users } from "lucide-react"
import { addDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface DailyDistribution {
  date: string
  planned_labor: number
  actual_labor: number
  remaining_labor: number
  tasks: Array<{
    id: number
    description: string
    priority: string
  }>
}

interface UserDetailedDistribution {
  user_id: number
  user_name: string
  daily_distribution: DailyDistribution[]
}

export function TeamTaskDistribution() {
  const { user } = useAuth()
  const [teamDistribution, setTeamDistribution] = useState<UserDetailedDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [timeRangePreset, setTimeRangePreset] = useState<string>("week")
  const [optimizationParam, setOptimizationParam] = useState<string>("priority")
  const [selectedUserId, setSelectedUserId] = useState<string>("all")
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user?.team_id) return

      try {
        const response = await api.get("/users")
        const teamUsers = response.filter((u: any) => u.team_id === user.team_id)
        setTeamMembers(teamUsers.map((u: any) => ({ id: u.id, name: u.name })))
      } catch (err) {
        console.error("Error fetching team members:", err)
      }
    }

    fetchTeamMembers()
  }, [user?.team_id])

  const fetchTeamDistribution = async () => {
    if (!user?.team_id || !user?.role || user.role !== "manager") {
      setError("Bu özellik sadece yöneticiler için kullanılabilir")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""
      const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""

      if (!startDate || !endDate) {
        setError("Lütfen geçerli bir tarih aralığı seçin")
        return
      }

      const requestData = {
        team_id: user.team_id,
        optimization_param: optimizationParam,
        start_date: startDate,
        end_date: endDate,
      }

      const response = await api.post("/analytics/optimize-task-distribution", requestData)
      setTeamDistribution(response)
    } catch (err: any) {
      console.error("Error fetching team task distribution:", err)
      setError(err.message || "Ekip görev dağılımı yüklenirken hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamDistribution()
  }, [user?.team_id, user?.role, dateRange, optimizationParam])

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
        from = addDays(startOfMonth(now), -90) // Roughly 3 months back
        to = now
        break
      case "custom":
        // Keep the current date range
        return
      default:
        from = subDays(now, 7)
        to = now
    }

    setDateRange({ from, to })
  }

  const handleOptimize = () => {
    fetchTeamDistribution()
    toast.success(`Görev dağılımı "${optimizationParam}" parametresine göre optimize edildi`)
  }

  const formatChartData = (data: UserDetailedDistribution[]) => {
    if (!data || data.length === 0) return []

    // If a specific user is selected, filter the data
    const filteredData =
      selectedUserId !== "all" ? data.filter((user) => user.user_id.toString() === selectedUserId) : data

    // Create a map of all dates across all users
    const allDates = new Set<string>()
    filteredData.forEach((user) => {
      user.daily_distribution.forEach((day) => {
        allDates.add(day.date)
      })
    })

    // Sort dates
    const sortedDates = Array.from(allDates).sort()

    // Create chart data with all users and dates
    return sortedDates.map((date) => {
      const formattedDate = format(new Date(date), "dd MMM", { locale: tr })
      const dayData: any = { date: formattedDate }

      filteredData.forEach((user) => {
        const userDay = user.daily_distribution.find((day) => day.date === date)
        if (userDay) {
          dayData[`${user.user_name}_planned`] = Number.parseFloat(userDay.planned_labor.toFixed(1))
          dayData[`${user.user_name}_actual`] = Number.parseFloat(userDay.actual_labor.toFixed(1))
          dayData[`${user.user_name}_remaining`] = Number.parseFloat(userDay.remaining_labor.toFixed(1))
          dayData[`${user.user_name}_tasks`] = userDay.tasks
        } else {
          dayData[`${user.user_name}_planned`] = 0
          dayData[`${user.user_name}_actual`] = 0
          dayData[`${user.user_name}_remaining`] = 0
          dayData[`${user.user_name}_tasks`] = []
        }
      })

      return dayData
    })
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const dayData = payload[0].payload

      // Extract unique user names from the payload keys
      const userNames = new Set<string>()
      Object.keys(dayData).forEach((key) => {
        if (key.includes("_planned")) {
          userNames.add(key.split("_planned")[0])
        }
      })

      return (
        <div className="bg-background border rounded-md shadow-md p-3 max-w-xs">
          <p className="font-medium">{label}</p>

          {Array.from(userNames).map((userName) => {
            const plannedKey = `${userName}_planned`
            const actualKey = `${userName}_actual`
            const remainingKey = `${userName}_remaining`
            const tasksKey = `${userName}_tasks`

            if (dayData[plannedKey] === 0 && dayData[actualKey] === 0) return null

            return (
              <div key={userName} className="mt-3 pt-2 border-t">
                <p className="font-medium text-sm">{userName}</p>
                <div className="mt-1 space-y-1">
                  <p className="text-xs">
                    <span className="text-blue-500">■</span> Planlanan: {dayData[plannedKey]} saat
                  </p>
                  <p className="text-xs">
                    <span className="text-green-500">■</span> Gerçekleşen: {dayData[actualKey]} saat
                  </p>
                  <p className="text-xs">
                    <span className="text-red-500">■</span> Kalan: {dayData[remainingKey]} saat
                  </p>
                </div>

                
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  const getBarColors = () => {
    // Define a set of colors for different users
    const colors = [
      "#3b82f6", // blue
      "#22c55e", // green
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
    ]

    const barColors: Record<string, string> = {}

    teamDistribution.forEach((user, index) => {
      const colorIndex = index % colors.length
      barColors[`${user.user_name}_planned`] = colors[colorIndex]
    })

    return barColors
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Ekip Görev Dağılımı
        </CardTitle>
        <CardDescription>Ekip üyelerinin görev dağılımını görüntüleyin ve optimize edin</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
          <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={timeRangePreset} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Zaman aralığı seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Bu Hafta</SelectItem>
                  <SelectItem value="month">Bu Ay</SelectItem>
                  <SelectItem value="quarter">Son 3 Ay</SelectItem>
                  <SelectItem value="custom">Özel Aralık</SelectItem>
                </SelectContent>
              </Select>



            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <DatePickerWithRange
                dateRange={dateRange}
                onDateRangeChange={(range) => {
                  setDateRange(range)
                  setTimeRangePreset("custom")
                }}
              />

              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Çalışan seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="chart">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Grafik Görünümü</TabsTrigger>
            <TabsTrigger value="individual">Bireysel Görünüm</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : error ? (
              <div className="text-center py-8 text-destructive">{error}</div>
            ) : teamDistribution.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formatChartData(teamDistribution)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: "Saat", angle: -90, position: "insideLeft" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {teamDistribution.map((user) => (
                      <Bar
                        key={`${user.user_id}_planned`}
                        dataKey={`${user.user_name}_planned`}
                        name={`${user.user_name} (Planlanan)`}
                        fill={getBarColors()[`${user.user_name}_planned`]}
                        stackId="a"
                      />
                    ))}
                    <ReferenceLine y={0} stroke="#000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p>Seçilen tarih aralığında görev verisi bulunmuyor</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="individual">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[200px] w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">{error}</div>
            ) : teamDistribution.length > 0 ? (
              <div className="space-y-8">
                {(selectedUserId === "all"
                  ? teamDistribution
                  : teamDistribution.filter((user) => user.user_id.toString() === selectedUserId)
                ).map((userDist) => (
                  <div key={userDist.user_id} className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">{userDist.user_name}</h3>

                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={userDist.daily_distribution.map((day) => ({
                            date: format(new Date(day.date), "dd MMM", { locale: tr }),
                            plannedLabor: Number.parseFloat(day.planned_labor.toFixed(1)),
                            actualLabor: Number.parseFloat(day.actual_labor.toFixed(1)),
                            remainingLabor: Number.parseFloat(day.remaining_labor.toFixed(1)),
                            tasks: day.tasks,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis label={{ value: "Saat", angle: -90, position: "insideLeft" }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="plannedLabor" name="Planlanan İş Saati" fill="#3b82f6" />
                          <Bar dataKey="actualLabor" name="Gerçekleşen İş Saati" fill="#22c55e" />
                          <ReferenceLine y={0} stroke="#000" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300">Toplam Planlanan</h4>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {userDist.daily_distribution.reduce((sum, day) => sum + day.planned_labor, 0).toFixed(1)} saat
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-green-700 dark:text-green-300">Toplam Gerçekleşen</h4>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                          {userDist.daily_distribution.reduce((sum, day) => sum + day.actual_labor, 0).toFixed(1)} saat
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-red-700 dark:text-red-300">Toplam Kalan</h4>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                          {userDist.daily_distribution.reduce((sum, day) => sum + day.remaining_labor, 0).toFixed(1)}{" "}
                          saat
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p>Seçilen tarih aralığında görev verisi bulunmuyor</p>
              </div>
            )}
          </TabsContent>
        </Tabs>


      </CardContent>
    </Card>
  )
}

