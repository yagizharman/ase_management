import { api } from "@/lib/api";

interface EmailData {
  to: string[];
  subject: string;
  body: string;
}

export const emailService = {
  /**
   * Sends an email notification
   */
  sendEmail: async (emailData: EmailData) => {
    try {
      // In a real implementation, this would connect to an email service
      // For now, we'll simulate by logging to console and storing in notifications
      console.log("Sending email:", emailData);
      
      // Store notification in the database for each recipient
      for (const recipient of emailData.to) {
        await api.post("/notifications", {
          recipient_email: recipient,
          subject: emailData.subject,
          body: emailData.body,
          sent_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  },
  
  /**
   * Sends task assignment notification
   */
  sendTaskAssignmentNotification: async (taskId: number, taskDescription: string, assigneeEmails: string[]) => {
    return emailService.sendEmail({
      to: assigneeEmails,
      subject: `New Task Assignment: ${taskDescription}`,
      body: `You have been assigned a new task: "${taskDescription}". Please check your dashboard for details.`
    });
  },
  
  /**
   * Sends task partner notification
   */
  sendTaskPartnerNotification: async (taskId: number, taskDescription: string, partnerEmails: string[]) => {
    return emailService.sendEmail({
      to: partnerEmails,
      subject: `You've been added as a partner on: ${taskDescription}`,
      body: `You have been added as a partner on the task: "${taskDescription}". Please check your dashboard for details.`
    });
  },
  
  /**
   * Sends task update notification to manager
   */
  sendTaskUpdateNotification: async (taskId: number, taskDescription: string, managerEmail: string, updateDetails: string) => {
    return emailService.sendEmail({
      to: [managerEmail],
      subject: `Task Update: ${taskDescription}`,
      body: `A task you're managing has been updated: "${taskDescription}". Update details: ${updateDetails}`
    });
  }
};
