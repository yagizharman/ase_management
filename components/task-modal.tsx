"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Task, TaskPartner, User } from "@/lib/types"
import { tasksAPI, usersAPI, notificationsAPI } from "@/lib/api"
import { toast } from "sonner"
import type { TaskCreate, TaskUpdateRequest } from '@/lib/api'

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task
  onTaskCreated?: () => void
  onTaskUpdated?: () => void
}

export default function TaskModal({ open, onOpenChange, task, onTaskCreated, onTaskUpdated }: TaskModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium")
  const [team, setTeam] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date())
  const [assignedToUserId, setAssignedToUserId] = useState<number | string>("")
  const [plannedHours, setPlannedHours] = useState(0)
  const [spentHours, setSpentHours] = useState(0)
  const [valueSize, setValueSize] = useState(5)
  const [status, setStatus] = useState<"Not Started" | "In Progress" | "Completed" | "On Hold">("Not Started")
  const [roadMap, setRoadMap] = useState("")
  const [partners, setPartners] = useState<TaskPartner[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [showAddPartner, setShowAddPartner] = useState(false)
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | string>("")
  const [partnerPlannedHours, setPartnerPlannedHours] = useState(0)
  const [partnerRoadMap, setPartnerRoadMap] = useState("")

  useEffect(() => {
    // Fetch team members first
    const fetchTeamMembers = async () => {
      try {
        const members = await usersAPI.getAllUsers()
        setTeamMembers(members)
        
        // Only after we have team members, set the assigned user for new tasks
        if (!task && user) {
          setAssignedToUserId(user.UserId.toString())
          setTeam(user.Team || "")
        }
        
        // Then fetch task details if we have a task
        if (task?.TaskId) {
          try {
            const taskDetails = await tasksAPI.getTaskById(task.TaskId)
            setTitle(taskDetails.Title)
            setDescription(taskDetails.Description || "")
            setPriority(taskDetails.Priority as "Low" | "Medium" | "High")
            setTeam(taskDetails.Team || "")
            setStartDate(new Date(taskDetails.StartDate))
            setDueDate(new Date(taskDetails.DueDate))
            if (taskDetails.AssignedToUserId) {
              setAssignedToUserId(taskDetails.AssignedToUserId.toString())
            }
            setPlannedHours(taskDetails.PlannedHours)
            setSpentHours(taskDetails.SpentHours || 0)
            setValueSize(taskDetails.ValueSize)
            setStatus(taskDetails.Status as "Not Started" | "In Progress" | "Completed" | "On Hold")
            setRoadMap(taskDetails.RoadMap)
            setPartners(taskDetails.Partners || [])
          } catch (error) {
            console.error("Failed to fetch task details:", error)
            toast.error("Failed to load task details")
          }
        } else {
          // Reset form for new task
          setTitle("")
          setDescription("")
          setPriority("Medium")
          setTeam(user?.Team || "")
          setStartDate(new Date())
          setDueDate(new Date())
          setPlannedHours(0)
          setSpentHours(0)
          setValueSize(5)
          setStatus("Not Started")
          setRoadMap("")
          setPartners([])
        }
      } catch (error) {
        console.error("Failed to fetch team members:", error)
        toast.error("Failed to load team members")
      }
    }

    fetchTeamMembers()
  }, [task, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    try {
      // Validate form
      if (
        !title ||
        !description ||
        !startDate ||
        !dueDate ||
        !assignedToUserId ||
        plannedHours <= 0 ||
        valueSize <= 0 ||
        !roadMap
      ) {
        throw new Error("Please fill in all required fields")
      }

      if (roadMap.split("\n").length < 5) {
        throw new Error("RoadMap should have at least 5 steps")
      }

      if (task?.TaskId) {
        // Update existing task
        const updateData: TaskUpdateRequest = {
          task_update: {
            Title: title,
            Description: description,
            Priority: priority,
            Team: team,
            StartDate: startDate.toISOString(),
            DueDate: dueDate.toISOString(),
            AssignedToUserId: Number(assignedToUserId),
            PlannedHours: Number(plannedHours),
            SpentHours: Number(spentHours),
            ValueSize: valueSize,
            Status: status,
            RoadMap: roadMap,
          }
        }

        // Only include partners field if we're updating partners
        if (partners && partners.length > 0) {
          updateData.partners = partners.map(p => ({
            TaskId: task.TaskId,
            UserId: p.UserId,
            PlannedHours: p.PlannedHours,
            SpentHours: p.SpentHours || 0,
            RoadMap: p.RoadMap || ""
          }))
        } else {
          // If no partners, explicitly set to empty array to clear all partners
          updateData.partners = []
        }

        // Log the update data for debugging
        console.log("Updating task with data:", JSON.stringify(updateData))

        await tasksAPI.updateTask(task.TaskId, updateData)

        // Create notification for task update
        if (Number(assignedToUserId) !== user.UserId) {
          await notificationsAPI.createNotification(task.TaskId, user.UserId, Number(assignedToUserId), "update")
        }

        if (onTaskUpdated) {
          onTaskUpdated()
        }
      } else {
        // Create new task
        const taskData: TaskCreate = {
          Title: title,
          Description: description,
          Priority: priority,
          Team: team,
          StartDate: startDate.toISOString(),
          DueDate: dueDate.toISOString(),
          CreatedByUserId: user.UserId,
          AssignedToUserId: Number(assignedToUserId),
          PlannedHours: Number(plannedHours),
          SpentHours: Number(spentHours),
          ValueSize: valueSize.toString(),
          Status: status,
          RoadMap: roadMap,
        }

        const createData: TaskCreate = {
          ...taskData,
          partners: partners.map(p => ({
            UserId: p.UserId,
            PlannedHours: p.PlannedHours,
            SpentHours: p.SpentHours,
            RoadMap: p.RoadMap
          }))
        }

        const createdTask = await tasksAPI.createTask(createData)

        // Create notification for new task assignment
        if (Number(assignedToUserId) !== user.UserId) {
          await notificationsAPI.createNotification(
            createdTask.TaskId,
            user.UserId,
            Number(assignedToUserId),
            "assignment",
          )
        }

        if (onTaskCreated) {
          onTaskCreated()
        }
      }

      // Close the modal
      onOpenChange(false)
    } catch (error: any) {
      console.error("Failed to save task:", error)
      toast.error(error.message || "Failed to save task")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPartner = () => {
    if (!selectedPartnerId || partnerPlannedHours <= 0 || !partnerRoadMap) {
      toast.error("Please fill in all partner fields")
      return
    }

    if (partners.length >= 5) {
      toast.error("Maximum 5 partners allowed per task")
      return
    }

    const selectedPartner = teamMembers.find((m) => m.UserId === Number(selectedPartnerId))

    if (!selectedPartner) {
      toast.error("Invalid partner selected")
      return
    }

    if (partners.some((p) => p.UserId === Number(selectedPartnerId))) {
      toast.error("This partner is already added to the task")
      return
    }

    const newPartner: TaskPartner = {
      UserId: Number(selectedPartnerId),
      PlannedHours: partnerPlannedHours,
      SpentHours: 0,
      RoadMap: partnerRoadMap,
    }

    setPartners([...partners, newPartner])
    setShowAddPartner(false)
    setSelectedPartnerId("")
    setPartnerPlannedHours(0)
    setPartnerRoadMap("")
  }

  const handleRemovePartner = (userId: number) => {
    setPartners(partners.filter((p) => p.UserId !== userId))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {task ? "Update the details of your task below." : "Fill in the details to create a new task."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title*
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description*
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority*
              </Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as any)}>
                <SelectTrigger id="priority" className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="team" className="text-right">
                Team*
              </Label>
              <Input id="team" value={team} onChange={(e) => setTeam(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date*
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date*
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedTo" className="text-right">
                Assigned To*
              </Label>
              <Select 
                defaultValue={user?.UserId.toString()}
                value={assignedToUserId ? assignedToUserId.toString() : undefined}
                onValueChange={(value) => setAssignedToUserId(value)}
              >
                <SelectTrigger id="assignedTo" className="col-span-3">
                  <SelectValue>
                    {teamMembers.find(m => m.UserId.toString() === assignedToUserId?.toString())?.FullName || "Select team member"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.UserId} value={member.UserId.toString()}>
                      {member.FullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plannedHours" className="text-right">
                Planned Hours*
              </Label>
              <Input
                id="plannedHours"
                type="number"
                min="0"
                step="0.5"
                value={plannedHours}
                onChange={(e) => setPlannedHours(Number.parseFloat(e.target.value) || 0)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="spentHours" className="text-right">
                Spent Hours
              </Label>
              <Input
                id="spentHours"
                type="number"
                min="0"
                step="0.5"
                value={spentHours}
                onChange={(e) => setSpentHours(Number.parseFloat(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valueSize" className="text-right">
                Value Size* (1-10)
              </Label>
              <Input
                id="valueSize"
                type="number"
                min="1"
                max="10"
                value={valueSize}
                onChange={(e) => setValueSize(Number.parseInt(e.target.value) || 5)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status*
              </Label>
              <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="roadMap" className="text-right pt-2">
                RoadMap* (min 5 steps)
              </Label>
              <Textarea
                id="roadMap"
                value={roadMap}
                onChange={(e) => setRoadMap(e.target.value)}
                className="col-span-3"
                rows={5}
                placeholder="Enter each step on a new line"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <div className="text-right pt-2">
                <Label>Task Partners</Label>
                <p className="text-xs text-muted-foreground mt-1">(max 5)</p>
              </div>
              <div className="col-span-3 space-y-4">
                {partners.length > 0 ? (
                  <div className="space-y-2">
                    {partners.map((partner) => {
                      const partnerUser = teamMembers.find(m => m.UserId === partner.UserId)
                      return (
                      <div key={partner.UserId} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>
                              {partnerUser?.FullName.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{partnerUser?.FullName}</p>
                            <p className="text-xs text-muted-foreground">{partner.PlannedHours} planned hours</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemovePartner(partner.UserId)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )})}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No partners added yet</p>
                )}

                {!showAddPartner ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddPartner(true)}
                    disabled={partners.length >= 5}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Partner
                  </Button>
                ) : (
                  <div className="space-y-4 border rounded-md p-4">
                    <div className="space-y-2">
                      <Label htmlFor="partnerId">Team Member</Label>
                      <Select
                        value={selectedPartnerId.toString()}
                        onValueChange={(value) => setSelectedPartnerId(Number(value))}
                      >
                        <SelectTrigger id="partnerId">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers
                            .filter(
                              (m) =>
                                m.UserId !== Number(assignedToUserId) && !partners.some((p) => p.UserId === m.UserId),
                            )
                            .map((member) => (
                              <SelectItem key={member.UserId} value={member.UserId.toString()}>
                                {member.FullName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerPlannedHours">Planned Hours</Label>
                      <Input
                        id="partnerPlannedHours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={partnerPlannedHours}
                        onChange={(e) => setPartnerPlannedHours(Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerRoadMap">RoadMap</Label>
                      <Textarea
                        id="partnerRoadMap"
                        value={partnerRoadMap}
                        onChange={(e) => setPartnerRoadMap(e.target.value)}
                        rows={3}
                        placeholder="Enter partner's specific tasks"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAddPartner(false)}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={handleAddPartner}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

