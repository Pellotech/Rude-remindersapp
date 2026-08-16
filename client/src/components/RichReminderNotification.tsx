import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Volume2, Clock, X, ChevronDown } from "lucide-react";
import { Reminder } from "@shared/schema";
import { ShareButton } from "./ShareButton";
import { ItHitToggle } from "./ItHitToggle";
import logoImage from "@assets/translusant_logo2_1767108484844.png";
import { getFullApiUrl } from "@/lib/queryClient";
import { getPlatformInfo } from "@/utils/platformDetection";
import { getRudyAvatarSrc } from "@/lib/rudyAvatar";

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

const getRudenessStyle = (level: number): { bg: string; color: string } => {
  const map: Record<number, { bg: string; color: string }> = {
    1: { bg: '#38BDF8', color: '#ffffff' },
    2: { bg: '#22C55E', color: '#ffffff' },
    3: { bg: '#FDE047', color: '#1a1a1a' },
    4: { bg: '#F97316', color: '#ffffff' },
    5: { bg: '#b70d0d', color: '#ffffff' },
  };
  return map[level] ?? { bg: '#C9A063', color: '#ffffff' };
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
  /** Hide the Got it done / Let you know later / Didn't do it row — used for
   * the admin review view, where those actions don't apply to someone else's
   * reminder. Defaults to true (shown) for the normal user-facing dialog. */
  showActionButtons?: boolean;
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
  isPlayingVoice = false,
  showActionButtons = true
}: RichReminderNotificationProps) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { isAndroid, isIOS } = getPlatformInfo();

  const [textSize, setTextSize] = useState<'default' | 'larger' | 'blind'>(
    () => (localStorage.getItem('text_size_preference') as 'default' | 'larger' | 'blind') || 'default'
  );

  useEffect(() => {
    const handler = (e: Event) => setTextSize((e as CustomEvent).detail);
    window.addEventListener('text_size_changed', handler);
    return () => window.removeEventListener('text_size_changed', handler);
  }, []);

  const textSizeMap = { default: 14, larger: 18, blind: 21 };
  const notifFontSize = textSizeMap[textSize];

  const rudenessStyle = getRudenessStyle(reminder.rudenessLevel);

  // Keep dialog clear of the ad banner + nav bar at the bottom
  // Android: ad banner ~50px + nav bar ~56px + buffer = 220px total
  // iOS: ad banner ~50px + home indicator ~34px + buffer = 140px total
  const dialogMaxHeight = isAndroid
    ? 'calc(100vh - 220px)'
    : isIOS
    ? 'calc(100vh - 140px)'
    : '85vh';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden flex flex-col bg-white border-[6px] border-[#C9A063] rounded-[16px]"
        style={{ maxHeight: dialogMaxHeight }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Reminder</DialogTitle>
        </DialogHeader>

        {/* Header bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#C9A063]/30 px-3 py-2 flex items-center justify-between">
          <img src={logoImage} alt="Rude Reminders" className="h-8 w-auto" />
          <ShareButton
            reminder={reminder}
            className="h-8 px-3 text-xs font-bold text-[#C9A063] bg-white border-2 border-[#C9A063] rounded-full hover:bg-[#FDF3E3]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {/* Rudy avatar */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#C9A063] bg-[#FDF3E3] p-1">
              <img
                src={getRudyAvatarSrc(reminder.rudenessLevel)}
                alt="Rudy"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Title + badge */}
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{reminder.title}</h2>
            <span
              className="inline-block mt-1 px-3.5 py-1 rounded-full text-[13px] font-bold"
              style={{ background: rudenessStyle.bg, color: rudenessStyle.color }}
            >
              Rudeness Level {reminder.rudenessLevel}
            </span>
          </div>

          {/* Main rude message bubble */}
          {reminder.rudeMessage && (
            <div className="p-3 rounded-xl bg-[#FDF3E3]">
              <p className="text-sm font-medium text-[#1a1a1a]" style={{ fontSize: notifFontSize }}>
                {reminder.rudeMessage}
              </p>
            </div>
          )}

          {/* Response variations */}
          {reminder.responses && reminder.responses.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">Response Variations</Label>
              {reminder.responses.slice(0, 2).map((response: string, index: number) => (
                <div key={index} className="p-2 rounded-xl bg-[#FDF3E3]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-[#1a1a1a] flex-1">{response}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{index + 1}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Motivational quote */}
          {reminder.motivationalQuote && (
            <div className="p-2 rounded-xl bg-[#FDF3E3]">
              <p className="text-xs italic text-[#1a1a1a]">
                "{reminder.motivationalQuote}"
              </p>
            </div>
          )}

          {/* It Hit feedback */}
          <ItHitToggle
            reminderId={reminder.id}
            hitConfirmed={reminder.hitConfirmed}
            hitAt={reminder.hitAt}
          />

          {/* Attachments */}
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

          {/* Details collapsible */}
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

          {/* Action buttons */}
          {showActionButtons && (
            <div className="pt-2 border-t">
              <div className="flex flex-col gap-2 w-1/2 mx-auto">
                <Button
                  onClick={onComplete}
                  className="w-full h-10 text-sm font-semibold bg-[#22C55E] hover:bg-[#16a34a] text-white"
                  data-testid="button-complete"
                >
                  Got it done 👊
                </Button>
                <Button
                  onClick={onClose}
                  className="w-full h-10 text-sm font-semibold bg-[#FDF3E3] hover:bg-[#F5EDE0] text-[#1B2A5E] border border-[#C9A063]"
                  data-testid="button-dismiss"
                >
                  Let you know later
                </Button>
                <Button
                  onClick={onMissed}
                  className="w-full h-9 text-sm font-semibold bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                  data-testid="button-missed"
                >
                  Didn't do it.
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Full-size image viewer */}
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
