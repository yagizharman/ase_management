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
import { CalendarIcon } from 'lucide-react'
import { addDays } from "date-fns"
import type { DateRange } from "react-day-picker"

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

interface UserTaskDistributionProps {
  userId?: number
  isManager?: boolean
}

export function UserTaskDistribution({ userId, isManager = false }: UserTaskDistributionProps) {
  const { user } = useAuth()
  const [distribution, setDistribution] = useState<UserDetailedDistribution | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [timeRangePreset, setTimeRangePreset] = useState<string>("week")
  const [optimizationParam, setOptimizationParam] = useState<string>("priority")
  const [teamMembers, setTeamMembers] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    const fetchDistribution = async () => {
      if (!userId && !user?.id) return

      try {
        setIsLoading(true)
        setError("")

        const targetUserId = userId || user?.id
        const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd", { locale: tr }) : ""
        const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd", { locale: tr }) : ""

        if (!startDate || !endDate) {
          setError("Lütfen geçerli bir tarih aralığı seçin")
          return
        }

        const response = await api.get(
          `/analytics/user-detailed-distribution?user_id=${targetUserId}&start_date=${startDate}&end_date=${endDate}&optimization_param=${optimizationParam}`,
        )

        setDistribution(response)
      } catch (err: any) {
        console.error("Error fetching task distribution:", err)
        setError(err.message || "Görev dağılımı yüklenirken hata oluştu")
      } finally {
        setIsLoading(false)
      }
    }

    const fetchTeamMembers = async () => {
      if (!user?.id || !isManager) return

      try {
        const response = await api.get("/users")
        const teamUsers = response.filter((u: any) => u.team_id === user.team_id)
        setTeamMembers(teamUsers.map((u: any) => ({ id: u.id, name: u.name })))
      } catch (err) {
        console.error("Error fetching team members:", err)
      }
    }

    fetchDistribution()
    fetchTeamMembers()
  }, [userId, user?.id, dateRange, optimizationParam, user?.team_id, isManager])

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

  const formatChartData = (data: UserDetailedDistribution | null) => {
    if (!data || !data.daily_distribution) return []

    return data.daily_distribution.map((day) => ({
      date: format(new Date(day.date + "T00:00:00"), "dd MMM", { locale: tr }),
      plannedLabor: Number.parseFloat(day.planned_labor.toFixed(1)),
      actualLabor: Number.parseFloat(day.actual_labor.toFixed(1)),
      remainingLabor: Number.parseFloat(day.remaining_labor.toFixed(1)),
      tasks: day.tasks,
    }))
  }

  // CustomTooltip bileşenini daha detaylı hale getiriyorum
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const dayData = payload[0].payload
    return (
      <div className="bg-background border rounded-md shadow-md p-3">
        <p className="font-medium">{label}</p>
        <div className="mt-2 space-y-1">
          <p className="text-sm">
            <span className="text-blue-500">■</span> Planlanan: {dayData.plannedLabor} saat
          </p>
          <p className="text-sm">
            <span className="text-green-500">■</span> Gerçekleşen: {dayData.actualLabor} saat
          </p>
          <p className="text-sm">
            <span className="text-red-500">■</span> Kalan: {dayData.remainingLabor} saat
          </p>
        </div>
      </div>
    )
  }
  return null
}

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isManager ? "Çalışan Görev Dağılımı" : "Görev Dağılımı"}
          {distribution && <span className="ml-2 text-muted-foreground">({distribution.user_name})</span>}
        </CardTitle>
        <CardDescription>Seçilen tarih aralığında planlanan ve gerçekleşen günlük iş saatleri dağılımı</CardDescription>
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

              <Select value={optimizationParam} onValueChange={setOptimizationParam}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Optimizasyon parametresi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Öncelik</SelectItem>
                  <SelectItem value="size">İş Büyüklüğü</SelectItem>
                  <SelectItem value="deadline">Tamamlanma Tarihi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-shrink-0">
              <DatePickerWithRange
                dateRange={dateRange}
                onDateRangeChange={(range) => {
                  setDateRange(range)
                  setTimeRangePreset("custom")
                }}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : distribution && distribution.daily_distribution.length > 0 ? (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formatChartData(distribution)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Saat", angle: -90, position: "insideLeft" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="plannedLabor" name="Planlanan İş Saati" fill="#3b82f6" />
                <Bar dataKey="actualLabor" name="Gerçekleşen İş Saati" fill="#22c55e" />
                <Bar dataKey="remainingLabor" name="Kalan İş Saati" fill="#ef4444" />
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

        {distribution && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Toplam Planlanan İş Saati</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {distribution.daily_distribution.reduce((sum, day) => sum + day.planned_labor, 0).toFixed(1)} saat
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Toplam Gerçekleşen İş Saati</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {distribution.daily_distribution.reduce((sum, day) => sum + day.actual_labor, 0).toFixed(1)} saat
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-300">Toplam Kalan İş Saati</h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {distribution.daily_distribution.reduce((sum, day) => sum + day.remaining_labor, 0).toFixed(1)} saat
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

