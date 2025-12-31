import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Share2, Clock } from "lucide-react";
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
import type { Reminder } from "@shared/schema";

interface ShareButtonProps {
  reminder?: Partial<Reminder>;
  title?: string;
  message?: string;
  className?: string;
  iconOnly?: boolean;
}

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
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const reminderTitle = reminder?.title || reminder?.originalMessage?.slice(0, 50) || title || "My Reminder";
  const originalMessage = reminder?.originalMessage || message || "";
  const rudeMessage = reminder?.rudeMessage || "";
  const rudenessLevel = reminder?.rudenessLevel || 3;
  const scheduledTime = reminder?.scheduledFor 
    ? new Date(reminder.scheduledFor).toLocaleString() 
    : "";
  const responses = reminder?.responses || [];
  const motivationalQuote = reminder?.motivationalQuote || "";
  const voiceCharacter = reminder?.voiceCharacter || "default";
  const attachments = reminder?.attachments || [];

  const getRudenessColor = (level: number) => {
    const colors: Record<number, string> = {
      1: "bg-green-100 text-green-800",
      2: "bg-blue-100 text-blue-800", 
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-orange-100 text-orange-800",
      5: "bg-red-100 text-red-800",
    };
    return colors[level] || "bg-gray-100 text-gray-800";
  };

  const preloadImages = async (): Promise<void> => {
    const imageUrls: string[] = [logoImage];
    
    if (attachments && attachments.length > 0) {
      attachments.forEach((att: string) => {
        if (isImagePath(att)) {
          imageUrls.push(getImageSrc(att));
        }
      });
    }

    const promises = imageUrls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });
    });

    await Promise.all(promises);
    setImagesLoaded(true);
  };

  useEffect(() => {
    if (showPreview) {
      setImagesLoaded(false);
      preloadImages();
    }
  }, [showPreview]);

  const generateShareText = () => {
    let text = `${reminderTitle}\n\n`;
    if (originalMessage) {
      text += `Original: ${originalMessage}\n\n`;
    }
    if (rudeMessage) {
      text += `Response: ${rudeMessage}\n\n`;
    }
    if (scheduledTime) {
      text += `Scheduled: ${scheduledTime}\n\n`;
    }
    text += `Get the app at rudereminders.app`;
    return text;
  };

  const generateShareImage = async (): Promise<string | null> => {
    if (!cardRef.current || !imagesLoaded) return null;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#C9A063",
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
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
          text: files.length > 0 ? "Get the app at rudereminders.app" : shareText,
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
          text: files.length > 0 ? "Get the app at rudereminders.app" : shareText,
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

  const imageAttachments = attachments.filter((att: string) => isImagePath(att));
  const displayResponses = responses.slice(0, 2);

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
        <DialogContent className="max-w-md mx-auto p-0 overflow-hidden bg-transparent border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Share Preview</DialogTitle>
          </DialogHeader>
          
          <div 
            ref={cardRef}
            className="rounded-2xl overflow-hidden"
            style={{ 
              backgroundColor: "#C9A063",
              padding: "24px",
              minHeight: "400px"
            }}
          >
            <div className="bg-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">⏰</span>
                <span className="font-bold text-xl text-gray-900">Reminder Alert</span>
              </div>

              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{reminderTitle}</h2>
                <Badge className={`mt-2 ${getRudenessColor(rudenessLevel)}`}>
                  Rudeness Level {rudenessLevel}
                </Badge>
              </div>

              <div className="space-y-6 pt-4">
                <div>
                  <Label className="text-sm font-medium">Original Message</Label>
                  <p className="text-sm text-muted-foreground mt-1">{originalMessage}</p>
                </div>

                {rudeMessage && (
                  <div>
                    <Label className="text-sm font-medium">Generated Response</Label>
                    <div className="mt-2 p-4 rounded-lg bg-gray-50 border-l-4 border-gray-400">
                      <p className="text-base font-medium text-gray-800">{rudeMessage}</p>
                    </div>
                  </div>
                )}

                {responses.length > 1 && (
                  <div>
                    <Label className="text-sm font-medium">
                      Response Variations (Showing 2)
                    </Label>
                    <div className="mt-2 space-y-3">
                      {displayResponses.map((response: string, index: number) => (
                        <div 
                          key={index}
                          className="p-3 rounded-lg flex items-start justify-between bg-gray-50 border-l-4 border-gray-400"
                        >
                          <p className="text-sm font-medium text-gray-800 flex-1">{response}</p>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {index + 1}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing 2 of {responses.length} variations
                    </p>
                  </div>
                )}

                {motivationalQuote && (
                  <div>
                    <Label className="text-sm font-medium">Motivational Quote</Label>
                    <div className="mt-2 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                      <p className="text-sm italic text-blue-800">"{motivationalQuote}"</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Voice Character</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {voiceCharacter?.replace('-', ' ') || "Default"}
                  </p>
                </div>

                {scheduledTime && (
                  <div>
                    <Label className="text-sm font-medium">Scheduled Time</Label>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4 mr-1" />
                      {scheduledTime}
                    </div>
                  </div>
                )}

                {attachments && attachments.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Attachments</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {attachments.map((attachment: string, index: number) => {
                        const isImage = isImagePath(attachment);
                        const imageSrc = getImageSrc(attachment);
                        
                        return (
                          <div 
                            key={index}
                            className="relative w-full h-20 rounded-md border overflow-hidden"
                          >
                            {isImage ? (
                              <img
                                src={imageSrc}
                                alt={`Attachment ${index + 1}`}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                                <div className="text-center">
                                  <div className="text-lg">📁</div>
                                  <div className="text-xs">File</div>
                                </div>
                              </div>
                            )}
                            <span className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {index + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {attachments.length} attachment(s) - tap to view
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-2">
                <img 
                  src={logoImage} 
                  alt="Rude Reminders" 
                  className="h-6 w-auto"
                  crossOrigin="anonymous"
                />
              </div>
              
              <p className="text-xs text-gray-400 text-center mt-2">
                Get the app at rudereminders.app
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-[#C9A063]">
            <Button 
              onClick={handleShare} 
              disabled={isSharing || !imagesLoaded}
              className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isSharing ? "Sharing..." : !imagesLoaded ? "Loading..." : "Share Now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
