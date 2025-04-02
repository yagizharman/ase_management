import { emailConfig } from "./email-config"

interface EmailData {
  to: string[]
  subject: string
  body: string
  html?: string
}

interface TaskDetails {
  id?: number;
  description?: string;
  priority?: "High" | "Medium" | "Low" | "Yüksek" | "Orta" | "Düşük";
  team_id?: number;
  start_date?: string;
  completion_date?: string;
  creator_id?: number;
  planned_labor?: number;
  actual_labor?: number;
  work_size?: number;
  roadmap?: string;
  status?: "Not Started" | "In Progress" | "Paused" | "Completed" | "Cancelled";
  assignees?: Array<{
    user_id: number;
    role: string;
    planned_labor: number;
    actual_labor: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  }>;
}

export const emailService = {
  /**
   * Sends an email notification using the configured email provider
   */
  sendEmail: async (emailData: EmailData) => {
    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send email")
      }

      return true
    } catch (error) {
      console.error("Failed to send email:", error)
      return false
    }
  },

  /**
   * Test email configuration
   */
  testEmailConfiguration: async (recipientEmail: string) => {
    const timestamp = new Date().toLocaleTimeString()
    return emailService.sendEmail({
      to: [recipientEmail],
      subject: `İş Yönetim Sistemi - E-posta Yapılandırma Testi - ${timestamp}`,
      body: `Bu e-posta, e-posta yapılandırmanızın doğru çalıştığını doğrulamak için ${timestamp} tarihinde gönderilmiştir.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">İş Yönetim Sistemi</h1>
          <h2 style="color: #0056b3;">E-posta Yapılandırma Testi</h2>
          <p>Bu e-posta, e-posta yapılandırmanızın doğru çalıştığını doğrulamak için <strong>${timestamp}</strong> tarihinde gönderilmiştir.</p>
          <p style="background-color: #e8f5e9; padding: 10px; border-radius: 4px;">Bu e-postayı aldıysanız, e-posta yapılandırmanız çalışıyor demektir!</p>
          <div style="margin-top: 20px; background-color: #f5f5f5; padding: 15px; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #333;">Yapılandırma Detayları:</h3>
            <ul>
              <li>Sağlayıcı: ${emailConfig.provider}</li>
              <li>Gönderen: ${emailConfig.defaultFrom}</li>
              <li>${emailConfig.provider === "smtp" ? `SMTP Sunucu: ${emailConfig.smtp?.host}` : "SendGrid API kullanılıyor"}</li>
            </ul>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
            Bu e-posta, İş Yönetim ve Takip Platformu tarafından otomatik olarak gönderilmiştir.
          </p>
        </div>
      `,
    })
  },

  /**
   * Sends task assignment notification
   */
  sendTaskAssignmentNotification: async (
    taskId: number,
    taskDescription: string,
    assigneeEmails: string[],
    taskDetails: any = {},
  ) => {
    const subject = `İş Yönetim Sistemi - Yeni Görev Ataması: ${taskDescription}`
    const body = `Size yeni bir görev atandı: "${taskDescription}". Detaylar için lütfen kontrol panelini ziyaret edin.`

    const formattedDate = (dateStr: string) => {
      if (!dateStr) return "Belirtilmemiş"
      const date = new Date(dateStr)
      return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const priorityColor =
      {
        High: "#dc3545",
        Medium: "#ffc107",
        Low: "#28a745",
        Yüksek: "#dc3545",
        Orta: "#ffc107",
        Düşük: "#28a745",
      }[taskDetails.priority || "Medium"] || "#ffc107"

    const statusLabel =
      {
        "Not Started": "Başlanmadı",
        "In Progress": "Devam Ediyor",
        Paused: "Duraklatıldı",
        Completed: "Tamamlandı",
        Cancelled: "İptal Edildi",
      }[taskDetails.status || "Not Started"] ||
      taskDetails.status ||
      "Başlanmadı"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">İş Yönetim Sistemi</h1>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <h2 style="color: #0056b3; margin-top: 0;">Yeni Görev Ataması</h2>
          <p>Size yeni bir görev atandı: <strong style="color: #333;">${taskDescription}</strong></p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Görev Detayları</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 40%;"><strong>Görev ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${taskId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Öncelik:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <span style="display: inline-block; padding: 3px 8px; background-color: ${priorityColor}; color: white; border-radius: 3px; font-size: 12px;">
                  ${taskDetails.priority || "Orta"}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Durum:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${statusLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Başlangıç Tarihi:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.start_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tamamlanma Tarihi:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.completion_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Planlanan İş Gücü:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${taskDetails.planned_labor || "Belirtilmemiş"} saat</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>İş Büyüklüğü:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${taskDetails.work_size || "Belirtilmemiş"}</td>
            </tr>
          </table>
        </div>
        
        ${
          taskDetails.roadmap
            ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Yol Haritası</h3>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${taskDetails.roadmap}</p>
        </div>
        `
            : ""
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Görevi Görüntüle
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
          Bu e-posta, İş Yönetim ve Takip Platformu tarafından otomatik olarak gönderilmiştir.
        </p>
      </div>
    `

    return emailService.sendEmail({
      to: assigneeEmails,
      subject,
      body,
      html,
    })
  },

  /**
   * Sends task partner notification
   */
  sendTaskPartnerNotification: async (
    taskId: number,
    taskDescription: string,
    partnerEmails: string[],
    taskDetails: TaskDetails = {},
  ) => {
    console.log("Received task details in partner notification:", JSON.stringify(taskDetails, null, 2));

    // Send separate emails to each partner
    const emailPromises = partnerEmails.map(async (email) => {
      const subject = `İş Yönetim Sistemi - Görev Ortağı Bildirimi: ${taskDescription}`
      const body = `Bir göreve ortak olarak eklendiniz: "${taskDescription}".`

      const formattedDate = (dateStr: string | undefined) => {
        if (!dateStr) return "Belirtilmemiş"
        const date = new Date(dateStr)
        return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
      }

      const formatValue = (value: any, unit: string = "") => {
        if (value === undefined || value === null || value === "") return "Belirtilmemiş"
        return `${value}${unit}`
      }

      const priorityMap = {
        High: "#dc3545",
        Medium: "#ffc107",
        Low: "#28a745",
        Yüksek: "#dc3545",
        Orta: "#ffc107",
        Düşük: "#28a745",
      } as const;

      const statusMap = {
        "Not Started": "Başlanmadı",
        "In Progress": "Devam Ediyor",
        Paused: "Duraklatıldı",
        Completed: "Tamamlandı",
        Cancelled: "İptal Edildi",
      } as const;

      type PriorityType = keyof typeof priorityMap;
      type StatusType = keyof typeof statusMap;

      console.log("Task priority:", taskDetails.priority);
      console.log("Task status:", taskDetails.status);

      const priorityColor = taskDetails.priority ? (priorityMap[taskDetails.priority as PriorityType] || "#ffc107") : "#ffc107";
      const statusLabel = taskDetails.status ? (statusMap[taskDetails.status as StatusType] || taskDetails.status) : "Başlanmadı";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">İş Yönetim Sistemi</h1>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <h2 style="color: #0056b3; margin-top: 0;">Görev Ortağı Bildirimi</h2>
            <p>Bir göreve ortak olarak eklendiniz: <strong style="color: #333;">${taskDescription}</strong></p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Görev Detayları</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 40%;"><strong>Görev ID:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${taskId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Öncelik:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                  <span style="display: inline-block; padding: 3px 8px; background-color: ${priorityColor}; color: white; border-radius: 3px; font-size: 12px;">
                    ${taskDetails.priority || "Orta"}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Durum:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${statusLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Başlangıç Tarihi:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.start_date)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tamamlanma Tarihi:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.completion_date)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Planlanan İş Gücü:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formatValue(taskDetails.planned_labor, " saat")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Gerçekleşen İş Gücü:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formatValue(taskDetails.actual_labor, " saat")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>İş Büyüklüğü:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formatValue(taskDetails.work_size)}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Görevi Görüntüle
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
            Bu e-posta, İş Yönetim ve Takip Platformu tarafından otomatik olarak gönderilmiştir.
          </p>
        </div>
      `

      return emailService.sendEmail({
        to: [email],
        subject,
        body,
        html,
      })
    })

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises)
    return results.every((result) => result)
  },

  /**
   * Sends update notification to manager
   */
  sendTaskUpdateNotification: async (
    taskId: number,
    taskDescription: string,
    managerEmail: string,
    updateDetails: string,
    taskDetails: TaskDetails = {},
    updatedBy = "Bir kullanıcı",
  ) => {
    console.log("Received task details in email service:", JSON.stringify(taskDetails, null, 2));

    const subject = `İş Yönetim Sistemi - Görev Güncellemesi: ${taskDescription}`
    const body = `Yönettiğiniz bir görev güncellendi: "${taskDescription}". Güncelleme detayları: ${updateDetails}`

    const formattedDate = (dateStr: string | undefined) => {
      if (!dateStr) return "Belirtilmemiş"
      const date = new Date(dateStr)
      return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const formatValue = (value: any, unit: string = "") => {
      if (value === undefined || value === null || value === "") return "Belirtilmemiş"
      return `${value}${unit}`
    }

    const priorityMap = {
      High: "#dc3545",
      Medium: "#ffc107",
      Low: "#28a745",
      Yüksek: "#dc3545",
      Orta: "#ffc107",
      Düşük: "#28a745",
    } as const;

    const statusMap = {
      "Not Started": "Başlanmadı",
      "In Progress": "Devam Ediyor",
      Paused: "Duraklatıldı",
      Completed: "Tamamlandı",
      Cancelled: "İptal Edildi",
    } as const;

    type PriorityType = keyof typeof priorityMap;
    type StatusType = keyof typeof statusMap;

    console.log("Task priority:", taskDetails.priority);
    console.log("Task status:", taskDetails.status);

    const priorityColor = taskDetails.priority ? (priorityMap[taskDetails.priority as PriorityType] || "#ffc107") : "#ffc107";
    const statusLabel = taskDetails.status ? (statusMap[taskDetails.status as StatusType] || taskDetails.status) : "Başlanmadı";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">İş Yönetim Sistemi</h1>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <h2 style="color: #0056b3; margin-top: 0;">Görev Güncellemesi</h2>
          <p>Yönettiğiniz bir görev güncellendi: <strong style="color: #333;">${taskDescription}</strong></p>
          <p><strong>${updatedBy}</strong> tarafından ${new Date().toLocaleDateString("tr-TR")} tarihinde güncellendi.</p>
        </div>
        
        <div style="margin-bottom: 20px; background-color: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Güncelleme Detayları</h3>
          <p style="margin-bottom: 0;">${updateDetails}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Güncel Görev Detayları</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 40%;"><strong>Görev ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${taskId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Öncelik:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <span style="display: inline-block; padding: 3px 8px; background-color: ${priorityColor}; color: white; border-radius: 3px; font-size: 12px;">
                  ${taskDetails.priority || "Orta"}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Durum:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${statusLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Başlangıç Tarihi:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.start_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tamamlanma Tarihi:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.completion_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Planlanan İş Gücü:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formatValue(taskDetails.planned_labor, " saat")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Gerçekleşen İş Gücü:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formatValue(taskDetails.actual_labor, " saat")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>İş Büyüklüğü:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formatValue(taskDetails.work_size)}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Görevi Görüntüle
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
          Bu e-posta, İş Yönetim ve Takip Platformu tarafından otomatik olarak gönderilmiştir.
        </p>
      </div>
    `

    return emailService.sendEmail({
      to: [managerEmail],
      subject,
      body,
      html,
    })
  },

  /**
   * Sends notification to users who are added as "notified" to a task
   */
  sendTaskNotificationToUsers: async (
    taskId: number,
    taskDescription: string,
    notifiedEmails: string[],
    taskDetails: any = {},
  ) => {
    const subject = `İş Yönetim Sistemi - Görev Bildirimi: ${taskDescription}`
    const body = `"${taskDescription}" görevi hakkında bildirim almak üzere eklendiniz. Detaylar için lütfen kontrol panelini ziyaret edin.`

    const formattedDate = (dateStr: string) => {
      if (!dateStr) return "Belirtilmemiş"
      const date = new Date(dateStr)
      return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const priorityColor =
      {
        High: "#dc3545",
        Medium: "#ffc107",
        Low: "#28a745",
        Yüksek: "#dc3545",
        Orta: "#ffc107",
        Düşük: "#28a745",
      }[taskDetails.priority || "Medium"] || "#ffc107"

    const statusLabel =
      {
        "Not Started": "Başlanmadı",
        "In Progress": "Devam Ediyor",
        Paused: "Duraklatıldı",
        Completed: "Tamamlandı",
        Cancelled: "İptal Edildi",
      }[taskDetails.status || "Not Started"] ||
      taskDetails.status ||
      "Başlanmadı"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">İş Yönetim Sistemi</h1>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <h2 style="color: #0056b3; margin-top: 0;">Görev Bildirimi</h2>
          <p>Aşağıdaki görev hakkında bildirim almak üzere eklendiniz: <strong style="color: #333;">${taskDescription}</strong></p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Görev Detayları</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 40%;"><strong>Görev ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${taskId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Öncelik:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <span style="display: inline-block; padding: 3px 8px; background-color: ${priorityColor}; color: white; border-radius: 3px; font-size: 12px;">
                  ${taskDetails.priority || "Orta"}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Durum:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${statusLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Başlangıç Tarihi:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.start_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tamamlanma Tarihi:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate(taskDetails.completion_date)}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Görevi Görüntüle
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
          Bu e-posta, İş Yönetim ve Takip Platformu tarafından otomatik olarak gönderilmiştir.
        </p>
      </div>
    `

    return emailService.sendEmail({
      to: notifiedEmails,
      subject,
      body,
      html,
    })
  },
}

