import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Loader2 } from 'lucide-react';

interface PreviewData {
  reminder: {
    rudeMessage: string;
    voiceCharacter: string;
  };
}

interface FormData {
  task: string;
  rudenessLevel: string;
  voiceCharacter: string;
  personalityTraits: string[];
}

export default function DevPreview() {
  const [formData, setFormData] = useState<FormData>({
    task: '',
    rudenessLevel: 'medium',
    voiceCharacter: 'gordon-ramsay',
    personalityTraits: []
  });
  
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dev/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      }).catch(err => {
        console.error('Network error:', err);
        throw new Error('Network error: Unable to reach server');
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to generate preview: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json().catch(err => {
        console.error('JSON parse error:', err);
        throw new Error('Invalid response format from server');
      });

      setPreviewData(data);
    } catch (err) {
      console.error('Preview generation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoicePreview = async () => {
    if (!previewData?.reminder) return;

    setIsPlayingVoice(true);

    try {
      const response = await fetch('/api/test-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: previewData.reminder.rudeMessage,
          voiceId: previewData.reminder.voiceCharacter,
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
          const utterance = new SpeechSynthesisUtterance(previewData.reminder.rudeMessage);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reminder Preview</h1>
        <p className="text-gray-600">Test how your rude reminders will sound and feel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Reminder Configuration</CardTitle>
            <CardDescription>Customize your reminder settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="task">Task Description</Label>
              <Input
                id="task"
                placeholder="e.g., Take out the trash"
                value={formData.task}
                onChange={(e) => setFormData({ ...formData, task: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="rudeness">Rudeness Level</Label>
              <Select
                value={formData.rudenessLevel}
                onValueChange={(value) => setFormData({ ...formData, rudenessLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rudeness level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="harsh">Harsh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="voice">Voice Character</Label>
              <Select
                value={formData.voiceCharacter}
                onValueChange={(value) => setFormData({ ...formData, voiceCharacter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice character" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gordon-ramsay">Gordon Ramsay</SelectItem>
                  <SelectItem value="drill-sergeant">Drill Sergeant</SelectItem>
                  <SelectItem value="disappointed-parent">Disappointed Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handlePreview} 
              disabled={isLoading || !formData.task}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Preview'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Results */}
        <Card>
          <CardHeader>
            <CardTitle>Preview Results</CardTitle>
            <CardDescription>See how your reminder will appear</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 text-red-600 bg-red-50 rounded-md mb-4">
                {error}
              </div>
            )}
            
            {previewData ? (
              <div className="space-y-4">
                <div>
                  <Label>Generated Message</Label>
                  <Textarea
                    value={previewData.reminder.rudeMessage}
                    readOnly
                    className="mt-1"
                    rows={4}
                  />
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
                      Play Voice Preview
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Generate a preview to see results here
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}