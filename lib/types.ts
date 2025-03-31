export interface User {
    UserId: number
    FullName: string
    Username: string
    Email: string
    Role: string
    Team?: string
    avatar?: string // Frontend only
  }
  
  export interface Task {
    TaskId?: number
    Title: string
    Description?: string
    Priority: "Low" | "Medium" | "High"
    Team?: string
    StartDate: string
    DueDate: string
    CreatedByUserId: number
    AssignedToUserId: number
    PlannedHours: number
    SpentHours?: number
    ValueSize: number
    Status: "Not Started" | "In Progress" | "Completed" | "On Hold"
    RoadMap: string
  }
  
  export interface TaskPartner {
    UserId: number
    FullName: string
    PlannedHours: number
    SpentHours: number
    RoadMap: string
  }
  
  export interface Notification {
    NotificationId: number
    TaskId?: number
    SenderUserId: number
    ReceiverUserId: number
    NotificationType: string
    NotificationDate: string
    IsRead: boolean
    // Frontend additions
    senderName?: string
    message?: string
  }
  
  export interface TaskLog {
    LogId: number
    TaskId: number
    ChangedByUserId: number
    ChangeDescription: string
    ChangeDate: string
  }
  
  export interface AnalyticsData {
    Priority?: string
    ValueSize?: number
    DueDate?: string
    TaskCount?: number
    AssignedToUserId?: number
    TotalPlanned?: number
    TotalSpent?: number
  }
  
  