import type { WebSocketServer } from "ws";
import type { Reminder, User } from "@shared/schema";

class NotificationService {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  async sendBrowserNotification(reminder: Reminder, user: User) {
    // Browser notifications are handled on the client side
    // We just send the data via WebSocket
    console.log(`Browser notification for ${user.email}: ${reminder.rudeMessage}`);
  }

  async sendVoiceNotification(reminder: Reminder, user: User) {
    // Voice notifications are handled on the client side via Web Speech API
    // We send the command via WebSocket
    console.log(`Voice notification for ${user.email}: ${reminder.rudeMessage}`);
  }

  async sendEmailNotification(reminder: Reminder, user: User) {
    // In a real implementation, you would use a service like Nodemailer
    // For now, we'll log the email that would be sent
    console.log(`Email notification to ${user.email}:`);
    console.log(`Subject: Rude Reminder: ${reminder.title}`);
    console.log(`Body: ${reminder.rudeMessage}`);
    console.log(`Scheduled for: ${reminder.scheduledFor}`);
    
    // TODO: Implement actual email sending with Nodemailer
    // const transporter = nodemailer.createTransporter({...});
    // await transporter.sendMail({
    //   to: user.email,
    //   subject: `Rude Reminder: ${reminder.title}`,
    //   html: `
    //     <h2>Your Rude Reminder</h2>
    //     <p><strong>${reminder.rudeMessage}</strong></p>
    //     <p>Originally scheduled for: ${reminder.scheduledFor}</p>
    //   `
    // });
  }

  async sendRealtimeNotification(reminder: Reminder, user: User) {
    if (!this.wss) return;

    const notificationData = {
      type: 'reminder',
      reminder: {
        id: reminder.id,
        title: reminder.title,
        rudeMessage: reminder.rudeMessage,
        rudenessLevel: reminder.rudenessLevel,
        browserNotification: reminder.browserNotification,
        voiceNotification: reminder.voiceNotification,
        emailNotification: reminder.emailNotification,
      },
      userId: user.id,
    };

    // Send to all connected clients (in a real app, you'd filter by user)
    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(notificationData));
      }
    });

    console.log(`Real-time notification sent for reminder: ${reminder.title}`);
  }
}

export const notificationService = new NotificationService();
