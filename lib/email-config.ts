// Email configuration
interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface SendGridConfig {
  apiKey: string
}

interface EmailConfig {
  provider: "smtp" | "sendgrid" | "none"
  smtp?: SMTPConfig
  sendgrid?: SendGridConfig
  defaultFrom: string
}

// Load configuration from environment variables
export const emailConfig: EmailConfig = {
  provider: (process.env.EMAIL_PROVIDER as "smtp" | "sendgrid") || "none",
  defaultFrom: process.env.EMAIL_FROM || "Task Manager <noreply@example.com>",
}

// Configure SMTP if selected
if (emailConfig.provider === "smtp") {
  emailConfig.smtp = {
    host: process.env.SMTP_HOST || "",
    port: Number.parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS?.replace(/^"|"$/g, "") || "", // Remove quotes if present
    },
  }
}

// Configure SendGrid if selected
if (emailConfig.provider === "sendgrid") {
  emailConfig.sendgrid = {
    apiKey: process.env.SENDGRID_API_KEY || "",
  }
}

// Validate configuration
if (emailConfig.provider === "smtp" && (!emailConfig.smtp?.host || !emailConfig.smtp?.auth.user)) {
  console.warn("SMTP configuration is incomplete. Check your environment variables.")
}

if (emailConfig.provider === "sendgrid" && !emailConfig.sendgrid?.apiKey) {
  console.warn("SendGrid configuration is incomplete. Check your environment variables.")
}

