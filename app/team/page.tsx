"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { AppShell } from "@/components/layout/app-shell"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Mail, Phone, Calendar, CheckCircle2, AlertTriangle, BarChart3, ArrowRight, Timer, CheckSquare, User, Users, Search } from 'lucide-react'
import Link from "next/link"

interface UserType {
  id: number
  name: string
  username: string
  email: string
  role: string
  team_id: number
}

interface TeamType {
  id: number
  name: string
  manager_id: number | null
}

interface UserWithTasksType extends UserType {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
}

export default function TeamPage() {
  const { user } = useAuth()
  const [team, setTeam] = useState<TeamType | null>(null)
  const [teamMembers, setTeamMembers] = useState<UserWithTasksType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!user) return

      try {
        setIsLoading(true)

        // Fetch all users
        const usersData = await api.get("/users")
        
        // Fetch team data
        const teamsData = await api.get("/teams")
        const userTeam = teamsData.find((t: TeamType) => t.id === user.team_id)
        setTeam(userTeam || null)

        // Filter users by team_id
        const teamUsers = usersData.filter((u: UserType) => u.team_id === user.team_id)
        
        // Fetch tasks for each user
        const usersWithTasks = await Promise.all(
          teamUsers.map(async (teamUser: UserType) => {
            try {
              const userTasks = await api.get(`/users/${teamUser.id}/tasks`)
              
              // Calculate task statistics
              const completedTasks = userTasks.filter((t: any) => t.status === "Completed").length
              const inProgressTasks = userTasks.filter((t: any) => t.status === "In Progress").length
              const overdueTasks = userTasks.filter((t: any) => {
                const completionDate = new Date(t.completion_date)
                completionDate.setHours(23, 59, 59, 999)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return completionDate < today && t.status !== "Completed"
              }).length

              return {
                ...teamUser,
                totalTasks: userTasks.length,
                completedTasks,
                inProgressTasks,
                overdueTasks
              }
            } catch (err) {
              console.error(`Error fetching tasks for user ${teamUser.id}:`, err)
              return {
                ...teamUser,
                totalTasks: 0,
                completedTasks: 0,
                inProgressTasks: 0,
                overdueTasks: 0
              }
            }
          })
        )

        setTeamMembers(usersWithTasks)
      } catch (err: any) {
        setError(err.message || "Ekip verileri yüklenirken hata oluştu")
        console.error("Error fetching team data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeamData()
  }, [user])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const filteredTeamMembers = teamMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <AppShell>
        <div className="p-4 text-destructive">Lütfen giriş yapın</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ekip Yönetimi</h1>
            <p className="text-muted-foreground">
              {team ? `${team.name} ekibinin üyelerini görüntüleyin ve yönetin` : "Ekip üyelerini görüntüleyin ve yönetin"}
            </p>
          </div>
          
          {user.role === "manager" && (
            <Button asChild>
              <Link href="/tasks/new">Yeni Görev Oluştur</Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="İsim, e-posta veya rol ile ara..." 
            className="max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-destructive">{error}</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeamMembers.map((member) => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 border-2 border-background">
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{member.name}</h3>
                          <Badge variant={member.role === "manager" ? "default" : "outline"}>
                            {member.role === "manager" ? "Yönetici" : "Çalışan"}
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="mr-1 h-3 w-3" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 px-6 py-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-sm font-medium">{member.totalTasks}</div>
                        <div className="text-xs text-muted-foreground">Toplam</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{member.inProgressTasks}</div>
                        <div className="text-xs text-muted-foreground">Devam Eden</div>
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${member.overdueTasks > 0 ? "text-destructive" : ""}`}>
                          {member.overdueTasks}
                        </div>
                        <div className="text-xs text-muted-foreground">Gecikmiş</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 flex justify-end">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/team/${member.id}`}>
                        <span className="mr-1">Detaylar</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredTeamMembers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Ekip üyesi bulunamadı</h3>
            <p className="text-muted-foreground">Arama kriterlerinize uygun ekip üyesi bulunamadı.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
