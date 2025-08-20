
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Eye, Volume2, Bell, Mail, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RUDENESS_LEVELS = [
  { level: 1, emoji: "😊", label: "Gentle" },
  { level: 2, emoji: "🙂", label: "Firm" },
  { level: 3, emoji: "😏", label: "Sarcastic" },
  { level: 4, emoji: "😠", label: "Harsh" },
  { level: 5, emoji: "🤬", label: "Savage" }
];

const VOICE_CHARACTERS = [
  { id: "default", name: "Default Voice" },
  { id: "drill-sergeant", name: "Drill Sergeant" },
  { id: "robot", name: "AI Assistant" },
  { id: "life-coach", name: "Life Coach" },
  { id: "sarcastic-friend", name: "Sarcastic Friend" },
  { id: "motivational-speaker", name: "Motivational Speaker" }
];

export default function DevPreview() {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // Form state
  const [message, setMessage] = useState("Take your vitamins");
  const [rudenessLevel, setRudenessLevel] = useState(3);
  const [voiceCharacter, setVoiceCharacter] = useState("default");
  const [motivationalQuote, setMotivationalQuote] = useState("");

  const generatePreview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        message,
        level: rudenessLevel.toString(),
        voice: voiceCharacter,
        ...(motivationalQuote && { quote: motivationalQuote })
      });

      const response = await fetch(`/api/dev/preview-reminder?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate preview: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      setPreviewData(data);
      
      toast({
        title: "Preview Generated",
        description: "Reminder preview has been generated successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate preview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const playAudioPreview = async () => {
    setAudioLoading(true);
    try {
      // First try Unreal Speech API
      const response = await fetch('/api/dev/preview-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          voiceCharacter,
          rudenessLevel
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        await audio.play();

        toast({
          title: "Audio Preview",
          description: "Playing Unreal Speech voice preview..."
        });
        return;
      }
    } catch (error) {
      console.log('Unreal Speech failed, falling back to Web Speech API:', error);
    }

    // Fallback to Web Speech API
    try {
      if ('speechSynthesis' in window) {
        // Generate the rude message
        const rudeMessage = `${message}, shocking that you haven't done this yet!`; // Sample fallback
        
        const utterance = new SpeechSynthesisUtterance(rudeMessage);
        
        // Apply voice character settings
        switch (voiceCharacter) {
          case 'drill-sergeant':
            utterance.rate = 1.1;
            utterance.pitch = 0.8;
            break;
          case 'robot':
            utterance.rate = 0.8;
            utterance.pitch = 0.9;
            break;
          case 'british-butler':
            utterance.rate = 0.85;
            utterance.pitch = 1.1;
            break;
          case 'mom':
            utterance.rate = 0.9;
            utterance.pitch = 1.2;
            break;
          default:
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
        }
        
        speechSynthesis.speak(utterance);

        toast({
          title: "Audio Preview",
          description: "Playing Web Speech API fallback preview..."
        });
      } else {
        throw new Error('Speech synthesis not supported');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Voice preview not available in this browser",
        variant: "destructive"
      });
    } finally {
      setAudioLoading(false);
    }
  };

  const simulateBrowserNotification = () => {
    if (!previewData) return;

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(previewData.notifications.browser.title, {
          body: previewData.notifications.browser.body,
          icon: previewData.notifications.browser.icon
        });
      } else {
        toast({
          title: "Browser Notifications",
          description: "Please enable browser notifications to test this feature"
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-rude-red-600 mb-2">
          🛠️ Developer Reminder Preview
        </h1>
        <p className="text-muted-foreground">
          Test and preview how reminders will look and sound when triggered
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="message">Reminder Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter reminder message..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="rudeness">Rudeness Level</Label>
              <Select value={rudenessLevel.toString()} onValueChange={(value) => setRudenessLevel(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUDENESS_LEVELS.map((level) => (
                    <SelectItem key={level.level} value={level.level.toString()}>
                      {level.emoji} {level.label} (Level {level.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="voice">Voice Character</Label>
              <Select value={voiceCharacter} onValueChange={setVoiceCharacter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_CHARACTERS.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quote">Motivational Quote (Optional)</Label>
              <Input
                id="quote"
                value={motivationalQuote}
                onChange={(e) => setMotivationalQuote(e.target.value)}
                placeholder="Add a motivational quote..."
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePreview} disabled={loading} className="flex-1">
                {loading ? "Generating..." : "Generate Preview"}
              </Button>
              <Button 
                onClick={playAudioPreview} 
                disabled={audioLoading}
                variant="outline"
                size="icon"
              >
                {audioLoading ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Results */}
        {previewData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Reminder Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reminder Details */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="font-semibold mb-2">Reminder Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Original:</strong> {previewData.reminder.originalMessage}</div>
                  <div><strong>Rude Message:</strong> <span className="text-rude-red-600">{previewData.reminder.rudeMessage}</span></div>
                  <div><strong>Level:</strong> <Badge variant="outline">{previewData.reminder.rudenessLevel}/5</Badge></div>
                  <div><strong>Voice:</strong> {previewData.reminder.voiceCharacter}</div>
                </div>
              </div>

              <Separator />

              {/* Notification Previews */}
              <div className="space-y-3">
                <h3 className="font-semibold">Notification Types</h3>
                
                {/* Browser Notification */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span className="text-sm">Browser Notification</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={simulateBrowserNotification}>
                    Test
                  </Button>
                </div>

                {/* Voice Notification */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-sm">Voice Notification</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={playAudioPreview} disabled={audioLoading}>
                    {audioLoading ? "Playing..." : "Test"}
                  </Button>
                </div>

                {/* Email Notification */}
                <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email Notification</span>
                  </div>
                  <Badge variant="secondary">Preview Only</Badge>
                </div>
              </div>

              <Separator />

              {/* Real-time Data */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Real-time WebSocket Data</h4>
                <pre className="text-xs text-muted-foreground overflow-auto">
                  {JSON.stringify(previewData.notifications.realtime, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Developer Notes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Developer Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• This preview page is only accessible in development mode</p>
            <p>• Browser notifications require permission to be granted</p>
            <p>• Voice previews use the actual Unreal Speech API</p>
            <p>• Real-time notifications show the WebSocket data structure</p>
            <p>• Access this page at: <code>/dev-preview</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
