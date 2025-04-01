"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"
import { AlertCircle, ArrowLeft, Calendar, Clock, Edit, Trash2, ShieldAlert, Eye } from "lucide-react"
import Link from "next/link"
import { TaskStatusUpdate } from "@/components/tasks/task-status-update"
import { TaskHistory } from "@/components/tasks/task-history"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface AppUser {
  id: number
  name: string
  email: string
  role: string
}

interface TaskAssignee {
  id: number
  task_id: number
  user_id: number
  role: string
  planned_labor: number
  actual_labor: number
  user?: AppUser
}

interface Task {
  id: number
  description: string
  priority: string
  team_id: number
  start_date: string
  completion_date: string
  creator_id: number
  planned_labor: number
  actual_labor: number
  work_size: number
  roadmap: string
  status: string
  assignees: TaskAssignee[]
  creator?: AppUser
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreatedByManager, setIsCreatedByManager] = useState(false)
  const [userPermission, setUserPermission] = useState<"view" | "edit">("view")

  const taskId = Array.isArray(id) ? id[0] : id

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsLoading(true)
        const taskData = await api.get(`/tasks/${taskId}`)

        // Fetch users to get creator details
        const usersData = await api.get("/users")
        setUsers(usersData)

        // Add user details to assignees
        if (taskData.assignees) {
          taskData.assignees = taskData.assignees.map((assignee: TaskAssignee) => {
            const assigneeUser = usersData.find((u: AppUser) => u.id === assignee.user_id)
            return {
              ...assignee,
              user: assigneeUser,
            }
          })
        }

        // Add creator details
        const creator = usersData.find((u: AppUser) => u.id === taskData.creator_id)
        taskData.creator = creator

        // Check if created by manager
        if (creator && creator.role === "manager") {
          setIsCreatedByManager(true)
        }

        setTask(taskData)

        // Determine user permission level
        if (user) {
          // Check if user is assignee or partner
          const isAssigneeOrPartner = taskData.assignees.some(
            (a: TaskAssignee) => a.user_id === user.id && (a.role === "assignee" || a.role === "partner"),
          )

          // Check if user is creator or manager
          const isCreatorOrManager = taskData.creator_id === user.id || user.role === "manager"

          // Set permission level
          if (isAssigneeOrPartner || isCreatorOrManager) {
            setUserPermission("edit")
          } else {
            setUserPermission("view")
          }
        }
      } catch (err: any) {
        setError(err.message || "Görev detayları yüklenirken hata oluştu")
        toast.error("Görev detayları yüklenirken hata oluştu")
        console.error("Error fetching task:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTask()
  }, [taskId, user])

  const handleStatusUpdate = async (newStatus: string) => {
    if (userPermission === "view") {
      toast.error("Bu görevi düzenleme yetkiniz yok")
      return
    }

    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus })

      // Update local state
      if (task) {
        setTask({
          ...task,
          status: newStatus,
        })
      }

      toast.success("Görev durumu güncellendi")
    } catch (err: any) {
      toast.error("Görev durumu güncellenirken hata oluştu")
      console.error("Error updating task status:", err)
    }
  }

  const handleDeleteTask = async () => {
    if (userPermission === "view") {
      toast.error("Bu görevi silme yetkiniz yok")
      return
    }

    try {
      setIsDeleting(true)
      await api.delete(`/tasks/${taskId}`)
      setDeleteDialogOpen(false)
      toast.success("Görev başarıyla silindi")
      router.push("/tasks")
    } catch (err: any) {
      toast.error("Görev silinirken hata oluştu")
      console.error("Error deleting task:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const canEdit = userPermission === "edit"
  const canDelete =
    task && (task.creator_id === user?.id || (user?.role === "manager" && task.team_id === user.team_id))

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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "High":
        return "Yüksek"
      case "Medium":
        return "Orta"
      case "Low":
        return "Düşük"
      default:
        return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Completed":
        return "Tamamlandı"
      case "In Progress":
        return "Devam Ediyor"
      case "Paused":
        return "Duraklatıldı"
      case "Not Started":
        return "Başlamadı"
      case "Cancelled":
        return "İptal Edildi"
      default:
        return status
    }
  }

  const isOverdue = (task: Task) => {
    const completionDate = new Date(task.completion_date)
    completionDate.setHours(23, 59, 59, 999) // Set to end of the day
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of the day
    return completionDate < today && task.status !== "Completed"
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>

        <div className="grid gap-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppShell>
    )
  }

  if (error || !task) {
    return (
      <AppShell>
        <div className="flex items-center mb-6">
          <Link href="/tasks">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Görevlere Geri Dön
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Görev Detayları</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription>{error || "Görev bulunamadı"}</AlertDescription>
        </Alert>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/tasks">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Görevlere Geri Dön
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Görev Detayları</h1>
        </div>

        <div className="flex space-x-2 items-center">
          {userPermission === "view" && (
            <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-600 border-blue-200">
              <Eye className="h-3 w-3 mr-1" />
              Sadece Görüntüleme
            </Badge>
          )}

          {canEdit && (
            <Link href={`/tasks/${taskId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Düzenle
              </Button>
            </Link>
          )}

          {canDelete ? (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Sil
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Görevi Sil</DialogTitle>
                  <DialogDescription>
                    Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
                    {isDeleting ? "Siliniyor..." : "Sil"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            isCreatedByManager && (
              <div className="flex items-center text-muted-foreground text-sm">
                <ShieldAlert className="h-4 w-4 mr-1 text-amber-500" />
                Yönetici tarafından oluşturuldu
              </div>
            )
          )}
        </div>
      </div>

      {isOverdue(task) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gecikmiş Görev</AlertTitle>
          <AlertDescription>
            Bu görevin son tarihi {format(new Date(task.completion_date), "d MMMM yyyy")} idi ve şu anda gecikmiş
            durumda.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{task.description}</CardTitle>
                    {isCreatedByManager && (
                      <ShieldAlert className="h-4 w-4 text-amber-500" title="Yönetici tarafından oluşturuldu" />
                    )}
                  </div>
                  <CardDescription>Oluşturan: {task.creator?.name || `Kullanıcı ${task.creator_id}`}</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Badge variant={getPriorityColor(task.priority) as any}>{getPriorityLabel(task.priority)}</Badge>
                  <Badge variant={getStatusColor(task.status) as any}>{getStatusLabel(task.status)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Başlangıç Tarihi</div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                    {format(new Date(task.start_date), "d MMMM yyyy")}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Son Tarih</div>
                  <div className="flex items-center text-sm">
                    <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                    {format(new Date(task.completion_date), "d MMMM yyyy")}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Planlanan İş Saati</div>
                  <div className="text-sm">{task.planned_labor} saat</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Gerçekleşen İş Saati</div>
                  <div className="text-sm">{task.actual_labor} saat</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">İş Büyüklüğü</div>
                  <div className="text-sm">{task.work_size} (5 üzerinden)</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Yol Haritası</h3>
                <div className="whitespace-pre-line text-sm">{task.roadmap}</div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">Geçmiş</TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Görev Geçmişi</CardTitle>
                  <CardDescription>Bu görevin değişikliklerini ve güncellemelerini takip edin</CardDescription>
                </CardHeader>
                <CardContent>
                  <TaskHistory taskId={task.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Görev Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskStatusUpdate
                currentStatus={task.status}
                onStatusChange={handleStatusUpdate}
                isDisabled={userPermission === "view"}
              />
              {userPermission === "view" && (
                <p className="text-sm text-muted-foreground mt-4">
                  Bu görevi düzenleme yetkiniz yok. Sadece görüntüleyebilirsiniz.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kişiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Görevliler</h3>
                {task.assignees
                  .filter((a) => a.role === "assignee")
                  .map((assignee) => (
                    <div key={assignee.id} className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{assignee.user?.name ? getInitials(assignee.user.name) : "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {assignee.user?.name || `Kullanıcı ${assignee.user_id}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Planlanan: {assignee.planned_labor || 0} saat | Gerçekleşen: {assignee.actual_labor || 0} saat
                        </div>
                      </div>
                    </div>
                  ))}
                {task.assignees.filter((a) => a.role === "assignee").length === 0 && (
                  <div className="text-sm text-muted-foreground">Görevli yok</div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Görev Ortakları</h3>
                {task.assignees
                  .filter((a) => a.role === "partner")
                  .map((partner) => (
                    <div key={partner.id} className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{partner.user?.name ? getInitials(partner.user.name) : "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {partner.user?.name || `Kullanıcı ${partner.user_id}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Planlanan: {partner.planned_labor || 0} saat | Gerçekleşen: {partner.actual_labor || 0} saat
                        </div>
                      </div>
                    </div>
                  ))}
                {task.assignees.filter((a) => a.role === "partner").length === 0 && (
                  <div className="text-sm text-muted-foreground">Görev ortağı yok</div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Bilgilendirilecek Kişiler</h3>
                {task.assignees
                  .filter((a) => a.role === "notified")
                  .map((notified) => (
                    <div key={notified.id} className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{notified.user?.name ? getInitials(notified.user.name) : "U"}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium">
                        {notified.user?.name || `Kullanıcı ${notified.user_id}`}
                      </div>
                    </div>
                  ))}
                {task.assignees.filter((a) => a.role === "notified").length === 0 && (
                  <div className="text-sm text-muted-foreground">Bilgilendirilecek kişi yok</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

