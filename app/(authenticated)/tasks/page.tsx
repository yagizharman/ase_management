"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Filter } from "lucide-react"
import KanbanBoard from "@/components/kanban-board"
import TaskModal from "@/components/task-modal"
import { tasksAPI, usersAPI } from "@/lib/api"
import type { Task } from "@/lib/types"
import { toast } from "sonner"

export default function TasksPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  const fetchTasks = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Get all tasks
      const allTasks = await tasksAPI.getAllTasks()

      // Get team members to identify team tasks
      const teamMembers = await usersAPI.getAllUsers()
      const teamMates = teamMembers.filter((member: any) => member.Team === user.Team && member.UserId !== user.UserId)
      const teamMateIds = teamMates.map((member: any) => member.UserId)

      // Set tasks
      setTasks(allTasks)

      setIsLoading(false)
    } catch (error) {
      console.error("Görevler alınamadı:", error)
      toast.error("Görevler yüklenemedi")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [user])

  useEffect(() => {
    // Apply filters
    let result = [...tasks]

    // Filter by tab
    if (activeTab === "my") {
      result = result.filter((task) => task.AssignedToUserId === user?.UserId)
    } else if (activeTab === "team") {
      result = result.filter((task) => task.Team === user?.Team)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (task) =>
          task.Title.toLowerCase().includes(query) ||
          (task.Description && task.Description.toLowerCase().includes(query)),
      )
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.Priority === priorityFilter)
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((task) => task.Status === statusFilter)
    }

    setFilteredTasks(result)
  }, [tasks, searchQuery, priorityFilter, statusFilter, activeTab, user])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Görevler</h1>
        <Button onClick={() => setShowTaskModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Görev Oluştur
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList>
          <TabsTrigger value="all">Tüm Görevler</TabsTrigger>
          <TabsTrigger value="my">Görevlerim</TabsTrigger>
          <TabsTrigger value="team">Ekip Görevleri</TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Görevlerde ara..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <span>Öncelik</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                <SelectItem value="Low">Düşük</SelectItem>
                <SelectItem value="Medium">Orta</SelectItem>
                <SelectItem value="High">Yüksek</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <span>Durum</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="Not Started">Başlanmadı</SelectItem>
                <SelectItem value="In Progress">Devam Ediyor</SelectItem>
                <SelectItem value="Completed">Tamamlandı</SelectItem>
                <SelectItem value="On Hold">Duraklatıldı</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : filteredTasks.length > 0 ? (
            <KanbanBoard tasks={filteredTasks} onTaskUpdated={fetchTasks} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <h3 className="text-lg font-medium">Görev bulunamadı</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Filtrelerinizi ayarlayın veya yeni bir görev oluşturun.
              </p>
              <Button onClick={() => setShowTaskModal(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Görev Oluştur
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showTaskModal && (
        <TaskModal
          open={showTaskModal}
          onOpenChange={setShowTaskModal}
          onTaskCreated={() => {
            toast.success("Görev başarıyla oluşturuldu")
            fetchTasks()
          }}
        />
      )}
    </div>
  )
}

