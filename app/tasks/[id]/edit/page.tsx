"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Plus, Trash2, AlertTriangle, Eye } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { emailService } from "@/lib/email-service"

interface AppUser {
  id: number
  name: string
  email: string
  team_id: number
  role?: string
}

interface Team {
  id: number
  name: string
}

interface TaskAssignee {
  id?: number
  task_id?: number
  user_id: number
  role: string
  planned_labor: number
  actual_labor: number
  user?: AppUser
}

interface Task {
  id: number
  description: string
  priority: "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük"
  team_id: number
  start_date: string
  completion_date: string
  creator_id: number
  planned_labor: number
  actual_labor: number
  work_size: number
  roadmap: string
  status: "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled"
  assignees: TaskAssignee[]
}

export default function EditTaskPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isCreatedByManager, setIsCreatedByManager] = useState(false)
  const [creatorUser, setCreatorUser] = useState<AppUser | null>(null)
  const [userPermission, setUserPermission] = useState<"none" | "self" | "full">("none")
  const [effortLogOpen, setEffortLogOpen] = useState(false)
  const [selectedAssigneeIndex, setSelectedAssigneeIndex] = useState<number | null>(null)
  const [effortHours, setEffortHours] = useState<number>(0.5)
  const [effortDetails, setEffortDetails] = useState<string>("")
  const isManager = user?.role === "manager"

  const taskId = Array.isArray(id) ? id[0] : id

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch task data
        const taskData = await api.get(`/tasks/${taskId}`)

        // Fetch users
        const usersData = await api.get("/users")
        setUsers(usersData)

        // Find creator user
        const creator = usersData.find((u: AppUser) => u.id === taskData.creator_id)
        setCreatorUser(creator || null)

        // Check if created by manager
        if (creator && creator.role === "manager") {
          setIsCreatedByManager(true)
        }

        // Fetch teams
        const teamsData = await api.get("/teams")
        setTeams(teamsData)

        // Format dates for form
        if (taskData.start_date) {
          taskData.start_date = format(new Date(taskData.start_date), "yyyy-MM-dd")
        }
        if (taskData.completion_date) {
          taskData.completion_date = format(new Date(taskData.completion_date), "yyyy-MM-dd")
        }

        setTask(taskData)

        // Determine user permission level
        if (user) {
          if (taskData.creator_id === user.id || user.role === "manager") {
            // Creator or manager can edit everything
            setUserPermission("full")
          } else {
            // Check if user is assignee or partner
            const isAssigneeOrPartner = taskData.assignees.some(
              (a: TaskAssignee) => a.user_id === user.id && (a.role === "assignee" || a.role === "partner"),
            )

            if (isAssigneeOrPartner) {
              // Assignee or partner can only edit their own hours
              setUserPermission("self")
            } else {
              // No edit permissions
              setUserPermission("none")
              // Redirect to view page if no permissions
              toast.error("Bu görevi düzenleme yetkiniz yok")
              router.push(`/tasks/${taskId}`)
            }
          }
        }
      } catch (err: any) {
        setError(err.message || "Görev verileri yüklenirken hata oluştu")
        toast.error("Görev verileri yüklenirken hata oluştu")
        console.error("Error fetching task data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [taskId, user, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!task) return

    const { name, value } = e.target

    // If user can't edit all fields, only allow editing certain fields
    if (userPermission !== "full" && !["actual_labor"].includes(name)) {
      return
    }

    setTask({
      ...task,
      [name]: value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    if (!task) return

    // If user can't edit all fields, only allow editing status
    if (userPermission !== "full" && name !== "status") {
      return
    }

    setTask({
      ...task,
      [name]: name === "team_id" || name === "work_size" ? Number.parseInt(value) : value,
    })
  }

  const handleAssigneeChange = (index: number, field: string, value: any) => {
    if (!task) return

    const assignee = task.assignees[index]

    // If user can't edit all fields, only allow editing their own actual_labor
    if (userPermission !== "full" && (assignee.user_id !== user?.id || field !== "actual_labor")) {
      return
    }

    // For user_id field, check if employee is trying to add themselves as partner
    if (field === "user_id" && !isManager) {
      if (assignee.role === "partner" && value === user?.id) {
        toast.error("Kendinizi görev ortağı olarak ekleyemezsiniz")
        return
      }
    }

    // Yönetici tarafından oluşturulan görevlerde, aynı kişi hem görevli hem de görev ortağı olamaz
    if (isManager && field === "user_id" && assignee.role === "partner") {
      const assigneeId = task.assignees.find((a) => a.role === "assignee")?.user_id
      if (value === assigneeId) {
        toast.error("Aynı kişi hem görevli hem de görev ortağı olamaz")
        return
      }
    }

    const updatedAssignees = [...task.assignees]
    updatedAssignees[index] = {
      ...updatedAssignees[index],
      [field]: field === "user_id" ? Number.parseInt(value) : value,
    }

    setTask({
      ...task,
      assignees: updatedAssignees,
    })
  }

  const addAssignee = (role: string) => {
    if (!task || userPermission !== "full") return

    // Don't allow adding more than one assignee
    if (role === "assignee" && task.assignees.filter((a) => a.role === "assignee").length >= 1) {
      toast.error("Sadece bir görevli olabilir")
      return
    }

    // Don't allow adding more than 5 partners
    if (role === "partner" && task.assignees.filter((a) => a.role === "partner").length >= 5) {
      toast.error("En fazla 5 görev ortağı eklenebilir")
      return
    }

    setTask({
      ...task,
      assignees: [
        ...task.assignees,
        {
          user_id: 0,
          role,
          planned_labor: 0,
          actual_labor: 0,
        },
      ],
    })
  }

  const removeAssignee = (index: number) => {
    if (!task || userPermission !== "full") return

    const assignee = task.assignees[index]

    // Don't allow removing the only assignee
    if (assignee.role === "assignee" && task.assignees.filter((a) => a.role === "assignee").length <= 1) {
      toast.error("En az bir görevli gereklidir")
      return
    }

    const updatedAssignees = [...task.assignees]
    updatedAssignees.splice(index, 1)

    setTask({
      ...task,
      assignees: updatedAssignees,
    })
  }

  const openEffortLogDialog = (index: number) => {
    if (!task) return

    const assignee = task.assignees[index]
    if (assignee.user_id !== user?.id) {
      toast.error("Sadece kendi çalışma saatlerinizi güncelleyebilirsiniz")
      return
    }

    setSelectedAssigneeIndex(index)
    setEffortHours(0.5)
    setEffortDetails("")
    setEffortLogOpen(true)
  }

  const handleEffortSubmit = async () => {
    if (!task || selectedAssigneeIndex === null || effortHours <= 0) return

    try {
      setIsSubmitting(true)
      const assignee = task.assignees[selectedAssigneeIndex]

      // Update the assignee's actual labor
      const updatedAssignees = [...task.assignees]
      updatedAssignees[selectedAssigneeIndex] = {
        ...assignee,
        actual_labor: assignee.actual_labor + effortHours,
      }

      // Update local state
      setTask({
        ...task,
        assignees: updatedAssignees,
        actual_labor: task.actual_labor + effortHours,
      })

      // Send update to API
      await api.put(`/tasks/${taskId}`, {
        assignees: [
          {
            user_id: assignee.user_id,
            role: assignee.role,
            planned_labor: assignee.planned_labor,
            actual_labor: assignee.actual_labor + effortHours,
          },
        ],
        // Add history entry with details
        history_note: effortDetails
          ? `${effortHours} saat çalışma: ${effortDetails}`
          : `${effortHours} saat çalışma kaydedildi`,
      })

      toast.success(`${effortHours} saat çalışma kaydedildi`)
      setEffortLogOpen(false)

      // Send email notification to manager if the user is not a manager
      if (user?.role !== "manager") {
        // Find the team manager
        const teamManager = users.find((u) => u.role === "manager" && u.team_id === user?.team_id)

        if (teamManager) {
          console.log("Sending email with task details:", {
            id: task.id,
            description: task.description,
            priority: task.priority,
            team_id: task.team_id,
            start_date: task.start_date,
            completion_date: task.completion_date,
            creator_id: task.creator_id,
            planned_labor: task.planned_labor,
            actual_labor: task.actual_labor + effortHours,
            work_size: task.work_size,
            roadmap: task.roadmap,
            status: task.status
          });

          await emailService.sendTaskUpdateNotification(
            task.id,
            task.description,
            teamManager.email,
            effortDetails ? `${effortHours} saat çalışma: ${effortDetails}` : `${effortHours} saat çalışma kaydedildi`,
            {
              id: task.id,
              description: task.description,
              priority: task.priority as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
              team_id: task.team_id,
              start_date: task.start_date,
              completion_date: task.completion_date,
              creator_id: task.creator_id,
              planned_labor: task.planned_labor,
              actual_labor: task.actual_labor + effortHours,
              work_size: task.work_size,
              roadmap: task.roadmap,
              status: task.status as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
              assignees: task.assignees.map(a => ({
                user_id: a.user_id,
                role: a.role,
                planned_labor: a.planned_labor,
                actual_labor: a.user_id === assignee.user_id ? a.actual_labor + effortHours : a.actual_labor,
                user: users.find(u => u.id === a.user_id)
              }))
            },
            user?.name || "Bir kullanıcı"
          )
        }
      }
    } catch (error) {
      console.error("Error logging effort:", error)
      toast.error("Çalışma saati kaydedilirken hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!task) return

    // Validate form
    if (userPermission === "full") {
      if (!task.description) {
        setError("Açıklama zorunludur")
        toast.error("Açıklama zorunludur")
        return
      }

      if (!task.completion_date) {
        setError("Tamamlanma tarihi zorunludur")
        toast.error("Tamamlanma tarihi zorunludur")
        return
      }

      if (!task.roadmap) {
        setError("Yol haritası zorunludur")
        toast.error("Yol haritası zorunludur")
        return
      }

      if (task.assignees.filter((a) => a.role === "assignee").length === 0) {
        setError("Bir görevli gereklidir")
        toast.error("Bir görevli gereklidir")
        return
      }

      if (task.assignees.filter((a) => a.role === "assignee").length > 1) {
        setError("Sadece bir görevli olabilir")
        toast.error("Sadece bir görevli olabilir")
        return
      }

      if (task.assignees.some((a) => a.user_id === 0)) {
        setError("Tüm görevliler için bir kullanıcı seçilmelidir")
        toast.error("Tüm görevliler için bir kullanıcı seçilmelidir")
        return
      }

      // Check if there are more than 5 task partners
      const partnerCount = task.assignees.filter((a) => a.role === "partner").length
      if (partnerCount > 5) {
        setError("En fazla 5 görev ortağı eklenebilir")
        toast.error("En fazla 5 görev ortağı eklenebilir")
        return
      }

      // Yönetici tarafından oluşturulan görevlerde, aynı kişi hem görevli hem de görev ortağı olamaz
      if (isManager) {
        const assigneeId = task.assignees.find((a) => a.role === "assignee")?.user_id
        const isAlsoPartner = task.assignees.some((a) => a.role === "partner" && a.user_id === assigneeId)

        if (isAlsoPartner) {
          setError("Aynı kişi hem görevli hem de görev ortağı olamaz")
          toast.error("Aynı kişi hem görevli hem de görev ortağı olamaz")
          return
        }
      }

      // Çalışanlar kendilerini görev ortağı olarak ekleyemezler
      if (!isManager) {
        const isUserPartner = task.assignees.some((a) => a.role === "partner" && a.user_id === user?.id)

        if (isUserPartner) {
          setError("Kendinizi görev ortağı olarak ekleyemezsiniz")
          toast.error("Kendinizi görev ortağı olarak ekleyemezsiniz")
          return
        }
      }
    }

    try {
      setIsSubmitting(true)
      setError("")

      // Prepare update data based on user permissions
      let updateData: any = {}

      if (userPermission === "full") {
        // Full update for creators and managers
        updateData = {
          description: task.description,
          priority: task.priority,
          team_id: task.team_id,
          start_date: task.start_date,
          completion_date: task.completion_date,
          planned_labor: task.planned_labor,
          work_size: task.work_size,
          roadmap: task.roadmap,
          status: task.status,
          assignees: task.assignees.map((a) => ({
            user_id: a.user_id,
            role: a.role,
            planned_labor: a.planned_labor,
            actual_labor: a.actual_labor,
          })),
        }
      } else if (userPermission === "self") {
        // Limited update for assignees/partners - only their own actual_labor and status
        updateData = {
          status: task.status,
        }

        // Find current user's assignee record
        const userAssignee = task.assignees.find(
          (a) => a.user_id === user?.id && (a.role === "assignee" || a.role === "partner"),
        )

        if (userAssignee) {
          // Update only this user's actual_labor
          updateData.assignees = task.assignees
            .filter((a) => a.user_id === user?.id && (a.role === "assignee" || a.role === "partner"))
            .map((a) => ({
              user_id: a.user_id,
              role: a.role,
              planned_labor: a.planned_labor,
              actual_labor: a.actual_labor,
            }))
        }
      }

      // Add history note for the update
      const updateDetails = `Status updated to: ${task.status}`
      updateData.history_note = updateDetails

      // Submit the form
      const updatedTask = await api.put(`/tasks/${taskId}`, updateData)

      // Send email notification to manager if the user is not a manager
      if (user?.role !== "manager") {
        // Find the team manager
        const teamManager = users.find((u) => u.role === "manager" && u.team_id === user?.team_id)

        if (teamManager) {
          await emailService.sendTaskUpdateNotification(
            task.id,
            task.description,
            teamManager.email,
            updateDetails,
            {
              id: task.id,
              description: task.description,
              priority: task.priority as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
              team_id: task.team_id,
              start_date: task.start_date,
              completion_date: task.completion_date,
              creator_id: task.creator_id,
              planned_labor: task.planned_labor,
              actual_labor: task.actual_labor,
              work_size: task.work_size,
              roadmap: task.roadmap,
              status: task.status as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
              assignees: task.assignees.map(a => ({
                user_id: a.user_id,
                role: a.role,
                planned_labor: a.planned_labor,
                actual_labor: a.actual_labor,
                user: users.find(u => u.id === a.user_id)
              }))
            },
            user?.name
          )
        }
      }

      toast.success("Görev başarıyla güncellendi")

      // Redirect to task details page
      router.push(`/tasks/${taskId}`)
    } catch (err: any) {
      setError(err.message || "Görev güncellenirken hata oluştu")
      toast.error("Görev güncellenirken hata oluştu")
      console.error("Error updating task:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !task) {
    return (
      <AppShell>
        <div className="flex items-center mb-6">
          <Link href={`/tasks/${taskId}`}>
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Göreve Geri Dön
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Görev Yükleniyor...</h1>
        </div>

        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    )
  }

  const teamUsers = users.filter((u) => u.team_id === task.team_id)
  const assigneeId = task.assignees.find((a) => a.role === "assignee")?.user_id

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/tasks/${taskId}`}>
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Göreve Geri Dön
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Görevi Düzenle</h1>
        </div>

        {userPermission !== "full" && (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            <Eye className="h-3 w-3 mr-1" />
            Sınırlı Düzenleme
          </Badge>
        )}
      </div>

      {isCreatedByManager && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          <p className="text-yellow-700">
            Bu görev bir yönetici tarafından oluşturulmuştur. Sadece kendi parametrelerinizi düzenleyebilirsiniz.
          </p>
        </div>
      )}

      {userPermission === "self" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700">
            Bu görevde sadece kendi iş saatlerinizi ve görev durumunu güncelleyebilirsiniz.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Görev Detayları</CardTitle>
              <CardDescription>Görev için temel bilgileri düzenleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama *</Label>
                <Input
                  id="description"
                  name="description"
                  value={task.description}
                  onChange={handleInputChange}
                  placeholder="Görev açıklamasını girin"
                  required
                  disabled={userPermission !== "full"}
                  className={userPermission !== "full" ? "opacity-70" : ""}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik *</Label>
                  <Select
                    value={task.priority}
                    onValueChange={(value) => handleSelectChange("priority", value)}
                    disabled={userPermission !== "full"}
                  >
                    <SelectTrigger id="priority" className={userPermission !== "full" ? "opacity-70" : ""}>
                      <SelectValue placeholder="Öncelik seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">Yüksek</SelectItem>
                      <SelectItem value="Medium">Orta</SelectItem>
                      <SelectItem value="Low">Düşük</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Ekip *</Label>
                  <Input
                    id="team"
                    value={teams.find((t) => t.id === task.team_id)?.name || ""}
                    disabled
                    className="opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">Başlangıç Tarihi *</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={task.start_date}
                    onChange={handleInputChange}
                    required
                    disabled={userPermission !== "full"}
                    className={userPermission !== "full" ? "opacity-70" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="completion_date">Tamamlanma Tarihi *</Label>
                  <Input
                    id="completion_date"
                    name="completion_date"
                    type="date"
                    value={task.completion_date}
                    onChange={handleInputChange}
                    required
                    disabled={userPermission !== "full"}
                    className={userPermission !== "full" ? "opacity-70" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planned_labor">Planlanan İş Saati *</Label>
                  <Input
                    id="planned_labor"
                    name="planned_labor"
                    type="number"
                    min="0"
                    step="0.5"
                    value={task.planned_labor}
                    onChange={handleInputChange}
                    required
                    disabled={userPermission !== "full"}
                    className={userPermission !== "full" ? "opacity-70" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_size">İş Büyüklüğü (1-5) *</Label>
                  <Select
                    value={task.work_size.toString()}
                    onValueChange={(value) => handleSelectChange("work_size", value)}
                    disabled={userPermission !== "full"}
                  >
                    <SelectTrigger id="work_size" className={userPermission !== "full" ? "opacity-70" : ""}>
                      <SelectValue placeholder="İş büyüklüğü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (En Düşük)</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5 (En Yüksek)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Durum *</Label>
                  <Select value={task.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Başlamadı</SelectItem>
                      <SelectItem value="In Progress">Devam Ediyor</SelectItem>
                      <SelectItem value="Paused">Duraklatıldı</SelectItem>
                      <SelectItem value="Completed">Tamamlandı</SelectItem>
                      <SelectItem value="Cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roadmap">Yol Haritası *</Label>
                <Textarea
                  id="roadmap"
                  name="roadmap"
                  value={task.roadmap}
                  onChange={handleInputChange}
                  placeholder="Yapılması gerekenlerin adım adım açıklaması, her adım için tahmini süre (en az 20 satır)"
                  rows={10}
                  required
                  disabled={userPermission !== "full"}
                  className={userPermission !== "full" ? "opacity-70" : ""}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kişiler</CardTitle>
              <CardDescription>Bu göreve atanan kişileri düzenleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assignees Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Görevli *</h3>
                  <p className="text-xs text-muted-foreground">Göreve sadece bir kişi atanabilir</p>
                </div>

                {task.assignees
                  .filter((a) => a.role === "assignee")
                  .map((assignee, index) => {
                    const assigneeIndex = task.assignees.findIndex((a) => a === assignee)
                    const isCurrentUser = assignee.user_id === user?.id

                    return (
                      <div key={index} className="rounded-md border p-4 bg-card">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                          <div className="space-y-2">
                            <Label>Çalışan *</Label>
                            {isManager ? (
                              <Select
                                value={assignee.user_id.toString()}
                                onValueChange={(value) =>
                                  handleAssigneeChange(assigneeIndex, "user_id", Number.parseInt(value))
                                }
                                disabled={userPermission !== "full"}
                              >
                                <SelectTrigger className={userPermission !== "full" ? "opacity-70" : ""}>
                                  <SelectValue placeholder="Çalışan seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input value={assignee.user?.name || user?.name || ""} disabled className="opacity-70" />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Planlanan İş Saati</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={assignee.planned_labor}
                              onChange={(e) =>
                                handleAssigneeChange(assigneeIndex, "planned_labor", Number.parseFloat(e.target.value))
                              }
                              disabled={userPermission !== "full"}
                              className={userPermission !== "full" ? "opacity-70" : ""}
                            />
                          </div>

                          <div className="space-y-2 flex items-end gap-2">
                            <div className="flex-1">
                              <Label>Gerçekleşen İş Saati</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={assignee.actual_labor}
                                onChange={(e) =>
                                  handleAssigneeChange(assigneeIndex, "actual_labor", Number.parseFloat(e.target.value))
                                }
                                disabled={!isCurrentUser && userPermission !== "full"}
                                className={!isCurrentUser && userPermission !== "full" ? "opacity-70" : ""}
                              />
                            </div>

                            {isCurrentUser && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => openEffortLogDialog(assigneeIndex)}
                                title="Çalışma Kaydı Ekle"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <Separator />

              {/* Task Partners Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Görev Ortakları</h3>
                    <p className="text-xs text-muted-foreground mt-1">En fazla 5 görev ortağı eklenebilir</p>
                  </div>
                  {userPermission === "full" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addAssignee("partner")}
                      disabled={task.assignees.filter((a) => a.role === "partner").length >= 5}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ortak Ekle
                    </Button>
                  )}
                </div>

                {task.assignees
                  .filter((a) => a.role === "partner")
                  .map((partner, index) => {
                    const partnerIndex = task.assignees.findIndex((a) => a === partner)
                    const isCurrentUserPartner = partner.user_id === user?.id

                    return (
                      <div key={index} className="rounded-md border p-4 bg-card">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                          <div className="space-y-2">
                            <Label>Çalışan</Label>
                            <Select
                              value={partner.user_id.toString()}
                              onValueChange={(value) => {
                                const userId = Number.parseInt(value)

                                // Yönetici tarafından oluşturulan görevlerde, aynı kişi hem görevli hem de görev ortağı olamaz
                                if (isManager && userId === assigneeId) {
                                  toast.error("Aynı kişi hem görevli hem de görev ortağı olamaz")
                                  return
                                }

                                // Çalışanlar kendilerini görev ortağı olarak ekleyemezler
                                if (!isManager && userId === user?.id) {
                                  toast.error("Kendinizi görev ortağı olarak ekleyemezsiniz")
                                  return
                                }

                                handleAssigneeChange(partnerIndex, "user_id", userId)
                              }}
                              disabled={userPermission !== "full"}
                            >
                              <SelectTrigger className={userPermission !== "full" ? "opacity-70" : ""}>
                                <SelectValue placeholder="Çalışan seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamUsers
                                  .filter((u) => !isManager || u.id !== assigneeId) // Yönetici ise, görevli olarak atanan kişiyi filtrele
                                  .filter((u) => isManager || u.id !== user?.id) // Çalışan ise, kendisini filtrele
                                  .map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Planlanan İş Saati</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={partner.planned_labor}
                              onChange={(e) =>
                                handleAssigneeChange(partnerIndex, "planned_labor", Number.parseFloat(e.target.value))
                              }
                              disabled={userPermission !== "full"}
                              className={userPermission !== "full" ? "opacity-70" : ""}
                            />
                          </div>

                          <div className="space-y-2 flex items-end gap-2">
                            <div className="flex-1">
                              <Label>Gerçekleşen İş Saati</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={partner.actual_labor}
                                onChange={(e) =>
                                  handleAssigneeChange(partnerIndex, "actual_labor", Number.parseFloat(e.target.value))
                                }
                                disabled={!isCurrentUserPartner && userPermission !== "full"}
                                className={!isCurrentUserPartner && userPermission !== "full" ? "opacity-70" : ""}
                              />
                            </div>

                            {isCurrentUserPartner && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => openEffortLogDialog(partnerIndex)}
                                title="Çalışma Kaydı Ekle"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {userPermission === "full" && (
                            <div className="flex items-center sm:ml-4 sm:col-span-3 justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAssignee(partnerIndex)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Kaldır</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                {task.assignees.filter((a) => a.role === "partner").length === 0 && (
                  <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center">
                    Görev ortağı eklenmemiş
                  </div>
                )}
              </div>

              <Separator />

              {/* Notified People Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Bilgilendirilecek Kişiler</h3>
                  {userPermission === "full" && (
                    <Button type="button" variant="outline" size="sm" onClick={() => addAssignee("notified")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Kişi Ekle
                    </Button>
                  )}
                </div>

                {task.assignees
                  .filter((a) => a.role === "notified")
                  .map((notified, index) => {
                    const notifiedIndex = task.assignees.findIndex((a) => a === notified)

                    return (
                      <div key={index} className="rounded-md border p-4 bg-card">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
                          <div className="space-y-2">
                            <Label>Çalışan</Label>
                            <Select
                              value={notified.user_id.toString()}
                              onValueChange={(value) =>
                                handleAssigneeChange(notifiedIndex, "user_id", Number.parseInt(value))
                              }
                              disabled={userPermission !== "full"}
                            >
                              <SelectTrigger className={userPermission !== "full" ? "opacity-70" : ""}>
                                <SelectValue placeholder="Çalışan seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {userPermission === "full" && (
                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAssignee(notifiedIndex)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Kaldır</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                {task.assignees.filter((a) => a.role === "notified").length === 0 && (
                  <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center">
                    Bilgilendirilecek kişi eklenmemiş
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={() => router.push(`/tasks/${taskId}`)}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Güncelleniyor..." : "Görevi Güncelle"}
              </Button>
            </CardFooter>
          </Card>

          {error && <div className="text-destructive text-center">{error}</div>}
        </div>
      </form>

      <Dialog open={effortLogOpen} onOpenChange={setEffortLogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Çalışma Kaydı Ekle</DialogTitle>
            <DialogDescription>Bu görev için harcadığınız çalışma saatini ve detayları girin.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hours" className="text-right">
                Saat
              </Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                step="0.5"
                value={effortHours || ""}
                onChange={(e) => setEffortHours(Number.parseFloat(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="details" className="text-right pt-2">
                Detaylar
              </Label>
              <Textarea
                id="details"
                value={effortDetails}
                onChange={(e) => setEffortDetails(e.target.value)}
                placeholder="Yapılan çalışma hakkında detaylar..."
                className="col-span-3 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleEffortSubmit} disabled={effortHours < 0.5 || isSubmitting}>
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

