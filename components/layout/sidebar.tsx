"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  Home,
  Users,
  X,
  Calendar,
  ChevronRight,
  ChevronLeft,
  LogOut,
} from "lucide-react"

interface SidebarProps {
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isManager = user?.role === "manager"
  const [collapsed, setCollapsed] = useState(false)

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname, setIsMobileOpen])

  const routes = [
    {
      label: "Gösterge Paneli",
      icon: Home,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Görevlerim",
      icon: CheckSquare,
      href: "/tasks",
      active: pathname === "/tasks" || pathname.startsWith("/tasks/"),
    },
    {
      label: "Ekip Görevleri",
      icon: ClipboardList,
      href: "/team-tasks",
      active: pathname === "/team-tasks",
    },
    {
      label: "Yıllık Görevler",
      icon: Calendar,
      href: "/yearly-tasks",
      active: pathname === "/yearly-tasks",
    },
    {
      label: "Görev Dağılımı",
      icon: BarChart3,
      href: "/task-distribution",
      active: pathname === "/task-distribution",
    },
    // Manager-only routes
    ...(isManager
      ? [
          {
            label: "Ekip Yönetimi",
            icon: Users,
            href: "/team",
            active: pathname === "/team",
          },
          {
            label: "Yönetici Paneli",
            icon: BarChart3,
            href: "/manager-dashboard",
            active: pathname === "/manager-dashboard",
          },
        ]
      : []),
  ]

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  const handleLogout = async () => {
    await logout()
  }

  const SidebarContent = (
    <>
      <div className={cn("flex h-14 items-center border-b px-3", collapsed ? "justify-center" : "px-4")}>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          {!collapsed && <ClipboardList className="h-5 w-5 text-primary" />}
          {!collapsed && <span>Görev Yöneticisi</span>}
        </Link>
        <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setIsMobileOpen(false)}>
          <X className="h-5 w-5" />
          <span className="sr-only">Kapat</span>
        </Button>
        <Button variant="ghost" size="icon" className="ml-auto hidden md:flex" onClick={toggleSidebar}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 py-4">
          <div className="px-3 py-2">
            <div className="space-y-1">
              {!collapsed && (
                <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground">Menü</h2>
              )}
              <nav className="grid gap-1">
                {routes.map((route, i) => (
                  <Link
                    key={i}
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted hover:text-primary transition-colors",
                      route.active ? "bg-muted text-primary" : "text-muted-foreground",
                      collapsed ? "justify-center px-2" : "",
                    )}
                    title={collapsed ? route.label : undefined}
                  >
                    <route.icon className="h-4 w-4" />
                    {!collapsed && <span>{route.label}</span>}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </ScrollArea>
      <div className={cn("mt-auto p-3 border-t flex items-center", collapsed ? "justify-center" : "p-4")}>
        {!collapsed ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role === "manager" ? "Yönetici" : "Çalışan"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Çıkış Yap">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Çıkış Yap">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  )

  return (
    <>
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <div className="flex h-full flex-col">{SidebarContent}</div>
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "hidden border-r bg-background md:flex md:flex-col transition-all duration-300",
          collapsed ? "md:w-12" : "md:w-56",
        )}
      >
        <div className="flex h-full flex-col">{SidebarContent}</div>
      </aside>
    </>
  )
}

