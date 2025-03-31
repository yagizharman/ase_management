"use client"

import { usePathname } from "next/navigation"
import Header from "@/components/header"

export default function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <>
      {!isLoginPage && <Header />}
      <div className="container mt-2">
        {children}
      </div>
    </>
  )
} 