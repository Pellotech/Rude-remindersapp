import type { WebSocketServer } from "ws";
import type { Reminder, User } from "@shared/schema";

class NotificationService {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  // Generate speech using browser's built-in speech synthesis (more robotic)
  generateBrowserSpeech(text: string, character: string = "default"): { text: string, character: string } {
    // Return data for client-side speech synthesis
    return {
      text: text,
      character: character
    };
  }

  // Map character names to browser speech synthesis settings
  getBrowserVoiceSettings(character: string): { rate: number, pitch: number, voice?: string } {
    const voiceSettings: Record<string, { rate: number, pitch: number, voice?: string }> = {
      'default': { rate: 1.0, pitch: 1.0 },
      'drill-sergeant': { rate: 1.2, pitch: 0.8 },
      'robot': { rate: 0.8, pitch: 0.6 }, // More robotic
      'british-butler': { rate: 0.9, pitch: 1.1 },
      'mom': { rate: 1.0, pitch: 1.2 },
      'motivational-coach': { rate: 1.3, pitch: 1.1 },
      'wise-teacher': { rate: 0.9, pitch: 1.0 },
      'confident-leader': { rate: 1.1, pitch: 0.9 },
      'calm-narrator': { rate: 0.8, pitch: 1.0 },
      'energetic-trainer': { rate: 1.4, pitch: 1.2 }
    };

    return voiceSettings[character] || voiceSettings.default;
  }

  sendBrowserNotification(reminder: Reminder, user: User) {
    // Browser notifications are handled on the client side
    // We just send the data via WebSocket
    console.log(`Browser notification for ${user.email}: ${reminder.rudeMessage}`);
  }

  async sendVoiceNotification(reminder: Reminder, user: User) {
    try {
      if (!reminder.voiceCharacter) return;

      const voiceSettings = this.getBrowserVoiceSettings(reminder.voiceCharacter);
      const speechData = this.generateBrowserSpeech(reminder.currentResponse || reminder.rudeMessage, reminder.voiceCharacter);

      if (this.wss) {
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'voice_notification',
              reminder,
              speechData,
              voiceSettings,
              voiceCharacter: reminder.voiceCharacter
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error sending voice notification:', error);
    }
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