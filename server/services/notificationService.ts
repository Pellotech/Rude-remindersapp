import type { WebSocketServer } from "ws";
import type { Reminder, User } from "@shared/schema";
import fetch from 'node-fetch';

class NotificationService {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  async generateUnrealSpeech(text: string, voiceId: string = 'Scarlett'): Promise<Buffer | null> {
    const apiKey = process.env.UNREAL_SPEECH_API_KEY;
    
    if (!apiKey) {
      console.error('UNREAL_SPEECH_API_KEY not found in environment variables');
      return null;
    }

    try {
      const response = await fetch('https://api.v8.unrealspeech.com/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Text: text,
          VoiceId: voiceId,
          Bitrate: '192k',
          Speed: '0',
          Pitch: '1',
          Codec: 'libmp3lame',
          Temperature: 0.25
        }),
      });

      if (!response.ok) {
        throw new Error(`Unreal Speech API error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.buffer();
      return audioBuffer;
    } catch (error) {
      console.error('Error generating speech with Unreal Speech:', error);
      return null;
    }
  }

  getUnrealVoiceId(voiceCharacter: string): string {
    const voiceMapping: { [key: string]: string } = {
      'default': 'Scarlett',
      'drill-sergeant': 'Dan',
      'robot': 'Will',
      'british-butler': 'Amy',
      'mom': 'Scarlett',
      'life-coach': 'Liv',
      'sarcastic-friend': 'Dan',
      'motivational-speaker': 'Will'
    };

    return voiceMapping[voiceCharacter] || 'Scarlett';
  }

  async sendBrowserNotification(reminder: Reminder, user: User) {
    // Browser notifications are handled on the client side
    // We just send the data via WebSocket
    console.log(`Browser notification for ${user.email}: ${reminder.rudeMessage}`);
  }

  async sendVoiceNotification(reminder: Reminder, user: User) {
    const voiceId = this.getUnrealVoiceId(reminder.voiceCharacter || 'default');
    
    try {
      const audioBuffer = await this.generateUnrealSpeech(reminder.rudeMessage, voiceId);
      
      if (audioBuffer) {
        // Convert audio buffer to base64 for transmission
        const audioBase64 = audioBuffer.toString('base64');
        
        // Send audio data via WebSocket
        if (this.wss) {
          const audioData = {
            type: 'voice-notification',
            reminder: {
              id: reminder.id,
              title: reminder.title,
              rudeMessage: reminder.rudeMessage,
              voiceCharacter: reminder.voiceCharacter,
            },
            audioData: audioBase64,
            userId: user.id,
          };

          this.wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify(audioData));
            }
          });
        }
        
        console.log(`Unreal Speech notification generated for ${user.email}: ${reminder.rudeMessage}`);
      } else {
        // Fallback to client-side speech synthesis
        console.log(`Fallback to Web Speech API for ${user.email}: ${reminder.rudeMessage}`);
      }
    } catch (error) {
      console.error('Error with Unreal Speech, falling back to client-side synthesis:', error);
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
