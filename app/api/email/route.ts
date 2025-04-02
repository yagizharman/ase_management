import { NextResponse } from "next/server"
import { emailConfig } from "@/lib/email-config"
import nodemailer from "nodemailer"
import sgMail from "@sendgrid/mail"

// Initialize SendGrid if configured
if (emailConfig.sendgrid?.apiKey) {
  sgMail.setApiKey(emailConfig.sendgrid.apiKey)
}

interface EmailData {
  to: string[]
  subject: string
  body: string
  html?: string
}

export async function POST(request: Request) {
  try {
    const emailData: EmailData = await request.json()
    
    // Get the authorization header from the request
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ 
        success: false, 
        error: "Authorization header is required" 
      }, { status: 401 })
    }

    // Store notification in the database for each recipient
    for (const recipient of emailData.to) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          recipient_email: recipient,
          subject: emailData.subject,
          body: emailData.body,
          sent_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create notification: ${response.statusText}`)
      }
    }

    // Send actual email based on the configured provider
    if (emailConfig.provider === "smtp") {
      await sendEmailSMTP(emailData)
    } else if (emailConfig.provider === "sendgrid") {
      await sendEmailSendGrid(emailData)
    } else {
      console.error("No email provider configured")
      return NextResponse.json({ success: false, error: "No email provider configured" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to send email:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
    }, { status: 500 })
  }
}

async function sendEmailSMTP(emailData: EmailData) {
  if (!emailConfig.smtp) {
    throw new Error("SMTP configuration missing")
  }

  console.log("SMTP Configuration:", {
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    secure: emailConfig.smtp.secure,
    user: emailConfig.smtp.auth.user,
  })

  const transporter = nodemailer.createTransport({
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    secure: emailConfig.smtp.secure,
    auth: {
      user: emailConfig.smtp.auth.user,
      pass: emailConfig.smtp.auth.pass,
    },
  })

  try {
    // Verify SMTP connection configuration
    await transporter.verify()
    console.log("SMTP connection verified successfully")

    const info = await transporter.sendMail({
      from: emailConfig.defaultFrom,
      to: emailData.to.join(", "),
      subject: emailData.subject,
      text: emailData.body,
      html: emailData.html || emailData.body.replace(/\n/g, "<br>"),
    })

    console.log("Email sent successfully:", info.messageId)
  } catch (error) {
    console.error("SMTP error:", error)
    throw error
  }
}

async function sendEmailSendGrid(emailData: EmailData) {
  if (!emailConfig.sendgrid?.apiKey) {
    throw new Error("SendGrid API key missing")
  }

  const msg = {
    to: emailData.to,
    from: emailConfig.defaultFrom,
    subject: emailData.subject,
    text: emailData.body,
    html: emailData.html || emailData.body.replace(/\n/g, "<br>"),
  }

  await sgMail.send(msg)
} 