"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AlertTriangle, Clock } from "lucide-react"

interface TeamMember {
  id: number
  name: string
  role: string
  tasks: {
    total: number
    completed: number
    overdue: number
    upcoming: number
  }
  efficiency: number
}

interface TeamPerformanceProps {
  teamId: number | undefined
}

export function TeamPerformance({ teamId }: TeamPerformanceProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTeamPerformance = async () => {
      if (!teamId) return

      try {
        setIsLoading(true)

        // Fetch team members
        const usersResponse = await api.get("/users")
        const teamMembers = usersResponse.filter((user: any) => user.team_id === teamId)

        // Fetch tasks for each team member
        const membersWithPerformance = await Promise.all(
          teamMembers.map(async (member: any) => {
            const tasksResponse = await api.get(`/users/${member.id}/tasks`)

            // Calculate task statistics
            const total = tasksResponse.length
            const completed = tasksResponse.filter((t: any) => t.status === "Completed").length

            // Calculate overdue tasks
            const overdue = tasksResponse.filter((t: any) => {
              const completionDate = new Date(t.completion_date)
              completionDate.setHours(23, 59, 59, 999) // Set to end of the day
              const today = new Date()
              today.setHours(0, 0, 0, 0) // Set to start of the day
              return completionDate < today && t.status !== "Completed"
            }).length

            // Calculate upcoming tasks (due in next 3 days)
            const upcoming = tasksResponse.filter((t: any) => {
              const dueDate = new Date(t.completion_date)
              const today = new Date()
              const diffTime = dueDate.getTime() - today.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              return diffDays <= 3 && diffDays > 0 && t.status !== "Completed"
            }).length

            // Calculate efficiency (actual vs planned labor)
            const totalPlannedLabor = tasksResponse.reduce((sum: number, t: any) => sum + t.planned_labor, 0)
            const totalActualLabor = tasksResponse.reduce((sum: number, t: any) => sum + t.actual_labor, 0)
            const efficiency = totalPlannedLabor > 0 ? Math.round((totalActualLabor / totalPlannedLabor) * 100) : 100

            return {
              id: member.id,
              name: member.name,
              role: member.role,
              tasks: {
                total,
                completed,
                overdue,
                upcoming,
              },
              efficiency,
            }
          }),
        )

        setMembers(membersWithPerformance)
      } catch (err: any) {
        setError(err.message || "Ekip performansı yüklenirken hata oluştu")
        console.error("Error fetching team performance:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeamPerformance()
  }, [teamId])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

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
    return <div className="text-center text-destructive">{error}</div>
  }

  if (members.length === 0) {
    return <div className="text-center text-muted-foreground">Ekip üyesi bulunamadı.</div>
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <Card key={member.id} className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{member.name}</h4>
                <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {member.tasks.overdue > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {member.tasks.overdue} Gecikmiş
                </Badge>
              )}
              {member.tasks.upcoming > 0 && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {member.tasks.upcoming} Yaklaşan
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Görev Tamamlama</span>
              <span className="font-medium">
                {member.tasks.completed}/{member.tasks.total}
              </span>
            </div>
            <Progress
              value={member.tasks.total > 0 ? (member.tasks.completed / member.tasks.total) * 100 : 0}
              className="h-2"
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verimlilik</span>
              <span className={`font-medium ${member.efficiency > 100 ? "text-destructive" : "text-green-600"}`}>
                {member.efficiency}%
              </span>
            </div>
            <Progress
              value={Math.min(member.efficiency, 100)}
              className="h-2"
              indicatorClassName={member.efficiency > 100 ? "bg-destructive" : ""}
            />
          </div>
        </Card>
      ))}
    </div>
  )
}

