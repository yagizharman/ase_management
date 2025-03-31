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
import { Search, Mail, Phone, BarChart3 } from "lucide-react"
import Link from "next/link"

interface TeamMember {
  userId: string
  fullName: string
  email: string
  role: string
  team: string
  phone?: string
  avatar?: string
  taskCount: number
  completedTasks: number
  activeHours: number
}

export default function TeamPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        // In a real app, you would fetch from your API
        // const response = await fetch(`/api/users`);
        // const data = await response.json();

        // Mock data for demonstration
        setTimeout(() => {
          const mockTeamMembers: TeamMember[] = [
            {
              userId: "1",
              fullName: "John Doe",
              email: "john.doe@example.com",
              role: "Manager",
              team: "Development",
              phone: "+1 (555) 123-4567",
              taskCount: 5,
              completedTasks: 2,
              activeHours: 38,
            },
            {
              userId: "2",
              fullName: "Jane Smith",
              email: "jane.smith@example.com",
              role: "Developer",
              team: "Development",
              phone: "+1 (555) 234-5678",
              taskCount: 8,
              completedTasks: 5,
              activeHours: 42,
            },
            {
              userId: "3",
              fullName: "Bob Johnson",
              email: "bob.johnson@example.com",
              role: "Developer",
              team: "Development",
              phone: "+1 (555) 345-6789",
              taskCount: 6,
              completedTasks: 3,
              activeHours: 35,
            },
            {
              userId: "4",
              fullName: "Alice Williams",
              email: "alice.williams@example.com",
              role: "Designer",
              team: "Design",
              phone: "+1 (555) 456-7890",
              taskCount: 4,
              completedTasks: 2,
              activeHours: 32,
            },
            {
              userId: "5",
              fullName: "Charlie Brown",
              email: "charlie.brown@example.com",
              role: "QA Engineer",
              team: "QA",
              phone: "+1 (555) 567-8901",
              taskCount: 7,
              completedTasks: 4,
              activeHours: 40,
            },
          ]

          setTeamMembers(mockTeamMembers)
          setFilteredMembers(mockTeamMembers)
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Failed to fetch team members:", error)
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
          member.fullName.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          member.role.toLowerCase().includes(query) ||
          member.team.toLowerCase().includes(query),
      )
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(teamMembers)
    }
  }, [teamMembers, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <div className="relative w-full sm:w-64 md:w-80">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Members</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="qa">QA</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full" />
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <TeamMemberCard key={member.userId} member={member} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-medium">No team members found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search query.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers
                .filter((member) => member.team === "Development")
                .map((member) => (
                  <TeamMemberCard key={member.userId} member={member} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="design" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers
                .filter((member) => member.team === "Design")
                .map((member) => (
                  <TeamMemberCard key={member.userId} member={member} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="qa" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers
                .filter((member) => member.team === "QA")
                .map((member) => (
                  <TeamMemberCard key={member.userId} member={member} />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Overview of team productivity and task completion</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-2" />
              <p>Team performance chart would appear here</p>
              <Button variant="link" asChild>
                <Link href="/analytics">View detailed analytics</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.avatar} alt={member.fullName} />
            <AvatarFallback>
              {member.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="font-medium">{member.fullName}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {member.role}
              </Badge>
              <span>{member.team}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm">
            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center text-sm">
              <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{member.phone}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-medium">{member.taskCount}</div>
            <div className="text-xs text-muted-foreground">Tasks</div>
          </div>
          <div>
            <div className="text-lg font-medium">{member.completedTasks}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="text-lg font-medium">{member.activeHours}h</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/team/${member.userId}`}>View Profile</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/tasks?assignedTo=${member.userId}`}>View Tasks</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

