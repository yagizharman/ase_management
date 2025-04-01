"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TeamMemberProfile } from "@/components/team/team-member-profile"

export default function TeamMemberPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const userId = Array.isArray(id) ? id[0] : id

  useEffect(() => {
    // Redirect if not a manager
    if (user && user.role !== "manager") {
      router.push("/dashboard")
    }
    setIsLoading(false)
  }, [user, router])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="p-4 text-destructive">Hata: {error}</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center mb-6">
        <Link href="/team">
          <Button variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ekibe Geri Dön
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Ekip Üyesi Profili</h1>
      </div>

      <TeamMemberProfile userId={Number.parseInt(userId)} />
    </AppShell>
  )
}

