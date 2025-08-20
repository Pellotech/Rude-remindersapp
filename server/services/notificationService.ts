import type { WebSocketServer } from "ws";
import type { Reminder, User } from "@shared/schema";

class NotificationService {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  // Unreal Speech API integration - returns base64 data URL for client
  async generateUnrealSpeech(text: string, voiceId: string = "Scarlett"): Promise<string | null> {
    const apiKey = process.env.UNREAL_SPEECH_API_KEY;
    if (!apiKey) {
      console.error("UNREAL_SPEECH_API_KEY not found");
      return null;
    }

    try {
      const response = await fetch("https://api.v6.unrealspeech.com/stream", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          Text: text,
          VoiceId: voiceId,
          Bitrate: "192k",
          Speed: "0",
          Pitch: "1",
          Codec: "libmp3lame"
        })
      });

      if (!response.ok) {
        console.error(`Unreal Speech API error: ${response.status} ${response.statusText}`);
        return null;
      }

      // Convert to base64 data URL for client-side audio playback
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      return `data:audio/mpeg;base64,${base64Audio}`;
    } catch (error) {
      console.error("Error generating Unreal Speech:", error);
      return null;
    }
  }

  // Generate Unreal Speech and return raw buffer for streaming
  async generateUnrealSpeechBuffer(text: string, voiceId: string = "Scarlett"): Promise<Buffer | null> {
    const apiKey = process.env.UNREAL_SPEECH_API_KEY;
    if (!apiKey) {
      console.error("UNREAL_SPEECH_API_KEY not found");
      return null;
    }

    try {
      const response = await fetch("https://api.v6.unrealspeech.com/stream", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          Text: text,
          VoiceId: voiceId,
          Bitrate: "192k",
          Speed: "0",
          Pitch: "1",
          Codec: "libmp3lame"
        })
      });

      if (!response.ok) {
        console.error(`Unreal Speech API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const audioBuffer = await response.arrayBuffer();
      return Buffer.from(audioBuffer);
    } catch (error) {
      console.error("Error generating Unreal Speech:", error);
      return null;
    }
  }

  // Map voice characters to Unreal Speech voice IDs
  getUnrealVoiceId(voiceCharacter: string): string {
    const voiceMap: Record<string, string> = {
      "default": "Scarlett",
      "drill-sergeant": "Dan", 
      "robot": "Will",
      "british-butler": "Amy",
      "mom": "Scarlett",
      "motivational-coach": "Dan",
      "wise-teacher": "Amy",
      "confident-leader": "Will",
      "calm-narrator": "Scarlett",
      "energetic-trainer": "Dan"
    };

    return voiceMap[voiceCharacter] || "Scarlett";
  }

  async sendBrowserNotification(reminder: Reminder, user: User) {
    // Browser notifications are handled on the client side
    // We just send the data via WebSocket
    console.log(`Browser notification for ${user.email}: ${reminder.rudeMessage}`);
  }

  async sendVoiceNotification(reminder: Reminder, user: User) {
    // Generate Unreal Speech audio if voice character is specified
    if (reminder.voiceCharacter) {
      const voiceId = this.getUnrealVoiceId(reminder.voiceCharacter);
      const audioUrl = await this.generateUnrealSpeech(reminder.rudeMessage, voiceId);
      
      if (audioUrl) {
        // Send audio URL via WebSocket for client-side playback
        this.sendRealtimeNotification({
          ...reminder,
          audioUrl
        } as any, user);
        console.log(`Unreal Speech audio generated for ${user.email}: ${voiceId}`);
        return;
      }
    }

    // Fallback to client-side Web Speech API
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
