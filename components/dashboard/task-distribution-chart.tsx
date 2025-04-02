"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"

interface Task {
  id: number
  description: string
  status: string
  priority: string
  completion_date: string
  start_date: string
}

interface TaskDistributionChartProps {
  userId: number | undefined
}

export function TaskDistributionChart({ userId }: TaskDistributionChartProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month")

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return

      try {
        setIsLoading(true)
        const response = await api.get(`/users/${userId}/tasks`)
        setTasks(response)
      } catch (err: any) {
        setError(err.message || "Görev dağılımı yüklenirken hata oluştu")
        console.error("Error fetching task distribution:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [userId])

  const getChartData = () => {
    if (!tasks.length) return []

    let startDate, endDate, dateFormat, interval
    const today = new Date()

    // Set date range based on selected time range
    if (timeRange === "week") {
      startDate = startOfWeek(today, { weekStartsOn: 1 }) // Start from Monday
      endDate = endOfWeek(today, { weekStartsOn: 1 })
      dateFormat = "EEE" // Mon, Tue, etc.
      interval = 1 // 1 day interval
    } else if (timeRange === "month") {
      startDate = startOfMonth(today)
      endDate = endOfMonth(today)
      dateFormat = "d MMM" // 1 Jan, 2 Jan, etc.
      interval = 2 // Every 2 days
    } else {
      // quarter - 3 months
      startDate = startOfMonth(subMonths(today, 2))
      endDate = endOfMonth(today)
      dateFormat = "MMM" // Jan, Feb, Mar
      interval = 7 // Weekly interval
    }

    // Generate date labels
    const dateLabels = []
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      dateLabels.push({
        date: new Date(currentDate),
        label: format(currentDate, dateFormat),
      })
      currentDate = addDays(currentDate, interval)
    }

    // Count tasks by status for each date label
    const chartData = dateLabels.map(({ date, label }) => {
      // For each date, count tasks by status
      const notStarted = tasks.filter((task) => {
        const taskDate = new Date(task.start_date)
        return taskDate.toDateString() === date.toDateString() && task.status === "Not Started"
      }).length

      const inProgress = tasks.filter((task) => {
        const taskDate = new Date(task.start_date)
        return taskDate.toDateString() === date.toDateString() && task.status === "In Progress"
      }).length

      const completed = tasks.filter((task) => {
        const taskDate = new Date(task.completion_date)
        return taskDate.toDateString() === date.toDateString() && task.status === "Completed"
      }).length

      const overdue = tasks.filter((task) => {
        const completionDate = new Date(task.completion_date)
        completionDate.setHours(23, 59, 59, 999) // Set to end of the day
        return completionDate < date && task.status !== "Completed"
      }).length

      return {
        name: label,
        Başlamadı: notStarted,
        "Devam Ediyor": inProgress,
        Tamamlandı: completed,
        Gecikmiş: overdue,
      }
    })

    return chartData
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-destructive">{error}</div>
  }

  const chartData = getChartData()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={(value: "week" | "month" | "quarter") => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Zaman Aralığı" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Bu Hafta</SelectItem>
            <SelectItem value="month">Bu Ay</SelectItem>
            <SelectItem value="quarter">Son 3 Ay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Başlamadı" stackId="a" fill="#94a3b8" /> {/* slate-400 */}
            <Bar dataKey="Devam Ediyor" stackId="a" fill="#3b82f6" /> {/* blue-500 */}
            <Bar dataKey="Tamamlandı" stackId="a" fill="#22c55e" /> {/* green-500 */}
            <Bar dataKey="Gecikmiş" stackId="a" fill="#ef4444" /> {/* red-500 */}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

