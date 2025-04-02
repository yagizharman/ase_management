"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react"
import { emailService } from "@/lib/email-service"
import { useAuth } from "@/context/auth-context"

export default function EmailTestPage() {
  const { user } = useAuth()
  const [testEmail, setTestEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedTest, setSelectedTest] = useState("basic")

  // Function to send a basic test email
  const sendTestEmail = async () => {
    if (!testEmail) {
      setResult({
        success: false,
        message: "Please enter a valid email address",
      })
      return
    }

    setIsSending(true)
    setResult(null)

    try {
      const success = await emailService.testEmailConfiguration(testEmail)
      setResult({
        success,
        message: success
          ? "Test email sent successfully! Check your inbox."
          : "Failed to send test email. Check console for errors.",
      })
    } catch (error) {
      console.error("Error sending test email:", error)
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Function to test task assignment notification
  const testTaskAssignment = async () => {
    if (!testEmail) {
      setResult({
        success: false,
        message: "Please enter a valid email address",
      })
      return
    }

    setIsSending(true)
    setResult(null)

    try {
      const success = await emailService.sendTaskAssignmentNotification(
        999, // Dummy task ID
        "Test Task Assignment",
        [testEmail],
        {
          id: 999,
          description: "Test Task Assignment",
          priority: "Medium" as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
          team_id: user?.team_id || 0,
          start_date: new Date().toISOString().split('T')[0],
          completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          creator_id: user?.id || 0,
          planned_labor: 8,
          actual_labor: 0,
          work_size: 3,
          roadmap: "Test roadmap",
          status: "Not Started" as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
          assignees: [{
            user_id: user?.id || 0,
            role: "assignee",
            planned_labor: 8,
            actual_labor: 0,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email
            } : undefined
          }]
        }
      )
      setResult({
        success,
        message: success
          ? "Task assignment notification sent successfully! Check your inbox."
          : "Failed to send task assignment notification. Check console for errors.",
      })
    } catch (error) {
      console.error("Error sending task assignment notification:", error)
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Function to test task partner notification
  const testTaskPartner = async () => {
    if (!testEmail) {
      setResult({
        success: false,
        message: "Please enter a valid email address",
      })
      return
    }

    setIsSending(true)
    setResult(null)

    try {
      const success = await emailService.sendTaskPartnerNotification(
        999, // Dummy task ID
        "Test Task Partnership",
        [testEmail],
        {
          id: 999,
          description: "Test Task Partnership",
          priority: "Medium" as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
          team_id: user?.team_id || 0,
          start_date: new Date().toISOString().split('T')[0],
          completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          creator_id: user?.id || 0,
          planned_labor: 8,
          actual_labor: 0,
          work_size: 3,
          roadmap: "Test roadmap",
          status: "Not Started" as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
          assignees: [{
            user_id: user?.id || 0,
            role: "partner",
            planned_labor: 8,
            actual_labor: 0,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email
            } : undefined
          }]
        }
      )
      setResult({
        success,
        message: success
          ? "Task partner notification sent successfully! Check your inbox."
          : "Failed to send task partner notification. Check console for errors.",
      })
    } catch (error) {
      console.error("Error sending task partner notification:", error)
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Function to test task update notification
  const testTaskUpdate = async () => {
    if (!testEmail) {
      setResult({
        success: false,
        message: "Please enter a valid email address",
      })
      return
    }

    setIsSending(true)
    setResult(null)

    try {
      const success = await emailService.sendTaskUpdateNotification(
        999, // Dummy task ID
        "Test Task Update",
        testEmail,
        "Status changed from 'Not Started' to 'In Progress'",
        {
          id: 999,
          description: "Test Task Update",
          priority: "Medium" as "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük",
          team_id: user?.team_id || 0,
          start_date: new Date().toISOString().split('T')[0],
          completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          creator_id: user?.id || 0,
          planned_labor: 8,
          actual_labor: 4,
          work_size: 3,
          roadmap: "Test roadmap",
          status: "In Progress" as "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled",
          assignees: [{
            user_id: user?.id || 0,
            role: "assignee",
            planned_labor: 8,
            actual_labor: 4,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email
            } : undefined
          }]
        },
        "Test User"
      )
      setResult({
        success,
        message: success
          ? "Task update notification sent successfully! Check your inbox."
          : "Failed to send task update notification. Check console for errors.",
      })
    } catch (error) {
      console.error("Error sending task update notification:", error)
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Check if user is authorized (only managers should access this page)
  if (user && user.role !== "manager") {
    return (
      <AppShell>
        <div className="container mx-auto py-10">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access this page. Only managers can test email functionality.
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto py-10">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Email Configuration Test</CardTitle>
            <CardDescription>
              Test your email configuration by sending test emails to verify everything is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="test-email">Recipient Email Address</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="Enter email address to receive test"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <Tabs value={selectedTest} onValueChange={setSelectedTest}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="basic">Basic Test</TabsTrigger>
                  <TabsTrigger value="assignment">Assignment</TabsTrigger>
                  <TabsTrigger value="partner">Partner</TabsTrigger>
                  <TabsTrigger value="update">Update</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Send a basic test email to verify your email configuration is working correctly.
                  </p>
                  <Button onClick={sendTestEmail} disabled={isSending}>
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Test Email
                      </>
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="assignment" className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Test task assignment notification emails sent to employees when assigned a task.
                  </p>
                  <Button onClick={testTaskAssignment} disabled={isSending}>
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Test Assignment Email
                      </>
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="partner" className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Test partner notification emails sent when users are added as partners to a task.
                  </p>
                  <Button onClick={testTaskPartner} disabled={isSending}>
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Test Partner Email
                      </>
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="update" className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Test task update notification emails sent to managers when tasks are updated.
                  </p>
                  <Button onClick={testTaskUpdate} disabled={isSending}>
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Test Update Email
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
                  {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              <p>Check your email inbox and spam folder for the test email.</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  )
}

