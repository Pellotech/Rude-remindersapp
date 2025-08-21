import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PlayCircle, Loader2, Clock, User, Volume2, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Reminder } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function DevPreview() {
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [moreResponses, setMoreResponses] = useState<any>(null); // State to store more responses
  const [loadingMore, setLoadingMore] = useState(false); // State for loading more responses
  const { toast } = useToast();

  // Fetch all reminders
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['/api/reminders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/reminders');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
  });

  const fetchMoreResponses = async (reminderId: string, forceRefresh = false) => {
    setLoadingMore(true);
    try {
      const url = forceRefresh
        ? `/api/reminders/${reminderId}/more-responses?refresh=true&t=${Date.now()}`
        : `/api/reminders/${reminderId}/more-responses?t=${Date.now()}`;

      const response = await apiRequest("GET", url);
      const data = await response.json();
      setMoreResponses(data);

      if (forceRefresh) {
        toast({
          title: "Fresh Responses Generated!",
          description: `Generated ${data.totalCount} new AI responses at ${new Date().toLocaleTimeString()}`,
        });
      }
    } catch (error) {
      console.error('Failed to fetch more responses:', error);
      toast({
        title: "Error",
        description: "Failed to generate new responses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  };

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
      }).catch(err => {
        console.error('Voice API network error:', err);
        throw new Error('Network error');
      });

      if (response.ok) {
        const audioBlob = await response.blob().catch(err => {
          console.error('Audio blob error:', err);
          throw new Error('Audio processing error');
        });

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsPlayingVoice(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = (err) => {
          console.error('Audio playback error:', err);
          setIsPlayingVoice(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play().catch(err => {
          console.error('Audio play error:', err);
          throw new Error('Audio playback failed');
        });
      } else {
        console.warn('Voice API failed, using fallback');
        throw new Error('Voice API failed');
      }
    } catch (error) {
      console.error('Voice preview error:', error);
      setIsPlayingVoice(false);

      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(selectedReminder.rudeMessage);
          utterance.onend = () => setIsPlayingVoice(false);
          utterance.onerror = (err) => {
            console.error('Speech synthesis error:', err);
            setIsPlayingVoice(false);
          };
          speechSynthesis.speak(utterance);
        } catch (fallbackError) {
          console.error('Fallback speech error:', fallbackError);
          setIsPlayingVoice(false);
        }
      } else {
        console.error('No speech synthesis available');
        setIsPlayingVoice(false);
      }
    }
  };

  const formatDateTime = (dateInput: string | Date, reminder?: Reminder) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const formatted = date.toLocaleString();

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
            <CardTitle>Your Reminders</CardTitle>
            <CardDescription>Click a reminder to preview it</CardDescription>
          </CardHeader>
          <CardContent>
            {!reminders || reminders.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No reminders found.</p>
                <p className="text-sm mt-2">Create a reminder from the main page first!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reminders.map((reminder: Reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedReminder?.id === reminder.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedReminder(reminder);
                      setMoreResponses(null); // Clear previous more responses when selecting a new reminder
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{reminder.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatDateTime(reminder.scheduledFor, reminder)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-xs ${getRudenessColor(reminder.rudenessLevel)}`}>
                          Level {reminder.rudenessLevel}
                        </Badge>
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
                ))}
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
                  <h4 className="font-medium mb-2">Title</h4>
                  <p className="text-sm text-gray-700">{selectedReminder.title}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Original Message</h4>
                  <p className="text-sm text-gray-600 italic">{selectedReminder.originalMessage}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Rude Message</h4>
                  <Textarea
                    value={selectedReminder.rudeMessage}
                    readOnly
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Rudeness Level</h4>
                    <Badge className={getRudenessColor(selectedReminder.rudenessLevel)}>
                      Level {selectedReminder.rudenessLevel}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Voice Character</h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {selectedReminder.voiceCharacter?.replace('-', ' ') || 'Default'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Scheduled For</h4>
                  <p className="text-sm text-gray-600">{formatDateTime(selectedReminder.scheduledFor, selectedReminder)}</p>
                  {selectedReminder.isMultiDay && selectedReminder.selectedDays && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium text-gray-700">Repeating Days:</h5>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedReminder.selectedDays.map((day) => (
                          <Badge key={day} variant="outline" className="text-xs capitalize">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedReminder.motivationalQuote && (
                  <div>
                    <h4 className="font-medium mb-2">Motivational Quote</h4>
                    <p className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded">
                      "{selectedReminder.motivationalQuote}"
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Notification Settings</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReminder.browserNotification && (
                      <Badge variant="outline">Browser</Badge>
                    )}
                    {selectedReminder.voiceNotification && (
                      <Badge variant="outline">Voice</Badge>
                    )}
                    {selectedReminder.emailNotification && (
                      <Badge variant="outline">Email</Badge>
                    )}
                  </div>
                </div>

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

                {/* New section for more responses and refresh button */}
                {selectedReminder && (
                  <div className="mt-4">
                    {moreResponses && (
                      <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                        <h5 className="font-medium mb-2">More AI Responses:</h5>
                        <p className="text-sm text-gray-700">{moreResponses.rudeMessage}</p>
                        <p className="text-xs text-gray-500 mt-1">Generated at: {new Date(moreResponses.timestamp).toLocaleString()}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => fetchMoreResponses(selectedReminder.id)}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2" />
                            Loading...
                          </div>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Get More Responses
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => fetchMoreResponses(selectedReminder.id, true)}
                        disabled={loadingMore}
                        title="Force fresh AI responses"
                      >
                        🔄 Fresh AI
                      </Button>
                    </div>
                  </div>
                )}
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