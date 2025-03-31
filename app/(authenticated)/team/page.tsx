"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Mail, BarChart3 } from "lucide-react"
import Link from "next/link"
import { usersAPI, tasksAPI } from "@/lib/api"
import type { User } from "@/lib/types"
import { toast } from "sonner"

export default function TeamPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredMembers, setFilteredMembers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [memberStats, setMemberStats] = useState<{
    [key: string]: { taskCount: number; completedTasks: number; activeHours: number }
  }>({})

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) return

      try {
        setIsLoading(true)

        // Fetch all users from API
        const allUsers = await usersAPI.getAllUsers()
        setTeamMembers(allUsers)

        // Extract unique teams
        const uniqueTeams = Array.from(new Set(allUsers.map((member) => member.Team || "Diğer")))
        setTeams(uniqueTeams)

        // Fetch task stats for each member
        const statsPromises = allUsers.map(async (member) => {
          try {
            const memberTasks = await tasksAPI.getUserTasks(member.UserId)

            return {
              userId: member.UserId,
              stats: {
                taskCount: memberTasks.length,
                completedTasks: memberTasks.filter((t: any) => t.Status === "Completed").length,
                activeHours: memberTasks.reduce((sum: number, task: any) => sum + (task.SpentHours || 0), 0),
              },
            }
          } catch (error) {
            console.error(`Kullanıcı ${member.UserId} için görev istatistikleri alınamadı:`, error)
            return {
              userId: member.UserId,
              stats: {
                taskCount: 0,
                completedTasks: 0,
                activeHours: 0,
              },
            }
          }
        })

        const statsResults = await Promise.all(statsPromises)
        const statsMap = statsResults.reduce(
          (acc, item) => {
            acc[item.userId] = item.stats
            return acc
          },
          {} as { [key: string]: { taskCount: number; completedTasks: number; activeHours: number } },
        )

        setMemberStats(statsMap)
        setIsLoading(false)
      } catch (error) {
        console.error("Ekip üyeleri alınamadı:", error)
        toast.error("Ekip üyeleri yüklenemedi")
        setIsLoading(false)
      }
    }

    if (user) {
      fetchTeamMembers()
    }
  }, [user])

  useEffect(() => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const filtered = teamMembers.filter(
        (member) =>
          member.FullName.toLowerCase().includes(query) ||
          member.Email.toLowerCase().includes(query) ||
          member.Role.toLowerCase().includes(query) ||
          (member.Team && member.Team.toLowerCase().includes(query)),
      )
      setFilteredMembers(filtered)
    } else {
      // Filter by active tab
      if (activeTab === "all") {
        setFilteredMembers(teamMembers)
      } else {
        setFilteredMembers(teamMembers.filter((member) => member.Team === activeTab))
      }
    }
  }, [teamMembers, searchQuery, activeTab])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Ekip</h1>
        <div className="relative w-full sm:w-64 md:w-80">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ekip üyelerini ara..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Tüm Üyeler</TabsTrigger>
          {teams.map((team) => (
            <TabsTrigger key={team} value={team}>
              {team}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full" />
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <TeamMemberCard
                  key={member.UserId}
                  member={member}
                  stats={memberStats[member.UserId] || { taskCount: 0, completedTasks: 0, activeHours: 0 }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-medium">Ekip üyesi bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-1">Arama kriterlerinizi değiştirmeyi deneyin.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Ekip Performansı</CardTitle>
          <CardDescription>Ekip üretkenliği ve görev tamamlama oranları</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-2" />
              <p>Ekip performans grafiği burada görünecek</p>
              <Button variant="link" asChild>
                <Link href="/analytics">Detaylı analizi görüntüle</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface TeamMemberCardProps {
  member: User
  stats: {
    taskCount: number
    completedTasks: number
    activeHours: number
  }
}

function TeamMemberCard({ member, stats }: TeamMemberCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.avatar} alt={member.FullName} />
            <AvatarFallback>
              {member.FullName.split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="font-medium">{member.FullName}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {member.Role === "Manager" ? "Yönetici" : "Çalışan"}
              </Badge>
              <span>{member.Team || "Belirtilmemiş"}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm">
            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{member.Email}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-medium">{stats.taskCount}</div>
            <div className="text-xs text-muted-foreground">Görevler</div>
          </div>
          <div>
            <div className="text-lg font-medium">{stats.completedTasks}</div>
            <div className="text-xs text-muted-foreground">Tamamlanan</div>
          </div>
          <div>
            <div className="text-lg font-medium">{stats.activeHours}s</div>
            <div className="text-xs text-muted-foreground">Aktif</div>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/team/${member.UserId}`}>Profili Görüntüle</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/tasks?assignedTo=${member.UserId}`}>Görevleri Görüntüle</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

