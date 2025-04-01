"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface Task {
  id: number
  description: string
  priority: string
  status: string
  completion_date: string
}

interface TaskListProps {
  tasks: Task[]
  isLoading: boolean
  error: string
  emptyMessage: string
}

export function TaskList({ tasks, isLoading, error, emptyMessage }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-[250px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">Error: {error}</CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">{emptyMessage}</CardContent>
      </Card>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "warning"
      case "Low":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "success"
      case "In Progress":
        return "info"
      case "Paused":
        return "warning"
      case "Not Started":
        return "secondary"
      case "Cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const isOverdue = (task: Task) => {
    return new Date(task.completion_date) < new Date() && task.status !== "Completed"
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className={isOverdue(task) ? "border-destructive" : ""}>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="space-y-1">
                <h4 className="font-medium">{task.description}</h4>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  Due: {format(new Date(task.completion_date), "MMM d, yyyy")}
                  {isOverdue(task) && (
                    <Badge variant="destructive" className="ml-2">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <Badge variant={getPriorityColor(task.priority) as any}>{task.priority}</Badge>
                <Badge variant={getStatusColor(task.status) as any}>{task.status}</Badge>
                <Link href={`/tasks/${task.id}`}>
                  <Button variant="ghost" size="sm">
                    View Details
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

