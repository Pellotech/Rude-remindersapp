import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Volume2, Clock, X, Play, CheckCircle, ImageIcon } from "lucide-react";
import { Reminder } from "@shared/schema";

const isImagePath = (path: string): boolean => {
  if (!path) return false;
  if (path.startsWith('blob:') || path.startsWith('data:image')) return true;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.svg', '.bmp'];
  const lowerPath = path.toLowerCase();
  const pathWithoutQuery = lowerPath.split('?')[0];
  return imageExtensions.some(ext => pathWithoutQuery.endsWith(ext));
};

const getImageSrc = (attachment: string): string => {
  if (attachment.startsWith('blob:') || 
      attachment.startsWith('data:') || 
      attachment.startsWith('http') ||
      attachment.startsWith('file://') ||
      attachment.startsWith('capacitor://')) {
    return attachment;
  }
  if (attachment.startsWith('/')) {
    return attachment;
  }
  return `/${attachment}`;
};

interface RichReminderNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder;
  isPremium?: boolean;
  features?: {
    aiGeneratedResponses?: boolean;
    aiGeneratedQuotes?: boolean;
  };
  onComplete?: () => void;
  onPlayVoice?: () => void;
  isPlayingVoice?: boolean;
}

export function RichReminderNotification({
  isOpen,
  onClose,
  reminder,
  isPremium = false,
  features = {},
  onComplete,
  onPlayVoice,
  isPlayingVoice = false
}: RichReminderNotificationProps) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">⏰ Reminder Alert</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{reminder.title}</h2>
            <Badge className={`mt-2 ${getRudenessColor(reminder.rudenessLevel)}`}>
              Rudeness Level {reminder.rudenessLevel}
            </Badge>
          </div>

          {/* Original Message */}
          <div>
            <Label className="text-sm font-medium">Original Message</Label>
            <p className="text-sm text-muted-foreground mt-1">{reminder.originalMessage}</p>
          </div>

          {/* Generated Response */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Generated Response</Label>
              {reminder.rudeMessage && (
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
            {reminder.rudeMessage && (
              <div className={`mt-2 p-4 rounded-lg border-l-4 ${
                isPremium && features.aiGeneratedResponses
                  ? 'bg-purple-50 border-purple-400'
                  : 'bg-gray-50 border-gray-400'
              }`}>
                <p className="text-base font-medium text-gray-800">
                  {reminder.rudeMessage}
                </p>
              </div>
            )}
          </div>

          {/* AI Response Variations */}
          {reminder.responses && reminder.responses.length > 1 && (
            <div>
              <Label className="text-sm font-medium">
                {isPremium && features.aiGeneratedResponses 
                  ? "AI Response Variations (Showing 2)" 
                  : "Template Response Variations (Showing 2)"}
              </Label>
              <div className="mt-2 space-y-3">
                {reminder.responses.slice(0, 2).map((response: string, index: number) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    isPremium && features.aiGeneratedResponses
                      ? 'bg-purple-50 border-purple-400'
                      : 'bg-gray-50 border-gray-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-800 flex-1">
                        {response}
                      </p>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Showing 2 of {reminder.responses.length} {isPremium && features.aiGeneratedResponses ? "AI-generated" : "template-based"} variations
              </p>
            </div>
          )}

          {/* Motivational Quote */}
          {reminder.motivationalQuote && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Motivational Quote</Label>
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
              <div className={`mt-2 p-3 rounded-lg border-l-4 ${
                isPremium && features.aiGeneratedQuotes
                  ? 'bg-purple-50 border-purple-500'
                  : 'bg-blue-50 border-blue-500'
              }`}>
                <p className={`text-sm italic ${
                  isPremium && features.aiGeneratedQuotes
                    ? 'text-purple-800'
                    : 'text-blue-800'
                }`}>
                  "{reminder.motivationalQuote}"
                </p>
              </div>
            </div>
          )}

          {/* Voice Character */}
          <div>
            <Label className="text-sm font-medium">Voice Character</Label>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-muted-foreground">
                {reminder.voiceCharacter?.replace('-', ' ') || "Default"}
              </p>
              {onPlayVoice && (
                <Button
                  onClick={onPlayVoice}
                  disabled={isPlayingVoice}
                  variant="outline"
                  size="sm"
                >
                  <Volume2 className="h-4 w-4 mr-1" />
                  {isPlayingVoice ? "Playing..." : "Play Voice"}
                </Button>
              )}
            </div>
          </div>

          {/* Scheduled Time */}
          <div>
            <Label className="text-sm font-medium">Scheduled Time</Label>
            <div className="flex items-center mt-1">
              <Clock className="h-4 w-4 mr-1 text-gray-500" />
              <p className="text-sm text-muted-foreground">
                {new Date(reminder.scheduledFor).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Attachments */}
          {reminder.attachments && reminder.attachments.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Attachments</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {reminder.attachments.map((attachment: string, index: number) => {
                  const isImage = isImagePath(attachment);
                  const imageSrc = getImageSrc(attachment);
                  
                  return (
                    <div 
                      key={index} 
                      className="relative group cursor-pointer"
                      onClick={() => isImage && setViewingImage(imageSrc)}
                      data-testid={`attachment-${index}`}
                    >
                      <div className="w-full h-20 rounded-md border overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                        {isImage ? (
                          <img
                            src={imageSrc}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const container = target.parentElement!;
                              container.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                                  <div class="text-center">
                                    <div class="text-lg">📷</div>
                                    <div class="text-xs">Image unavailable</div>
                                  </div>
                                </div>
                              `;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                            <div className="text-center">
                              <div className="text-lg">📁</div>
                              <div className="text-xs">File</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                        {index + 1}
                      </span>
                      {isImage && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {reminder.attachments.length} attachment(s) - tap to view
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {onComplete && (
              <Button onClick={onComplete} className="w-full" size="lg" data-testid="button-complete">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Complete
              </Button>
            )}
            <Button onClick={onClose} variant="outline" className="w-full" data-testid="button-dismiss">
              Dismiss for Now
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/95">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Viewer</DialogTitle>
          </DialogHeader>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewingImage(null)}
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
            data-testid="button-close-image"
          >
            <X className="h-6 w-6" />
          </Button>
          {viewingImage && (
            <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
              <img
                src={viewingImage}
                alt="Full size attachment"
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                data-testid="image-fullsize"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}