import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logoImage from "@assets/translusant_logo2_1767108484844.png";

interface ReminderData {
  id?: string | number;
  title?: string;
  originalMessage?: string;
  rudeMessage?: string;
  rudenessLevel?: number;
  scheduledFor?: string | Date;
}

interface ShareButtonProps {
  reminder?: ReminderData;
  title?: string;
  message?: string;
  className?: string;
  iconOnly?: boolean;
}

export function ShareButton({
  reminder,
  title,
  message,
  className = "",
  iconOnly = false
}: ShareButtonProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const reminderTitle = reminder?.title || reminder?.originalMessage?.slice(0, 50) || title || "My Reminder";
  const originalMessage = reminder?.originalMessage || message || "";
  const rudeMessage = reminder?.rudeMessage || "";
  const rudenessLevel = reminder?.rudenessLevel || 5;
  const scheduledTime = reminder?.scheduledFor 
    ? new Date(reminder.scheduledFor).toLocaleString() 
    : "";

  const getRudenessLabel = (level: number) => {
    if (level <= 3) return "Gentle";
    if (level <= 5) return "Sassy";
    if (level <= 7) return "Spicy";
    return "Brutal";
  };

  const getRudenessColor = (level: number) => {
    if (level <= 3) return "#22C55E";
    if (level <= 5) return "#F59E0B";
    if (level <= 7) return "#EF4444";
    return "#991B1B";
  };

  const generateShareText = () => {
    let text = `Reminder: ${reminderTitle}\n\n`;
    if (originalMessage) {
      text += `Original: ${originalMessage}\n\n`;
    }
    if (rudeMessage) {
      text += `Response: ${rudeMessage}\n\n`;
    }
    if (scheduledTime) {
      text += `Scheduled: ${scheduledTime}\n\n`;
    }
    text += `Sent from Rude Reminders - The app that talks back!`;
    return text;
  };

  const generateShareImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Failed to generate share image:", error);
      return null;
    }
  };

  const saveImageToDevice = async (base64Data: string): Promise<string | null> => {
    try {
      const fileName = `rude-reminder-${Date.now()}.png`;
      const base64Only = base64Data.replace(/^data:image\/png;base64,/, "");
      
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Only,
        directory: Directory.Cache,
      });
      
      return result.uri;
    } catch (error) {
      console.error("Failed to save image:", error);
      return null;
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const shareText = generateShareText();
      
      if (Capacitor.isNativePlatform()) {
        const base64Image = await generateShareImage();
        let files: string[] = [];
        
        if (base64Image) {
          const savedUri = await saveImageToDevice(base64Image);
          if (savedUri) {
            files = [savedUri];
          }
        }
        
        const shareOptions: any = {
          title: `Rude Reminders: ${reminderTitle}`,
          text: shareText,
          dialogTitle: "Share your reminder",
        };
        
        if (files.length > 0) {
          shareOptions.files = files;
        }
        
        await Share.share(shareOptions);
        
        toast({
          title: "Shared!",
          description: "Your reminder has been shared.",
        });
      } else if (navigator.share) {
        const base64Image = await generateShareImage();
        let files: File[] = [];
        
        if (base64Image) {
          const response = await fetch(base64Image);
          const blob = await response.blob();
          const file = new File([blob], "rude-reminder.png", { type: "image/png" });
          files = [file];
        }
        
        const shareData: ShareData = {
          title: `Rude Reminders: ${reminderTitle}`,
          text: shareText,
        };
        
        if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
          shareData.files = files;
        }
        
        await navigator.share(shareData);
        
        toast({
          title: "Shared!",
          description: "Your reminder has been shared.",
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard!",
          description: "Share text copied. Paste it anywhere to share.",
        });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
        try {
          await navigator.clipboard.writeText(generateShareText());
          toast({
            title: "Copied to clipboard",
            description: "Share text copied instead.",
          });
        } catch {
          toast({
            title: "Share failed",
            description: "Unable to share at this time.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsSharing(false);
      setShowPreview(false);
    }
  };

  const handleButtonClick = () => {
    if (reminder?.rudeMessage) {
      setShowPreview(true);
    } else {
      handleShare();
    }
  };

  return (
    <>
      <Button 
        variant={iconOnly ? "ghost" : "outline"} 
        size="sm" 
        className={`${className} ${iconOnly ? 'text-gray-400 hover:text-blue-600' : ''}`}
        onClick={handleButtonClick}
        disabled={isSharing}
        data-testid="button-share"
      >
        <Share2 className={`h-4 w-4 ${iconOnly ? '' : 'mr-2'}`} />
        {!iconOnly && (isSharing ? "Sharing..." : "Share")}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Share Preview</DialogTitle>
          </DialogHeader>
          
          <div 
            ref={cardRef}
            className="bg-white rounded-2xl p-5 shadow-lg border border-gray-200"
            style={{ minHeight: "200px" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={logoImage} 
                alt="Rude Reminders" 
                className="h-10 w-auto"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-900 flex-1">
                  {reminderTitle}
                </h3>
                <span 
                  className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: getRudenessColor(rudenessLevel) }}
                >
                  {getRudenessLabel(rudenessLevel)}
                </span>
              </div>
              
              {originalMessage && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Original Message</p>
                  <p className="text-sm text-gray-700">{originalMessage}</p>
                </div>
              )}
              
              {rudeMessage && (
                <div className="bg-[#FEF3C7] rounded-lg p-3 border border-[#F59E0B]/30">
                  <p className="text-xs text-[#92400E] mb-1">Response</p>
                  <p className="text-sm text-gray-800 font-medium">{rudeMessage}</p>
                </div>
              )}
              
              {scheduledTime && (
                <p className="text-xs text-gray-400">
                  Scheduled: {scheduledTime}
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Get the app at rudereminders.app
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleShare} 
            disabled={isSharing}
            className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white mt-2"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? "Sharing..." : "Share Now"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
