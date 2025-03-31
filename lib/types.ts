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
    TaskId: number
    Title: string
    Description: string
    Priority: string
    Team: string
    StartDate: string
    DueDate: string
    CreatedByUserId: number
    AssignedToUserId: number
    PlannedHours: number
    SpentHours: number
    ValueSize: number
    Status: string
    RoadMap: string
    Partners?: TaskPartner[]
  }
  
  export interface TaskPartner {
    TaskPartnerId?: number
    TaskId?: number
    UserId: number
    FullName?: string
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
  
  export interface TaskCreate {
    Title: string
    Description: string
    Priority: string
    Team: string
    StartDate: string
    DueDate: string
    CreatedByUserId: number
    AssignedToUserId: number
    PlannedHours: number
    SpentHours: number
    ValueSize: string | number
    Status: string
    RoadMap: string
    partners?: TaskPartner[]
  }
  
  export interface TaskUpdateRequest {
    task_update: {
      Title?: string
      Description?: string
      Priority?: string
      Team?: string
      StartDate?: string
      DueDate?: string
      AssignedToUserId?: number
      PlannedHours?: number
      SpentHours?: number
      ValueSize?: number
      Status?: string
      RoadMap?: string
    }
    partners?: TaskPartner[]
  }
  
  