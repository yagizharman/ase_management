"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { LucideUser, Mail, Phone } from "lucide-react"
import Link from "next/link"

interface UserType {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  team_id: number
}

export default function TeamPage() {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<UserType[]>([])
  const [teamPerformance, setTeamPerformance] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch all users
        const usersData = await api.get("/users")

        // Filter users by team
        const teamUsers = usersData.filter((u: UserType & { team_id: number }) => u.team_id === user?.team_id)
        setTeamMembers(teamUsers)

        // Fetch team performance data
        const now = new Date()
        const startDate = startOfMonth(now)
        const endDate = endOfMonth(now)
        const formattedStartDate = format(startDate, "yyyy-MM-dd")
        const formattedEndDate = format(endDate, "yyyy-MM-dd")

        const performanceData = await api.get(
          `/analytics/team-performance?team_id=${user?.team_id}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        )

        // Add user names to the performance data
        const processedData = performanceData.map((item: any) => ({
          ...item,
          userName: teamUsers.find((u: UserType) => u.id === item.UserId)?.name || `Kullanıcı ${item.UserId}`,
          efficiency: item.TotalPlanned > 0 ? Math.round((item.TotalSpent / item.TotalPlanned) * 100) : 0,
        }))

        setTeamPerformance(processedData)
      } catch (err: any) {
        setError(err.message || "Ekip verileri yüklenirken hata oluştu")
        console.error("Error fetching team data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.team_id) {
      fetchData()
    }
  }, [user?.team_id])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Ekip Yönetimi</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ekip Üyeleri</CardTitle>
            <CardDescription>Ekibinizdeki üyeler ve rolleri</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-destructive">Hata: {error}</div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Ekip üyesi bulunamadı.</div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between border p-4 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                      <Badge variant={member.role === "manager" ? "default" : "outline"}>
                        {member.role === "manager" ? "Yönetici" : "Çalışan"}
                      </Badge>
                      <Link href={`/team/${member.id}`}>
                        <Button variant="outline" size="sm">
                          <LucideUser className="h-4 w-4 mr-2" />
                          Profili Görüntüle
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ekip Performansı</CardTitle>
            <CardDescription>Bu ayki performans metrikleri</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : error ? (
              <div className="text-destructive">Hata: {error}</div>
            ) : teamPerformance.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Bu ay için performans verisi bulunmuyor.</div>
            ) : (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamPerformance}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="userName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="TotalPlanned" fill="#3b82f6" name="Planlanan Saat" />
                    <Bar dataKey="TotalSpent" fill="#22c55e" name="Gerçekleşen Saat" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Görev Dağılımı</CardTitle>
            <CardDescription>Ekip üyeleri arasındaki mevcut görev dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : error ? (
              <div className="text-destructive">Hata: {error}</div>
            ) : teamPerformance.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Görev dağılımı verisi bulunmuyor.</div>
            ) : (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamPerformance}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="userName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#8884d8" name="Verimlilik (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

