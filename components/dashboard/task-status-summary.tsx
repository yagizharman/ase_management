"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface Task {
  status: string
  completion_date: string
}

interface TaskStatusSummaryProps {
  tasks: Task[]
  isLoading: boolean
}

export function TaskStatusSummary({ tasks, isLoading }: TaskStatusSummaryProps) {
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  if (!tasks.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">Henüz görev bulunmuyor</div>
    )
  }

  // Count tasks by status
  const statusCounts = tasks.reduce((acc: Record<string, number>, task) => {
    const status = task.status
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  // Count overdue tasks
  const overdueTasks = tasks.filter((task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    return completionDate < today && task.status !== "Completed"
  }).length

  // Prepare data for pie chart
  const data = [
    { name: "Tamamlandı", value: statusCounts["Completed"] || 0, color: "#22c55e" }, // green-500
    { name: "Devam Ediyor", value: statusCounts["In Progress"] || 0, color: "#3b82f6" }, // blue-500
    { name: "Başlamadı", value: statusCounts["Not Started"] || 0, color: "#94a3b8" }, // slate-400
    { name: "Duraklatıldı", value: statusCounts["Paused"] || 0, color: "#f59e0b" }, // amber-500
    { name: "İptal Edildi", value: statusCounts["Cancelled"] || 0, color: "#6b7280" }, // gray-500
    { name: "Gecikmiş", value: overdueTasks, color: "#ef4444" }, // red-500
  ].filter((item) => item.value > 0) // Only include statuses with tasks

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} görev`, ""]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

