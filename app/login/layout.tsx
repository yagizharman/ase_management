import { ThemeProvider } from "next-themes"
import type React from "react"

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen ">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>

      {children}
      </ThemeProvider>
    </div>
  )
} 