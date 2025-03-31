"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authAPI, usersAPI } from "@/lib/api"
import type { User } from "@/lib/types"
import { useRouter } from "next/navigation"
import { APIError } from "@/lib/api"

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token")
        if (token) {
          const userData = await authAPI.getCurrentUser()
          if (userData) {
            // Get additional user details
            const userDetails = await usersAPI.getUserById(userData.user_id)
            setUser(userDetails)
          }
        }
      } catch (error) {
        if (error instanceof APIError && error.status === 401) {
          localStorage.removeItem("token")
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authAPI.login(username, password)
      console.log('Login response:', response) // Debug log
      localStorage.setItem("token", response.access_token)

      // Get user details
      const userData = await authAPI.getCurrentUser()
      console.log('Current user data:', userData) // Debug log
      if (userData) {
        const userDetails = await usersAPI.getUserById(userData.user_id)
        console.log('User details:', userDetails) // Debug log
        setUser(userDetails)
      }
    } catch (error) {
      console.error('Login error:', error) // Debug log
      if (error instanceof APIError) {
        switch (error.status) {
          case 401:
            setError("Geçersiz kullanıcı adı veya şifre")
            break
          case 403:
            setError("Bu hesaba erişim yetkiniz yok")
            break
          case 404:
            setError("Kullanıcı bulunamadı")
            break
          default:
            setError(error.message || "Giriş yapılırken bir hata oluştu")
        }
      } else {
        setError("Giriş yapılırken bir hata oluştu")
      }
      return false // Return false to indicate login failed
    } finally {
      setIsLoading(false)
    }
    return true // Return true to indicate login succeeded
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("token")
      setUser(null)
      setError(null)
      router.push("/login")
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

