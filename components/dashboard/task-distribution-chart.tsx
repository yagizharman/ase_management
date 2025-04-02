"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { tr } from "date-fns/locale"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from "recharts"
import { CalendarIcon } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface TaskDistributionChartProps {
  userId: number | undefined
  isManager?: boolean
  teamId?: number
}

export function TaskDistributionChart({ userId, isManager = false, teamId }: TaskDistributionChartProps) {
  const [timeRange, setTimeRange] = useState("month")
  const [taskDistribution, setTaskDistribution] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [optimizationParam, setOptimizationParam] = useState<string>("priority")

  useEffect(() => {
    const fetchData = async () => {
      if (!userId && !teamId) return

      try {
        setIsLoading(true)

        let startDate, endDate
        const now = new Date()

        if (timeRange === "week") {
          startDate = startOfWeek(now, { weekStartsOn: 1 }) // Monday as start of week
          endDate = endOfWeek(now, { weekStartsOn: 1 })
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

        let response

        if (isManager && teamId) {
          // For manager, fetch optimized team distribution
          response = await api.post("/analytics/optimize-task-distribution", {
            team_id: teamId,
            optimization_param: optimizationParam,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
          })

          // Process team data for chart
          const chartData: any[] = []
          const dateMap = new Map()

          // First, collect all dates from all users
          response.forEach((userData: any) => {
            userData.daily_distribution.forEach((day: any) => {
              const date = format(new Date(day.date), "MM/dd")
              if (!dateMap.has(date)) {
                dateMap.set(date, { date })
              }
            })
          })

          // Then, add each user's data to the corresponding date
          response.forEach((userData: any) => {
            userData.daily_distribution.forEach((day: any) => {
              const date = format(new Date(day.date), "MM/dd")
              const dateData = dateMap.get(date)
              dateData[userData.user_name] = day.planned_labor
              dateData[`${userData.user_name}_tasks`] = day.tasks
            })
          })

          setTaskDistribution(Array.from(dateMap.values()))
        } else {
          // For individual user, fetch detailed distribution
          response = await api.get(
            `/analytics/user-detailed-distribution?user_id=${userId}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`
          )

          // Process user data for chart
          const chartData = response.daily_distribution.map((day: any) => ({
            date: format(new Date(day.date), "dd MMM", { locale: tr }),
            plannedLabor: parseFloat(day.planned_labor.toFixed(1)),
            actualLabor: parseFloat(day.actual_labor.toFixed(1)),
            remainingLabor: parseFloat(day.remaining_labor.toFixed(1)),
            tasks: day.tasks,
          }))

          setTaskDistribution(chartData)
        }
      } catch (err: any) {
        console.error("Analitik verisi yüklenirken hata:", err)
        setError(err.message || "Veri yüklenirken hata oluştu")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId, teamId, timeRange, isManager, optimizationParam])

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const dayData = payload[0].payload
      
      return (
        <div className="bg-background border rounded-md shadow-md p-3 max-w-xs">
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
          
          {dayData.tasks && dayData.tasks.length > 0 && (
            <div className="mt-3 pt-2 border-t">
              <p className="text-xs font-medium mb-1">Görevler:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {dayData.tasks.map((task: any) => (
                  <div key={task.id} className="text-xs flex items-center gap-1">
                    <Badge
                      variant={
                        task.priority === "High"
                          ? "destructive"
                          : task.priority === "Medium"
                          ? "default"
                          : "secondary"
                      }
                      className="text-[10px] h-4"
                    >
                      {task.priority}
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

  const TeamTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const dayData = payload[0].payload
      
      // Extract unique user names from the payload keys
      const userNames = new Set<string>()
      Object.keys(dayData).forEach(key => {
        if (key !== "date" && !key.includes('_tasks')) {
          userNames.add(key)
        }
      })

      return (
        <div className="bg-background border rounded-md shadow-md p-3 max-w-xs">
          <p className="font-medium">{label}</p>
          
          {Array.from(userNames).map(userName => {
            const tasksKey = `${userName}_tasks`
            
            if (!dayData[userName]) return null
            
            return (
              <div key={userName} className="mt-3 pt-2 border-t">
                <p className="font-medium text-sm">{userName}</p>
                <div className="mt-1">
                  <p className="text-xs">
                    <span className="text-blue-500">■</span> Planlanan: {dayData[userName]} saat
                  </p>
                </div>
                
                {dayData[tasksKey] && dayData[tasksKey].length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Görevler:</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {dayData[tasksKey].map((task: any) => (
                        <div key={task.id} className="text-xs flex items-center gap-1">
                          <Badge
                            variant={
                              task.priority === "High"
                                ? "destructive"
                                : task.priority === "Medium"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px] h-4"
                          >
                            {task.priority}
                          </Badge>
                          <span className="truncate">{task.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  const getColors = () => {
    // Define a set of colors for different users
    return [
      "#3b82f6", // blue
      "#22c55e", // green
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
    ]
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
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

        {isManager && (
          <div className="flex gap-2">
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
            
            <Link href="/analytics/detailed-distribution">
              <Button variant="outline" size="sm">
                Detaylı Görünüm
              </Button>
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : error ? (
        <div className="flex h-[300px] items-center justify-center text-destructive">{error}</div>
      ) : taskDistribution.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
          <div className="text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p>Bu dönem için veri bulunmamaktadır</p>
          </div>
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {isManager ? (
              <AreaChart
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
                <Tooltip content={<TeamTooltip />} />
                <Legend />
                {/* Dynamically create areas for each team member */}
                {taskDistribution.length > 0 &&
                  Object.keys(taskDistribution[0])
                    .filter((key) => key !== "date" && !key.includes('_tasks'))
                    .map((key, index) => {
                      const colors = getColors()
                      const color = colors[index % colors.length]
                      return (
                        <Area 
                          key={key} 
                          type="monotone" 
                          dataKey={key} 
                          name={key} 
                          fill={color} 
                          stroke={color}
                          fillOpacity={0.6}
                          stackId="1"
                        />
                      )
                    })}
              </AreaChart>
            ) : (
              <AreaChart
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
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="plannedLabor" 
                  name="Planlanan İş Saati" 
                  fill="#3b82f6" 
                  stroke="#3b82f6"
                  fillOpacity={0.6}
                  stackId="1"
                />
                <Area 
                  type="monotone" 
                  dataKey="actualLabor" 
                  name="Gerçekleşen İş Saati" 
                  fill="#22c55e" 
                  stroke="#22c55e"
                  fillOpacity={0.6}
                  stackId="2"
                />
                <Area 
                  type="monotone" 
                  dataKey="remainingLabor" 
                  name="Kalan İş Saati" 
                  fill="#ef4444" 
                  stroke="#ef4444"
                  fillOpacity={0.6}
                  stackId="3"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      
      {isManager && (
        <div className="text-xs text-muted-foreground mt-2">
          <p>
            {optimizationParam === "priority"
              ? "Öncelik bazlı optimizasyon: Yüksek öncelikli görevler önce planlanır."
              : optimizationParam === "work_size"
              ? "İş büyüklüğü bazlı optimizasyon: Büyük işler daha dengeli dağıtılır."
              : "Tamamlanma tarihi bazlı optimizasyon: Yaklaşan son tarihli görevler önceliklidir."}
          </p>
        </div>
      )}
    </div>
  )
}
