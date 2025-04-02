"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface ManagerAlertsProps {
  teamId: number | undefined
}

export function ManagerAlerts({ teamId }: ManagerAlertsProps) {
  const [overdueTasks, setOverdueTasks] = useState<any[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])
  const [notStartedTasks, setNotStartedTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!teamId) return

      try {
        setIsLoading(true)

        // Fetch all team tasks
        const response = await api.get(`/tasks?team_id=${teamId}`)

        const now = new Date()

        // Filter overdue tasks
        const overdue = response.filter((task: any) => {
          const completionDate = new Date(task.completion_date)
          completionDate.setHours(23, 59, 59, 999) // Set to end of the day
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Set to start of the day
          return completionDate < today && task.status !== "Completed"
        })

        // Filter upcoming tasks (due in next 3 days)
        const upcoming = response.filter((task: any) => {
          const dueDate = new Date(task.completion_date)
          const today = new Date()
          
          // Set both dates to end of day for accurate comparison
          dueDate.setHours(23, 59, 59, 999)
          today.setHours(0, 0, 0, 0)
          
          const diffTime = dueDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          // Tasks due in next 3 days (not including today)
          return diffDays <= 3 && diffDays > 0 && task.status !== "Completed"
        })

        // Filter tasks that should have started but haven't
        const notStarted = response.filter((task: any) => {
          const startDate = new Date(task.start_date)
          return startDate <= now && task.status === "Not Started"
        })

        setOverdueTasks(overdue)
        setUpcomingTasks(upcoming)
        setNotStartedTasks(notStarted)
      } catch (err: any) {
        setError(err.message || "Uyarılar yüklenirken hata oluştu")
        console.error("Error fetching alerts:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlerts()

    // Set up polling for alerts every 5 minutes
    const intervalId = setInterval(fetchAlerts, 300000)
    return () => clearInterval(intervalId)
  }, [teamId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {overdueTasks.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gecikmiş Görevler</AlertTitle>
          <AlertDescription>
            {overdueTasks.length} adet {overdueTasks.length === 1 ? "görev" : "görev"} gecikmiş durumda.
            <Link href="/team-tasks?filter=overdue" className="block underline mt-2">
              Tüm gecikmiş görevleri görüntüle
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {upcomingTasks.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Yaklaşan Son Tarihler</AlertTitle>
          <AlertDescription>
            Önümüzdeki 3 gün içinde {upcomingTasks.length} {upcomingTasks.length === 1 ? "görevin" : "görevin"} son
            tarihi dolacak.
            <Link href="/team-tasks?filter=upcoming" className="block underline mt-2">
              Yaklaşan görevleri görüntüle
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {notStartedTasks.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Başlatılmamış Görevler</AlertTitle>
          <AlertDescription>
            {notStartedTasks.length} {notStartedTasks.length === 1 ? "görev" : "görev"} henüz başlatılmamış.
            <Link href="/team-tasks?filter=not-started" className="block underline mt-2">
              Başlatılmamış görevleri görüntüle
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {overdueTasks.length === 0 && upcomingTasks.length === 0 && notStartedTasks.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          Şu anda uyarı bulunmuyor. Ekibiniz yolunda ilerliyor!
        </div>
      )}

      {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Kritik Görevler</CardTitle>
            <CardDescription>Acil dikkat gerektiren görevler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium">{task.description}</div>
                    <div className="text-sm text-muted-foreground">
                      Son Tarih: {format(new Date(task.completion_date), "d MMMM yyyy", { locale: tr })}
                      <Badge variant="destructive" className="ml-2">
                        Gecikmiş
                      </Badge>
                    </div>
                    <div className="text-sm">
                      Görevli: {task.assignees.find((a: any) => a.role === "assignee")?.user?.name || "Atanmamış"}
                    </div>
                  </div>
                  <Link href={`/tasks/${task.id}`}>
                    <Button variant="outline" size="sm">
                      Görüntüle
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}

              {upcomingTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium">{task.description}</div>
                    <div className="text-sm text-muted-foreground">
                      Son Tarih: {format(new Date(task.completion_date), "d MMMM yyyy", { locale: tr })}
                      <Badge variant="default" className="ml-2">
                        Yakında Dolacak
                      </Badge>
                    </div>
                    <div className="text-sm">
                      Görevli: {task.assignees.find((a: any) => a.role === "assignee")?.user?.name || "Atanmamış"}
                    </div>
                  </div>
                  <Link href={`/tasks/${task.id}`}>
                    <Button variant="outline" size="sm">
                      Görüntüle
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

