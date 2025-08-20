
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Eye, Volume2, Bell, Mail, Monitor, Clock, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import type { Reminder } from '@shared/schema';

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
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [viewMode, setViewMode] = useState<'custom' | 'actual'>('custom');

  // Form state for custom preview
  const [message, setMessage] = useState("Take your vitamins");
  const [rudenessLevel, setRudenessLevel] = useState(3);
  const [voiceCharacter, setVoiceCharacter] = useState("default");
  const [motivationalQuote, setMotivationalQuote] = useState("");

  // Fetch actual user reminders
  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ["/api/reminders"],
  });

  const generatePreview = async () => {
    setLoading(true);
    try {
      if (viewMode === 'custom') {
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
      } else if (selectedReminder) {
        // Preview actual reminder
        const response = await fetch(`/api/dev/preview-actual-reminder/${selectedReminder.id}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to generate actual reminder preview: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        setPreviewData(data);
      }
      
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

  const previewActualReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setViewMode('actual');
    // Auto-generate preview when selecting a reminder
    setTimeout(() => generatePreview(), 100);
  };

  const playAudioPreview = async () => {
    setAudioLoading(true);
    try {
      // First try Unreal Speech API
      const response = await fetch('/api/dev/preview-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: viewMode === 'actual' && selectedReminder 
            ? selectedReminder.originalMessage 
            : message,
          voiceCharacter: viewMode === 'actual' && selectedReminder 
            ? selectedReminder.voiceCharacter 
            : voiceCharacter,
          rudenessLevel: viewMode === 'actual' && selectedReminder 
            ? selectedReminder.rudenessLevel 
            : rudenessLevel
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
      } else {
        // Log the error response
        const errorText = await response.text();
        console.error('Unreal Speech API failed:', response.status, errorText);
        
        toast({
          title: "Unreal Speech API Issue",
          description: `API returned ${response.status}. Check console for details.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Unreal Speech failed, falling back to Web Speech API:', error);
      
      toast({
        title: "Unreal Speech Error",
        description: "API connection failed. Using fallback voice...",
        variant: "destructive"
      });
    }

    // Fallback to Web Speech API
    try {
      if ('speechSynthesis' in window) {
        // Use the actual rude message from preview data if available
        const rudeMessage = previewData?.reminder?.rudeMessage || `${message}, shocking that you haven't done this yet!`;
        
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

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <Button
            variant={viewMode === 'custom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('custom')}
            className="rounded-md"
          >
            <Eye className="h-4 w-4 mr-2" />
            Custom Preview
          </Button>
          <Button
            variant={viewMode === 'actual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('actual')}
            className="rounded-md"
          >
            <List className="h-4 w-4 mr-2" />
            Actual Reminders
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        {viewMode === 'custom' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Custom Preview Configuration
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Your Actual Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {remindersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 border rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reminders Yet</h3>
                  <p className="text-gray-500">Create some reminders from the main page first!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(reminders as Reminder[]).map((reminder: Reminder) => (
                    <div
                      key={reminder.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedReminder?.id === reminder.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => previewActualReminder(reminder)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{reminder.title}</h4>
                          <p className="text-xs text-gray-500 truncate">{reminder.originalMessage}</p>
                          <div className="flex items-center mt-1 space-x-2">
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                            >
                              Level {reminder.rudenessLevel}
                            </Badge>
                            <div className="flex items-center text-xs text-gray-400">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(reminder.scheduledFor).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {selectedReminder?.id === reminder.id && (
                          <div className="ml-2">
                            <Badge variant="default" className="text-xs">Selected</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedReminder && (
                <div className="mt-4 pt-4 border-t">
                  <Button onClick={generatePreview} disabled={loading} className="w-full">
                    {loading ? "Generating Preview..." : "Generate Preview"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                  {previewData.reminder.motivationalQuote && (
                    <div><strong>Motivational Quote:</strong> <span className="text-blue-600 italic">"{previewData.reminder.motivationalQuote}"</span></div>
                  )}
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
