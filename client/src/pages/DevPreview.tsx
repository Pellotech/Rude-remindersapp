import { useState } from 'react';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Loader2, Clock, User, Volume2, ArrowUpDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Reminder } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';


// Helper function to check if user has premium access - no dropdown dependencies
const usePremiumStatus = (): { 
  isPremium: boolean; 
  features: { aiGeneratedResponses: boolean; aiGeneratedQuotes: boolean } 
} => {
  const { data } = useQuery({
    queryKey: ["/api/user/premium-status"],
    retry: false,
    staleTime: 1000, // Refresh quickly for dev tools
  });
  
  return {
    isPremium: data?.isPremium || false,
    features: data?.features || {
      aiGeneratedResponses: false,
      aiGeneratedQuotes: false,
    }
  };
};

export default function DevPreview() {
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  
  const [sortBy, setSortBy] = useState<'scheduled' | 'created'>('scheduled'); // New state for sorting
  const { toast } = useToast();
  const { isPremium, features } = usePremiumStatus();

  // Fetch all reminders with auto-refresh for generating status
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['/api/reminders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/reminders');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
    refetchInterval: (query) => {
      // Auto-refresh every 2 seconds if any reminder is generating
      const reminders = query.state.data || [];
      const hasGenerating = reminders.some((r: any) => r.status === 'generating');
      return hasGenerating ? 2000 : false;
    },
  });

  // Auto-generate AI responses for existing reminders that don't have them
  const generateMissingResponses = async () => {
    for (const reminder of reminders) {
      if (!reminder.rudeMessage || reminder.rudeMessage === "") {
        try {
          console.log(`Auto-generating missing AI response for reminder: ${reminder.originalMessage}`);
          await apiRequest('POST', `/api/reminders/${reminder.id}/generate-response`);
        } catch (error) {
          console.error(`Failed to generate response for reminder ${reminder.id}:`, error);
        }
      }
    }
  };

  // Trigger generation for missing responses when reminders load
  React.useEffect(() => {
    if (reminders.length > 0) {
      const remindersMissingResponses = reminders.filter(r => 
        !r.rudeMessage || r.rudeMessage === ""
      );
      if (remindersMissingResponses.length > 0) {
        generateMissingResponses();
      }
    }
  }, [reminders.length]);

  

  // Sort reminders based on selected criteria
  const sortedReminders = [...reminders].sort((a: Reminder, b: Reminder) => {
    if (sortBy === 'scheduled') {
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    } else {
      return new Date(a.createdAt || a.scheduledFor).getTime() - new Date(b.createdAt || b.scheduledFor).getTime();
    }
  });



  const handleVoicePreview = async () => {
    if (!selectedReminder?.rudeMessage) return;

    setIsPlayingVoice(true);

    try {
      const response = await fetch('/api/test-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedReminder.rudeMessage,
          voiceId: selectedReminder.voiceCharacter,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.useBrowserSpeech && data.speechData && data.voiceSettings) {
        // Use browser's speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.speechData.text);
          utterance.rate = data.voiceSettings.rate;
          utterance.pitch = data.voiceSettings.pitch;

          // Select appropriate voice based on character
          const voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            let selectedVoice = null;

            switch (selectedReminder.voiceCharacter) {
              case 'drill-sergeant':
                // Look for male voices (Dan - tough man)
                selectedVoice = voices.find(voice => 
                  voice.name.includes('Male') || 
                  voice.name.includes('David') ||
                  voice.name.includes('Mark') ||
                  voice.name.includes('Daniel')
                );
                break;

              case 'british-butler':
                // Look for British male voices (Gerald - British man)
                selectedVoice = voices.find(voice => 
                  voice.lang.includes('en-GB') || 
                  voice.name.includes('British') ||
                  voice.name.includes('Oliver') ||
                  voice.name.includes('Arthur')
                );
                break;

              case 'default':
                // Look for female voices (Scarlett - professional)
                selectedVoice = voices.find(voice => 
                  voice.name.includes('Female') ||
                  voice.name.includes('Samantha') ||
                  voice.name.includes('Victoria') ||
                  voice.name.includes('Susan')
                );
                break;

              case 'mom':
                // Look for female voices (Jane - disappointed mom)
                selectedVoice = voices.find(voice => 
                  voice.name.includes('Female') ||
                  voice.name.includes('Samantha') ||
                  voice.name.includes('Victoria') ||
                  voice.name.includes('Susan')
                );
                break;

              case 'robot':
                // Look for robotic/computer voices (Will - AI Assistant)
                selectedVoice = voices.find(voice => 
                  voice.name.includes('Microsoft') || 
                  voice.name.includes('Robot') ||
                  voice.name.includes('Computer') ||
                  voice.name.includes('Zira')
                );
                break;

              case 'confident-leader':
                // Look for male voices (Will - executive style)
                selectedVoice = voices.find(voice => 
                  voice.name.includes('Male') || 
                  voice.name.includes('David') ||
                  voice.name.includes('Mark') ||
                  voice.name.includes('Daniel')
                );
                break;
            }

            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }

          utterance.onend = () => setIsPlayingVoice(false);
          utterance.onerror = () => {
            setIsPlayingVoice(false);
            toast({
              title: "Speech Error",
              description: "Failed to play speech",
              variant: "destructive",
            });
          };

          speechSynthesis.speak(utterance);
        } else {
          throw new Error('Speech synthesis not supported');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      setIsPlayingVoice(false);
      console.error('Voice preview error:', error);
      toast({
        title: "Voice Preview Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateInput: string | Date, reminder?: Reminder, isCreatedDate = false) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const formatted = date.toLocaleString();

    if (isCreatedDate) {
      return `Created: ${formatted}`;
    }

    // If it's a multi-day reminder, show the selected days
    if (reminder?.isMultiDay && reminder?.selectedDays && reminder.selectedDays.length > 0) {
      const dayNames = {
        'monday': 'Mon',
        'tuesday': 'Tue',
        'wednesday': 'Wed',
        'thursday': 'Thu',
        'friday': 'Fri',
        'saturday': 'Sat',
        'sunday': 'Sun'
      };
      const selectedDayNames = reminder.selectedDays.map(day => dayNames[day as keyof typeof dayNames]).join(', ');
      return `${formatted} (Repeats: ${selectedDayNames})`;
    }

    return formatted;
  };

  const getRudenessColor = (level: number) => {
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-blue-100 text-blue-800",
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-orange-100 text-orange-800",
      5: "bg-red-100 text-red-800",
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading reminders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reminder Preview</h1>
        <p className="text-gray-600">Preview and test your actual reminders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reminders List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Reminders</CardTitle>
                <CardDescription>Click a reminder to preview it</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy(sortBy === 'scheduled' ? 'created' : 'scheduled')}
                className="flex items-center gap-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                Sort by {sortBy === 'scheduled' ? 'Date Created' : 'Date Scheduled'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!sortedReminders || sortedReminders.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No reminders found.</p>
                <p className="text-sm mt-2">Create a reminder from the main page first!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sortedReminders.map((reminder: Reminder) => {
                  
                  return (
                    <div
                      key={reminder.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedReminder?.id === reminder.id 
                          ? 'bg-blue-50 border-blue-200 border-2' 
                          : 'border-gray-200 opacity-75 hover:opacity-100 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedReminder(reminder)}
                    >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{reminder.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {sortBy === 'scheduled' 
                            ? formatDateTime(reminder.scheduledFor, reminder)
                            : formatDateTime(reminder.createdAt || reminder.scheduledFor, reminder, true)
                          }
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-xs ${getRudenessColor(reminder.rudenessLevel)}`}>
                          Level {reminder.rudenessLevel}
                        </Badge>
                        {/* Premium/Free indicator based on actual user status */}
                        {isPremium && features.aiGeneratedResponses ? (
                          <Badge className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                            Premium AI
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-gray-400 text-gray-600">
                            Free Template
                          </Badge>
                        )}
                        {reminder.isMultiDay && (
                          <Badge variant="secondary" className="text-xs">
                            Multi-Day
                          </Badge>
                        )}
                        {reminder.completed && (
                          <Badge variant="outline" className="text-xs">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                    {reminder.voiceCharacter && reminder.voiceCharacter !== 'default' && (
                      <div className="flex items-center mt-2 text-xs text-gray-600">
                        <Volume2 className="h-3 w-3 mr-1" />
                        {reminder.voiceCharacter.replace('-', ' ')}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Reminder Preview</CardTitle>
            <CardDescription>See how your reminder will appear</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedReminder ? (
              <div className="space-y-4">


                <div>
                  <Label className="text-sm font-medium">Original Message</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedReminder.originalMessage}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Generated Response</Label>
                    {selectedReminder.rudeMessage && (
                      isPremium && features.aiGeneratedResponses ? (
                        <Badge className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                          Premium AI Generated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-gray-400 text-gray-600">
                          Free Template Based
                        </Badge>
                      )
                    )}
                  </div>
                  {selectedReminder.rudeMessage ? (
                    <div className={`mt-1 p-3 rounded-lg border-l-4 ${
                      isPremium && features.aiGeneratedResponses
                        ? 'bg-purple-50 border-purple-400' 
                        : 'bg-gray-50 border-gray-400'
                    }`}>
                      <p className="text-sm font-medium text-gray-800">
                        {selectedReminder.rudeMessage}
                      </p>
                    </div>
                  ) : selectedReminder.status === 'generating' ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-600">Generating AI response...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">AI response will be generated automatically</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Voice Character</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedReminder.voiceCharacter || "Default"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Scheduled Time</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedReminder.scheduledFor).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground mt-1 capitalize">
                    {selectedReminder.status}
                  </p>
                </div>
                {selectedReminder.context && (
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {selectedReminder.context}
                    </p>
                  </div>
                )}
                {selectedReminder.attachments && selectedReminder.attachments.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Attachments</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {selectedReminder.attachments.map((attachment: string, index: number) => (
                        <div key={index} className="relative">
                          <img
                            src={attachment}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-20 object-cover rounded-md border"
                            onError={(e) => {
                              // Handle broken images by showing a placeholder
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmNWY1ZjUiLz4KPGJ0cj5QaG90byBub3QgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';
                              target.style.display = 'flex';
                              target.style.alignItems = 'center';
                              target.style.justifyContent = 'center';
                              target.style.backgroundColor = '#f5f5f5';
                              target.style.color = '#999';
                              target.style.fontSize = '12px';
                            }}
                          />
                          <span className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedReminder.attachments.length} attachment(s)
                    </p>
                  </div>
                )}

                {selectedReminder.motivationalQuote && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Motivational Quote</Label>
                      {/* Premium or cultural quote indicator based on user status */}
                      {isPremium && features.aiGeneratedQuotes ? (
                        <Badge className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                          Premium AI Quote
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-600">
                          Cultural Quote
                        </Badge>
                      )}
                    </div>
                    <div className={`mt-1 p-3 rounded-lg border-l-4 ${
                      isPremium && features.aiGeneratedQuotes
                        ? 'bg-purple-50 border-purple-500' 
                        : 'bg-blue-50 border-blue-500'
                    }`}>
                      <p className={`text-sm italic ${
                        isPremium && features.aiGeneratedQuotes
                          ? 'text-purple-800' 
                          : 'text-blue-800'
                      }`}>
                        "{selectedReminder.motivationalQuote}"
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleVoicePreview}
                  disabled={isPlayingVoice}
                  variant="outline"
                  className="w-full"
                >
                  {isPlayingVoice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Playing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Test Voice Preview
                    </>
                  )}
                </Button>

                
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a reminder from the list to preview it</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}