"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface TaskDistributionChartProps {
  userId: number | undefined
  isManager?: boolean
  teamId?: number | undefined
}

export function TaskDistributionChart({ userId, isManager, teamId }: TaskDistributionChartProps) {
  const [timeRange, setTimeRange] = useState("month")
  const [taskDistribution, setTaskDistribution] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userId && !teamId) return

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

        let apiUrl = `/analytics/user-task-distribution?user_id=${userId}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`

        if (isManager && teamId) {
          apiUrl = `/analytics/team-task-distribution?team_id=${teamId}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`
        }

        const response = await api.get(apiUrl)

        // Process data for charts
        processAnalyticsData(response)
      } catch (err) {
        console.error("Analitik verisi yüklenirken hata:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId, timeRange, isManager, teamId])

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

      <Card>
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
    </>
  )
}

