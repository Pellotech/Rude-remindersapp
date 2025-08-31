import type { WebSocketServer } from "ws";
import type { Reminder, User } from "@shared/schema";
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

class NotificationService {
  private wss: WebSocketServer | null = null;
  private emailTransporter: Transporter | null = null;

  constructor() {
    this.initializeEmailService();
  }

  private initializeEmailService() {
    // Initialize email transporter with Gmail SMTP
    try {
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'ruderemindersinfo@gmail.com',
          pass: process.env.EMAIL_APP_PASSWORD // This should be an App Password, not the regular password
        }
      });

      // Verify the connection
      this.emailTransporter.verify((error, success) => {
        if (error) {
          console.error('Email service initialization failed:', error);
          this.emailTransporter = null;
        } else {
          console.log('✅ Email service initialized successfully');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.emailTransporter = null;
    }
  }

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
    const voiceSettings: Record<string, { rate: number, pitch: pitch, voiceType: string }> = {
      'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' }, // Scarlett - professional
      'drill-sergeant': { rate: 1.3, pitch: 0.7, voiceType: 'male' }, // Dan - tough man
      'robot': { rate: 0.8, pitch: 0.6, voiceType: 'robotic' }, // Will - more robotic
      'british-butler': { rate: 0.85, pitch: 0.8, voiceType: 'british-male' }, // Gerald - British man
      'mom': { rate: 1.0, pitch: 1.3, voiceType: 'female' }, // Jane - disappointed mom
      'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' } // Will - executive style
    };

    return voiceSettings[character] || voiceSettings.default;
  }

  async sendBrowserNotification(reminder: Reminder, user: User) {
    try {
      // Send rich notification data via WebSocket for browser display
      if (this.wss) {
        const notificationData = {
          type: 'browser_notification',
          reminder: {
            id: reminder.id,
            title: reminder.title,
            originalMessage: reminder.originalMessage,
            rudeMessage: reminder.rudeMessage,
            motivationalQuote: reminder.motivationalQuote,
            rudenessLevel: reminder.rudenessLevel,
            browserNotification: reminder.browserNotification,
            voiceNotification: reminder.voiceNotification,
            emailNotification: reminder.emailNotification,
            voiceCharacter: reminder.voiceCharacter,
            attachments: reminder.attachments || [],
            responses: reminder.responses || [],
            scheduledFor: reminder.scheduledFor,
            context: reminder.context,
            isMultiDay: reminder.isMultiDay,
            selectedDays: reminder.selectedDays
          },
          userId: user.id,
          displayStyle: 'full' // Show full reminder content, not just basic notification
        };

        this.wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(notificationData));
          }
        });
      }

      console.log(`Browser notification sent for ${user.email}: ${reminder.rudeMessage}`);
    } catch (error) {
      console.error('Error sending browser notification:', error);
    }
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
    if (!this.emailTransporter) {
      console.error('Email service not available - falling back to console log');
      console.log(`Would send email to ${user.email}: ${reminder.rudeMessage}`);
      return;
    }

    try {
      const emailContent = this.generateEmailContent(reminder, user);
      
      const mailOptions = {
        from: {
          name: 'Rude Reminders',
          address: process.env.EMAIL_USER || 'ruderemindersinfo@gmail.com'
        },
        to: user.email,
        subject: `🔔 Rude Reminder: ${reminder.title}`,
        html: emailContent,
        text: this.generatePlainTextEmail(reminder)
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${user.email}:`, info.messageId);
      
    } catch (error) {
      console.error(`❌ Failed to send email to ${user.email}:`, error);
      // Fallback to console log if email fails
      console.log(`Fallback - Would send: ${reminder.rudeMessage}`);
    }
  }

  private generateEmailContent(reminder: Reminder, user: User): string {
    const formattedDate = new Date(reminder.scheduledFor).toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rude Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; }
          .reminder-text { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444; }
          .quote { background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0; font-style: italic; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔔 Rude Reminder Alert!</h1>
        </div>
        <div class="content">
          <h2>Hey ${user.firstName || 'there'}!</h2>
          
          <div class="reminder-text">
            <h3>📋 ${reminder.title}</h3>
            <p><strong>${reminder.rudeMessage}</strong></p>
          </div>

          ${reminder.motivationalQuote ? `
            <div class="quote">
              <p>💪 <em>${reminder.motivationalQuote}</em></p>
            </div>
          ` : ''}

          <p><strong>⏰ Originally scheduled for:</strong> ${formattedDate}</p>
          
          ${reminder.context ? `<p><strong>📂 Category:</strong> ${reminder.context}</p>` : ''}
          
          <p>Time to take action! 🚀</p>
        </div>
        
        <div class="footer">
          <p>This reminder was sent by Rude Reminders</p>
          <p>Manage your notifications in your account settings</p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePlainTextEmail(reminder: Reminder): string {
    const formattedDate = new Date(reminder.scheduledFor).toLocaleString();
    
    return `
🔔 RUDE REMINDER ALERT!

📋 ${reminder.title}

${reminder.rudeMessage}

${reminder.motivationalQuote ? `💪 ${reminder.motivationalQuote}\n` : ''}

⏰ Originally scheduled for: ${formattedDate}

Time to take action! 🚀

---
This reminder was sent by Rude Reminders
Manage your notifications in your account settings
    `.trim();
  }

  async sendTestEmail(userEmail: string): Promise<boolean> {
    if (!this.emailTransporter) {
      console.error('Email service not available for test');
      return false;
    }

    try {
      const testMailOptions = {
        from: {
          name: 'Rude Reminders',
          address: process.env.EMAIL_USER || 'ruderemindersinfo@gmail.com'
        },
        to: userEmail,
        subject: '🔔 Test Email from Rude Reminders - Gmail Updated!',
        html: `
          <h2>🎉 Gmail Service is Working!</h2>
          <p>This test confirms your updated Gmail settings are working perfectly!</p>
          <p><strong>Email configured for:</strong> ruderemindersinfo@gmail.com</p>
          <p><strong>Share features available in your app:</strong></p>
          <ul>
            <li>✅ Twitter/X sharing</li>
            <li>✅ Facebook sharing</li>
            <li>✅ LinkedIn sharing</li>
            <li>✅ WhatsApp sharing</li>
            <li>✅ Copy link to clipboard</li>
            <li>✅ Native mobile sharing (iOS/Android)</li>
            <li>✅ Direct email sharing</li>
          </ul>
          <p>Your reminder notifications will now be sent from <strong>ruderemindersinfo@gmail.com</strong> to your email address!</p>
          <hr>
          <p><small>This test email was sent to verify your Gmail configuration update.</small></p>
        `,
        text: `
🎉 GMAIL SERVICE IS WORKING!

This test confirms your updated Gmail settings are working perfectly!

Email configured for: ruderemindersinfo@gmail.com

Share features available in your app:
✅ Twitter/X sharing
✅ Facebook sharing  
✅ LinkedIn sharing
✅ WhatsApp sharing
✅ Copy link to clipboard
✅ Native mobile sharing (iOS/Android)
✅ Direct email sharing

Your reminder notifications will now be sent from ruderemindersinfo@gmail.com to your email address!

---
This test email was sent to verify your Gmail configuration update.
        `
      };

      const info = await this.emailTransporter.sendMail(testMailOptions);
      console.log(`✅ Test email sent successfully to ${userEmail}:`, info.messageId);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to send test email to ${userEmail}:`, error);
      return false;
    }
  }

  // Method to send test email from API endpoint
  async sendTestEmailToUser(): Promise<boolean> {
    return this.sendTestEmail('ruderemindersinfo@gmail.com');
  }

  async sendRealtimeNotification(reminder: Reminder, user: User) {
    if (!this.wss) return;

    const notificationData = {
      type: 'reminder',
      reminder: {
        id: reminder.id,
        title: reminder.title,
        originalMessage: reminder.originalMessage,
        rudeMessage: reminder.rudeMessage,
        motivationalQuote: reminder.motivationalQuote,
        rudenessLevel: reminder.rudenessLevel,
        browserNotification: reminder.browserNotification,
        voiceNotification: reminder.voiceNotification,
        emailNotification: reminder.emailNotification,
        voiceCharacter: reminder.voiceCharacter,
        attachments: reminder.attachments || [],
        responses: reminder.responses || [],
        scheduledFor: reminder.scheduledFor,
        context: reminder.context,
        isMultiDay: reminder.isMultiDay,
        selectedDays: reminder.selectedDays
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