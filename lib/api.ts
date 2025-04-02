const API_BASE_URL = "http://localhost:8000/api"

interface ApiOptions {
  headers?: Record<string, string>
  body?: any
}

class ApiClient {
  async request(endpoint: string, method: string, options: ApiOptions = {}) {
    const url = `${API_BASE_URL}${endpoint}`

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    const headers: Record<string, string> = {
      ...options.headers,
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    if (method !== "GET" && options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json"
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: "include",
    }

    if (options.body) {
      if (typeof options.body === "string") {
        config.body = options.body
      } else if (options.body instanceof FormData) {
        config.body = options.body
      } else {
        config.body = JSON.stringify(options.body)
      }
    }

    try {
      const response = await fetch(url, config)

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        localStorage.removeItem("token")
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
        throw new Error("Unauthorized")
      }

      // For 204 No Content, return null
      if (response.status === 204) {
        return null
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong")
      }

      return data
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }

  get(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, "GET", options)
  }

  post(endpoint: string, body: any, options: ApiOptions = {}) {
    return this.request(endpoint, "POST", { ...options, body })
  }

  put(endpoint: string, body: any, options: ApiOptions = {}) {
    return this.request(endpoint, "PUT", { ...options, body })
  }

  patch(endpoint: string, body: any, options: ApiOptions = {}) {
    return this.request(endpoint, "PATCH", { ...options, body })
  }

  delete(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, "DELETE", options)
  }

  // For email notifications
  sendEmailNotification(taskId: number, recipients: string[], subject: string, body: string) {
    return this.post("/notifications/email", {
      task_id: taskId,
      recipients,
      subject,
      body,
    })
  }

  // For notifications
  getNotifications(email: string) {
    return this.get(`/notifications?recipient_email=${email}`)
  }

  markNotificationAsRead(notificationId: number, email: string) {
    return this.put(`/notifications/${notificationId}/read`, {
      recipient_email: email,
    })
  }

  markAllNotificationsAsRead(email: string) {
    return this.put(`/notifications/read-all`, {
      recipient_email: email,
    })
  }

  // For analytics
  getTaskDistribution(userId: number, startDate: string, endDate: string) {
    return this.get(`/analytics/user-task-distribution?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`)
  }

  getTeamPerformance(teamId: number, startDate: string, endDate: string) {
    return this.get(`/analytics/team-performance?team_id=${teamId}&start_date=${startDate}&end_date=${endDate}`)
  }

  // For task optimization
  getOptimizedTaskDistribution(userId: number, startDate: string, endDate: string, method: string) {
    return this.get(
      `/analytics/optimized-distribution?user_id=${userId}&start_date=${startDate}&end_date=${endDate}&method=${method}`,
    )
  }

  // For daily tasks
  getDailyTasks(userId: number) {
    const today = new Date().toISOString().split("T")[0]
    return this.get(`/users/${userId}/tasks?date=${today}`)
  }

  // For task history with comments
  getTaskHistory(taskId: number) {
    return this.get(`/tasks/${taskId}/history`)
  }

  // For logging effort with comments
  logTaskEffort(taskId: number, userId: number, hours: number, details: string) {
    return this.put(`/tasks/${taskId}/effort`, {
      user_id: userId,
      hours,
      details,
    })
  }
}

export const api = new ApiClient()

