import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Volume2, Clock, X, ImageIcon, ChevronDown } from "lucide-react";
import { Reminder } from "@shared/schema";
import { ShareButton } from "./ShareButton";
import logoImage from "@assets/translusant_logo2_1767108484844.png";
import { getFullApiUrl } from "@/lib/queryClient";

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
    return getFullApiUrl(attachment);
  }
  return getFullApiUrl(`/${attachment}`);
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
  onMissed?: () => void;
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
  onMissed,
  onPlayVoice,
  isPlayingVoice = false
}: RichReminderNotificationProps) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Reminder</DialogTitle>
        </DialogHeader>
        
        <div className="sticky top-0 z-10 bg-white border-b px-3 py-2 flex items-center justify-between">
          <img src={logoImage} alt="Rude Reminders" className="h-8 w-auto" />
          <div className="flex items-center gap-1">
            <ShareButton reminder={reminder} iconOnly className="h-8 w-8 p-0" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{reminder.title}</h2>
            <Badge className={`mt-1 text-xs ${getRudenessColor(reminder.rudenessLevel)}`}>
              Rudeness Level {reminder.rudenessLevel}
            </Badge>
          </div>

          {reminder.rudeMessage && (
            <div className={`p-3 rounded-lg border-l-4 ${
              isPremium && features.aiGeneratedResponses
                ? 'bg-purple-50 border-purple-400'
                : 'bg-gray-50 border-gray-400'
            }`}>
              <p className="text-sm font-medium text-gray-800">
                {reminder.rudeMessage}
              </p>
            </div>
          )}

          {reminder.responses && reminder.responses.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">Response Variations</Label>
              {reminder.responses.slice(0, 2).map((response: string, index: number) => (
                <div key={index} className={`p-2 rounded-lg border-l-4 ${
                  isPremium && features.aiGeneratedResponses
                    ? 'bg-purple-50 border-purple-400'
                    : 'bg-gray-50 border-gray-400'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-700 flex-1">{response}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{index + 1}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reminder.motivationalQuote && (
            <div className={`p-2 rounded-lg border-l-4 ${
              isPremium && features.aiGeneratedQuotes
                ? 'bg-purple-50 border-purple-500'
                : 'bg-blue-50 border-blue-500'
            }`}>
              <p className={`text-xs italic ${
                isPremium && features.aiGeneratedQuotes ? 'text-purple-800' : 'text-blue-800'
              }`}>
                "{reminder.motivationalQuote}"
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-gray-500">Original Message</Label>
            <p className="text-xs text-gray-600 mt-0.5">{reminder.originalMessage}</p>
          </div>

          {reminder.attachments && reminder.attachments.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-gray-500">Attachments</Label>
              <div className="mt-1 flex gap-1.5 overflow-x-auto">
                {reminder.attachments.slice(0, 4).map((attachment: string, index: number) => {
                  const isImage = isImagePath(attachment);
                  const imageSrc = getImageSrc(attachment);
                  return (
                    <div 
                      key={index} 
                      className="relative flex-shrink-0 cursor-pointer"
                      onClick={() => isImage && setViewingImage(imageSrc)}
                      data-testid={`attachment-${index}`}
                    >
                      <div className="w-16 h-16 rounded border overflow-hidden">
                        {isImage ? (
                          <img src={imageSrc} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                            <span className="text-lg">📁</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-gray-500 h-7 px-2">
                Details
                <ChevronDown className={`h-3 w-3 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {({
                      'default': 'Scarlett',
                      'confident-leader': 'Will',
                      'british-butler': 'Gerald',
                      'karen-nag': 'Karen'
                    } as Record<string, string>)[reminder.voiceCharacter || 'default'] || reminder.voiceCharacter?.replace('-', ' ') || 'Scarlett'}
                  </span>
                </div>
                {onPlayVoice && (
                  <Button onClick={onPlayVoice} disabled={isPlayingVoice} variant="outline" size="sm" className="h-6 text-xs px-2">
                    {isPlayingVoice ? "Playing..." : "Play"}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-600">
                  {new Date(reminder.scheduledFor).toLocaleString()}
                </span>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <p className="text-[11px] text-gray-400 text-right">
            {new Date(reminder.scheduledFor).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} {' • '} {new Date(reminder.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>

          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button
              onClick={onComplete}
              className="w-full h-10 text-sm font-semibold bg-[#22C55E] hover:bg-[#16a34a] text-white"
              data-testid="button-complete"
            >
              I'm doing it / It's done 👊
            </Button>
            <Button
              onClick={onMissed}
              className="w-full h-10 text-sm font-semibold bg-[#C53B3B] hover:bg-[#a83030] text-white"
              data-testid="button-missed"
            >
              Button doesn't work, reminds me of someone 🙄
            </Button>
            <Button
              onClick={onClose}
              className="w-full h-9 text-sm font-semibold bg-yellow-400 hover:bg-yellow-500 text-gray-900"
              data-testid="button-dismiss"
            >
              Let me know later 🔔
            </Button>
          </div>
        </div>
      </DialogContent>

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
