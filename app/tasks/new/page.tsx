"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { emailService } from "@/lib/email-service"
import { toast } from "sonner"

interface User {
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
  user_id: number
  role: string
  planned_labor: number
  actual_labor: number
}

interface TaskFormData {
  description: string
  priority: string
  team_id: number
  start_date: string
  completion_date: string
  planned_labor: number
  work_size: number
  roadmap: string
  status: string
  assignees: TaskAssignee[]
}

export default function NewTaskPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const roadmapRef = useRef<HTMLTextAreaElement>(null)
  const isManager = user?.role === "manager"

  const [formData, setFormData] = useState<TaskFormData>({
    description: "",
    priority: "Medium",
    team_id: user?.team_id || 0,
    start_date: format(new Date(), "yyyy-MM-dd"),
    completion_date: "",
    planned_labor: 0,
    work_size: 3,
    roadmap: "",
    status: "Not Started",
    assignees: [
      {
        user_id: user?.id || 0,
        role: "assignee",
        planned_labor: 0,
        actual_labor: 0,
      },
    ],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch users
        const usersData = await api.get("/users")
        setUsers(usersData)

        // Fetch teams
        const teamsData = await api.get("/teams")
        setTeams(teamsData)

        // Update form with current user's team
        if (user?.team_id) {
          setFormData((prev) => ({
            ...prev,
            team_id: user.team_id,
          }))
        }
      } catch (err: any) {
        setError(err.message || "Veri yüklenirken hata oluştu")
        console.error("Veri yüklenirken hata:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.team_id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAssigneeChange = (index: number, field: string, value: any) => {
    // For user_id field, check if employee is trying to add themselves as partner
    if (field === "user_id" && !isManager) {
      const assignee = formData.assignees[index]
      if (assignee.role === "partner" && value === user?.id) {
        toast.error("Kendinizi görev ortağı olarak ekleyemezsiniz")
        return
      }
    }

    setFormData((prev) => {
      const updatedAssignees = [...prev.assignees]
      updatedAssignees[index] = {
        ...updatedAssignees[index],
        [field]: value,
      }
      return {
        ...prev,
        assignees: updatedAssignees,
      }
    })
  }

  const addAssignee = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      assignees: [
        ...prev.assignees,
        {
          user_id: 0,
          role,
          planned_labor: 0,
          actual_labor: 0,
        },
      ],
    }))
  }

  const removeAssignee = (index: number) => {
    setFormData((prev) => {
      const updatedAssignees = [...prev.assignees]
      updatedAssignees.splice(index, 1)
      return {
        ...prev,
        assignees: updatedAssignees,
      }
    })
  }

  const countRoadmapLines = (text: string): number => {
    if (!text) return 0
    return text.split("\n").length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.description) {
      setError("Açıklama zorunludur")
      toast.error("Açıklama zorunludur")
      return
    }

    if (!formData.completion_date) {
      setError("Tamamlanma tarihi zorunludur")
      toast.error("Tamamlanma tarihi zorunludur")
      return
    }

    if (!formData.roadmap) {
      setError("Yol haritası zorunludur")
      toast.error("Yol haritası zorunludur")
      return
    }

    // Check if roadmap has at least 20 lines
    if (countRoadmapLines(formData.roadmap) < 20) {
      setError("Yol haritası en az 20 satır olmalıdır")
      toast.error("Yol haritası en az 20 satır olmalıdır")
      if (roadmapRef.current) {
        roadmapRef.current.focus()
      }
      return
    }

    if (formData.assignees.filter((a) => a.role === "assignee").length === 0) {
      setError("Bir görevli gereklidir")
      toast.error("Bir görevli gereklidir")
      return
    }

    if (formData.assignees.filter((a) => a.role === "assignee").length > 1) {
      setError("Sadece bir görevli olabilir")
      toast.error("Sadece bir görevli olabilir")
      return
    }

    if (formData.assignees.some((a) => a.user_id === 0)) {
      setError("Tüm görevliler için bir kullanıcı seçilmelidir")
      toast.error("Tüm görevliler için bir kullanıcı seçilmelidir")
      return
    }

    if (formData.assignees.filter((a) => a.role === "partner").some((p) => p.user_id === 0 || p.planned_labor <= 0)) {
      setError("Tüm görev ortakları için bir kullanıcı seçilmeli ve planlanan iş saati girilmelidir")
      toast.error("Tüm görev ortakları için bir kullanıcı seçilmeli ve planlanan iş saati girilmelidir")
      return
    }

    // Check if there are more than 5 task partners
    const partnerCount = formData.assignees.filter((a) => a.role === "partner").length
    if (partnerCount > 5) {
      setError("En fazla 5 görev ortağı eklenebilir")
      toast.error("En fazla 5 görev ortağı eklenebilir")
      return
    }

    // Yönetici tarafından oluşturulan görevlerde, aynı kişi hem görevli hem de görev ortağı olamaz
    if (isManager) {
      const assigneeId = formData.assignees.find((a) => a.role === "assignee")?.user_id
      const isAlsoPartner = formData.assignees.some((a) => a.role === "partner" && a.user_id === assigneeId)

      if (isAlsoPartner) {
        setError("Aynı kişi hem görevli hem de görev ortağı olamaz")
        toast.error("Aynı kişi hem görevli hem de görev ortağı olamaz")
        return
      }
    }

    // Çalışanlar kendilerini görev ortağı olarak ekleyemezler
    if (!isManager) {
      const isUserPartner = formData.assignees.some((a) => a.role === "partner" && a.user_id === user?.id)

      if (isUserPartner) {
        setError("Kendinizi görev ortağı olarak ekleyemezsiniz")
        toast.error("Kendinizi görev ortağı olarak ekleyemezsiniz")
        return
      }
    }

    try {
      setIsSubmitting(true)
      setError("")

      // Submit the form
      const createdTask = await api.post("/tasks", formData)

      // Send email notifications
      // 1. If manager creates a task, notify assignees
      if (user?.role === "manager") {
        // Get assignee emails
        const assigneeIds = formData.assignees.filter((a) => a.role === "assignee").map((a) => a.user_id)
        const assigneeUsers = users.filter((u) => assigneeIds.includes(u.id))
        const assigneeEmails = assigneeUsers.map((u) => u.email)

        if (assigneeEmails.length > 0) {
          await emailService.sendTaskAssignmentNotification(
            createdTask.id,
            formData.description,
            assigneeEmails,
            {
              id: createdTask.id,
              description: formData.description,
              priority: formData.priority as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
              team_id: formData.team_id,
              start_date: formData.start_date,
              completion_date: formData.completion_date,
              creator_id: user?.id || 0,
              planned_labor: formData.planned_labor,
              actual_labor: 0,
              work_size: formData.work_size,
              roadmap: formData.roadmap,
              status: formData.status as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
              assignees: formData.assignees.map(a => ({
                user_id: a.user_id,
                role: a.role,
                planned_labor: a.planned_labor,
                actual_labor: a.actual_labor,
                user: users.find(u => u.id === a.user_id)
              }))
            }
          )
        }
      }

      // 2. Send notifications to partners if there are any
      const partnerIds = formData.assignees.filter((a) => a.role === "partner").map((a) => a.user_id)
      if (partnerIds.length > 0) {
        const partnerUsers = users.filter((u) => partnerIds.includes(u.id))
        const partnerEmails = partnerUsers.map((u) => u.email)

        if (partnerEmails.length > 0) {
          await emailService.sendTaskPartnerNotification(
            createdTask.id,
            formData.description,
            partnerEmails,
            {
              id: createdTask.id,
              description: formData.description,
              priority: formData.priority as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
              team_id: formData.team_id,
              start_date: formData.start_date,
              completion_date: formData.completion_date,
              creator_id: user?.id || 0,
              planned_labor: formData.planned_labor,
              actual_labor: 0,
              work_size: formData.work_size,
              roadmap: formData.roadmap,
              status: formData.status as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
              assignees: formData.assignees.map(a => ({
                user_id: a.user_id,
                role: a.role,
                planned_labor: a.planned_labor,
                actual_labor: a.actual_labor,
                user: users.find(u => u.id === a.user_id)
              }))
            }
          )
        }
      }

      // 3. Send notifications to "notified" users if there are any
      const notifiedIds = formData.assignees.filter((a) => a.role === "notified").map((a) => a.user_id)
      if (notifiedIds.length > 0) {
        const notifiedUsers = users.filter((u) => notifiedIds.includes(u.id))
        const notifiedEmails = notifiedUsers.map((u) => u.email)

        if (notifiedEmails.length > 0) {
          await emailService.sendTaskNotificationToUsers(createdTask.id, formData.description, notifiedEmails, {
            id: createdTask.id,
            description: formData.description,
            priority: formData.priority as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
            team_id: formData.team_id,
            start_date: formData.start_date,
            completion_date: formData.completion_date,
            creator_id: user?.id || 0,
            planned_labor: formData.assignees.reduce((acc, curr) => acc + curr.planned_labor, 0),
            actual_labor: formData.assignees.reduce((acc, curr) => acc + curr.planned_labor, 0),
            work_size: formData.work_size,
            roadmap: formData.roadmap, 
          })
        }
      }

      toast.success("Görev başarıyla oluşturuldu")
      // Redirect to tasks page
      router.push("/tasks")
    } catch (err: any) {
      setError(err.message || "Görev oluşturulurken hata oluştu")
      toast.error("Görev oluşturulurken hata oluştu")
      console.error("Görev oluşturulurken hata:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const teamUsers = users.filter((u) => u.team_id === formData.team_id)
  const assigneeId = formData.assignees.find((a) => a.role === "assignee")?.user_id

  return (
    <AppShell>
      <div className="flex items-center mb-6">
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Görevlere Dön
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Görev Oluştur</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Görev Detayları</CardTitle>
              <CardDescription>Yeni görev için temel bilgileri girin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama *</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Görev açıklamasını girin"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik *</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                    <SelectTrigger id="priority">
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
                    value={teams.find((t) => t.id === formData.team_id)?.name || ""}
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
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="completion_date">Tamamlanma Tarihi *</Label>
                  <Input
                    id="completion_date"
                    name="completion_date"
                    type="date"
                    value={formData.completion_date}
                    onChange={handleInputChange}
                    required
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
                    value={formData.planned_labor}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_size">İş Büyüklüğü (1-5) *</Label>
                  <Select
                    value={formData.work_size.toString()}
                    onValueChange={(value) => handleSelectChange("work_size", value)}
                  >
                    <SelectTrigger id="work_size">
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
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="roadmap">
                    Yol Haritası * <span className="text-xs text-muted-foreground">(en az 20 satır)</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">{countRoadmapLines(formData.roadmap)} satır</span>
                </div>
                <Textarea
                  id="roadmap"
                  name="roadmap"
                  ref={roadmapRef}
                  value={formData.roadmap}
                  onChange={handleInputChange}
                  placeholder="Yapılması gerekenlerin adım adım açıklaması, her adım için tahmini süre (en az 20 satır)"
                  rows={10}
                  required
                  className={
                    countRoadmapLines(formData.roadmap) < 20 && formData.roadmap.length > 0 ? "border-destructive" : ""
                  }
                />
                {countRoadmapLines(formData.roadmap) < 20 && formData.roadmap.length > 0 && (
                  <p className="text-xs text-destructive">
                    Yol haritası en az 20 satır olmalıdır. Şu anda {countRoadmapLines(formData.roadmap)} satır var.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kişiler</CardTitle>
              <CardDescription>Bu göreve kişileri atayın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Görevli *</h3>
                  <p className="text-xs text-muted-foreground">Göreve sadece bir kişi atanabilir</p>
                </div>

                {formData.assignees
                  .filter((a) => a.role === "assignee")
                  .map((assignee, index) => {
                    const assigneeIndex = formData.assignees.findIndex((a) => a === assignee)
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
                              >
                                <SelectTrigger>
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
                              <Input value={user?.name || ""} disabled className="opacity-70" />
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
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Görev Ortakları</h3>
                    <p className="text-xs text-muted-foreground mt-1">En fazla 5 görev ortağı eklenebilir</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addAssignee("partner")}
                    disabled={formData.assignees.filter((a) => a.role === "partner").length >= 5}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ortak Ekle
                  </Button>
                </div>

                {formData.assignees
                  .filter((a) => a.role === "partner")
                  .map((partner, index) => {
                    const partnerIndex = formData.assignees.findIndex((a) => a === partner)

                    return (
                      <div key={index} className="rounded-md border p-4 bg-card">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                          <div className="space-y-2">
                            <Label>
                              Çalışan <span className="text-destructive">*</span>
                            </Label>
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
                            >
                              <SelectTrigger>
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
                            <Label>
                              Planlanan İş Saati <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={partner.planned_labor}
                              onChange={(e) =>
                                handleAssigneeChange(partnerIndex, "planned_labor", Number.parseFloat(e.target.value))
                              }
                            />
                          </div>

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
                        </div>
                      </div>
                    )
                  })}

                {formData.assignees.filter((a) => a.role === "partner").length === 0 && (
                  <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center">
                    Görev ortağı eklenmemiş. Ortaklar göreve katkıda bulunabilir ve kendi çalışma saatlerini
                    kaydedebilir.
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Bilgilendirilecek Kişiler</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addAssignee("notified")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Kişi Ekle
                  </Button>
                </div>

                {formData.assignees
                  .filter((a) => a.role === "notified")
                  .map((notified, index) => {
                    const notifiedIndex = formData.assignees.findIndex((a) => a === notified)
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
                            >
                              <SelectTrigger>
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
                        </div>
                      </div>
                    )
                  })}

                {formData.assignees.filter((a) => a.role === "notified").length === 0 && (
                  <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center">
                    Bilgilendirilecek kişi eklenmemiş
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={() => router.push("/tasks")}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Oluşturuluyor..." : "Görev Oluştur"}
              </Button>
            </CardFooter>
          </Card>

          {error && <div className="text-destructive text-center">{error}</div>}
        </div>
      </form>
    </AppShell>
  )
}

