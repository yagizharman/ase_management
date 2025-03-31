// Base API URL - change this to your FastAPI backend URL
const API_BASE_URL = "http://localhost:8000/api"

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Helper function for API requests
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token")

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Check if the response has content
  const contentType = response.headers.get("content-type")
  const hasJsonContent = contentType && contentType.includes("application/json")

  let data = null
  if (hasJsonContent) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    throw new APIError(
      (data && data.detail) || `API error: ${response.status}`,
      response.status,
      data?.code,
      data
    )
  }

  return data
}

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    return fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem("token")
    if (!token) return null

    try {
      const userData = await fetchAPI("/auth/me")
      return userData
    } catch (error) {
      console.error("Failed to get current user:", error)
      localStorage.removeItem("token")
      return null
    }
  },

  logout: async () => {
    try {
      await fetchAPI("/auth/logout", {
        method: "POST",
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  },
}

// Users API
export const usersAPI = {
  getAllUsers: async () => {
    return fetchAPI("/users")
  },

  getUserById: async (userId: number) => {
    return fetchAPI(`/users/${userId}`)
  },

  getUserTasks: async (userId: number) => {
    return fetchAPI(`/users/${userId}/tasks`)
  },
}

// Task interface
export interface Task {
  TaskId: number;
  Title: string;
  Description: string;
  Priority: string;
  Team: string;
  StartDate: string;
  DueDate: string;
  CreatedByUserId: number;
  AssignedToUserId: number;
  PlannedHours: number;
  SpentHours: number;
  ValueSize: string;
  Status: string;
  RoadMap: string;
  Partners?: TaskPartner[];
}

export interface TaskPartner {
  TaskPartnerId?: number;
  TaskId?: number;
  UserId: number;
  PlannedHours: number;
  SpentHours: number;
  RoadMap: string;
}

export interface TaskUpdate {
  Title?: string;
  Description?: string;
  Priority?: string;
  Team?: string;
  StartDate?: string;
  DueDate?: string;
  AssignedToUserId?: number;
  PlannedHours?: number;
  SpentHours?: number;
  ValueSize?: number;
  Status?: string;
  RoadMap?: string;
}

export interface TaskUpdateRequest {
  task_update: TaskUpdate;
  partners?: TaskPartner[];
}

export type TaskCreate = Omit<Task, 'TaskId'> & {
  partners?: TaskPartner[];
};

// Tasks API
export const tasksAPI = {
  getAllTasks: async () => {
    return fetchAPI("/tasks")
  },

  getTaskById: async (taskId: number) => {
    return fetchAPI(`/tasks/${taskId}`)
  },

  createTask: async (task: TaskCreate): Promise<Task> => {
    return fetchAPI("/tasks", {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  updateTask: async (taskId: number, updateData: TaskUpdateRequest, userId: number) => {
    return fetchAPI(`/tasks/${taskId}?user_id=${userId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    })
  },

  deleteTask: async (taskId: number, userId: number) => {
    return fetchAPI(`/tasks/${taskId}?user_id=${userId}`, {
      method: "DELETE",
    })
  },
}

// Notifications API
export const notificationsAPI = {
  getNotifications: async (receiverUserId: number) => {
    return fetchAPI(`/notifications?receiver_user_id=${receiverUserId}`)
  },

  createNotification: async (
    taskId: number,
    senderUserId: number,
    receiverUserId: number,
    notificationType: string,
  ) => {
    return fetchAPI("/notifications", {
      method: "POST",
      body: JSON.stringify({
        task_id: taskId,
        sender_user_id: senderUserId,
        receiver_user_id: receiverUserId,
        notification_type: notificationType,
      }),
    })
  },

  markAsRead: async (notificationId: number) => {
    return fetchAPI(`/notifications/${notificationId}/read`, {
      method: "PUT",
    })
  },
}

// Analytics API
export const analyticsAPI = {
  getUserTaskDistribution: async (userId: number, startDate: string, endDate: string) => {
    return fetchAPI(`/analytics/user-task-distribution?userId=${userId}&startDate=${startDate}&endDate=${endDate}`)
  },

  getTeamPerformance: async (teamId: string, startDate: string, endDate: string) => {
    return fetchAPI(`/analytics/performance?teamId=${teamId}&startDate=${startDate}&endDate=${endDate}`)
  },
}

