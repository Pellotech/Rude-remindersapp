import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Share2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { getFullApiUrl } from "@/lib/queryClient";
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
    return getFullApiUrl(attachment);
  }
  return getFullApiUrl(`/${attachment}`);
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

  const rudenessColors: Record<number, string> = {
    1: '#38BDF8',
    2: '#22C55E',
    3: '#FDE047',
    4: '#F97316',
    5: '#b70d0d',
  };
  const rudenessTextColors: Record<number, string> = {
    1: 'white',
    2: 'white',
    3: '#1a1a1a',
    4: 'white',
    5: 'white',
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
    
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    console.log(`📤 Share initiated - isNative: ${isNative}, platform: ${platform}`);
    
    try {
      const shareText = generateShareText();
      
      if (isNative) {
        // Try to share with image first
        try {
          console.log("📷 Generating share image...");
          const base64Image = await generateShareImage();
          if (base64Image) {
            console.log("💾 Saving image to device...");
            const savedUri = await saveImageToDevice(base64Image);
            if (savedUri) {
              console.log(`📁 Image saved at: ${savedUri}`);
              const sharePayload = {
                title: `Rude Reminders: ${reminderTitle}`,
                text: "Get the app at rudereminders.app",
                files: [savedUri],
                dialogTitle: "Share your reminder",
              };
              console.log("📤 Calling Share.share with files:", JSON.stringify(sharePayload));
              await Share.share(sharePayload);
              console.log("✅ Share completed successfully");
              toast({
                title: "Shared!",
                description: "Your reminder has been shared.",
              });
              return;
            }
          }
        } catch (imgError: any) {
          console.log("⚠️ Image share failed:", imgError?.message || imgError);
        }
        
        // Fallback to text-only share on native
        console.log("📝 Falling back to text-only share");
        const textPayload = {
          title: `Rude Reminders: ${reminderTitle}`,
          text: shareText,
          dialogTitle: "Share your reminder",
        };
        console.log("📤 Calling Share.share with text:", JSON.stringify(textPayload));
        await Share.share(textPayload);
        console.log("✅ Text share completed successfully");
        
        toast({
          title: "Shared!",
          description: "Your reminder has been shared.",
        });
      } else if (navigator.share) {
        // Web Share API
        try {
          const base64Image = await generateShareImage();
          if (base64Image) {
            const response = await fetch(base64Image);
            const blob = await response.blob();
            const file = new File([blob], "rude-reminder.png", { type: "image/png" });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `Rude Reminders: ${reminderTitle}`,
                text: "Get the app at rudereminders.app",
                files: [file],
              });
              toast({
                title: "Shared!",
                description: "Your reminder has been shared.",
              });
              return;
            }
          }
        } catch (imgError) {
          console.log("Image share failed, trying text-only share");
        }
        
        // Fallback to text-only share on web
        await navigator.share({
          title: `Rude Reminders: ${reminderTitle}`,
          text: shareText,
        });
        
        toast({
          title: "Shared!",
          description: "Your reminder has been shared.",
        });
      } else {
        // No share API available - clipboard fallback
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard!",
          description: "Share text copied. Paste it anywhere to share.",
        });
      }
    } catch (error: any) {
      // User cancelled share - don't show error
      if (error.name === "AbortError" || error.message?.includes("cancel")) {
        console.log("📤 Share cancelled by user");
        return;
      }
      
      const errorCode = error?.code || "";
      const errorMessage = error?.message || JSON.stringify(error);
      console.error(`❌ Share failed - code: ${errorCode}, message: ${errorMessage}`, error);
      
      // Check if it's an UNIMPLEMENTED error (plugin not synced)
      if (errorCode === "UNIMPLEMENTED" || errorMessage.includes("UNIMPLEMENTED")) {
        console.error("⚠️ Share plugin not available. Run 'npx cap sync' and rebuild the app.");
      }
      
      // Final fallback to clipboard
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
        variant="ghost"
        size="sm" 
        className={`${className} ${iconOnly ? 'text-gray-400 hover:text-blue-600 h-7 w-7 p-0' : ''}`}
        style={!iconOnly ? {
          backgroundColor: '#1a3a5c',
          color: 'white',
          border: '1.5px solid #1a3a5c',
          borderRadius: '12px',
          padding: '3px 10px',
          height: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
        } : undefined}
        onClick={handleButtonClick}
        disabled={isSharing}
        data-testid="button-share"
      >
        <Share2 className={iconOnly ? 'h-4 w-4' : 'h-3 w-3'} />
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
              padding: "16px"
            }}
          >
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-center mb-3">
                <img 
                  src={logoImage} 
                  alt="Rude Reminders" 
                  className="h-8 w-auto"
                  crossOrigin="anonymous"
                />
              </div>

              <div className="text-center mb-3">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{reminderTitle}</h2>
                <Badge
                  className="mt-1 text-xs"
                  style={{
                    backgroundColor: rudenessColors[rudenessLevel] ?? '#C9A063',
                    color: rudenessTextColors[rudenessLevel] ?? 'white',
                  }}
                >
                  Rudeness Level {rudenessLevel}
                </Badge>
              </div>

              <div className="space-y-3">
                {rudeMessage && (
                  <div className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-400">
                    <p className="text-sm font-medium text-gray-800">{rudeMessage}</p>
                  </div>
                )}

                {responses.length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Response Variations</Label>
                    {displayResponses.map((response: string, index: number) => (
                      <div 
                        key={index}
                        className="p-2 rounded-lg flex items-start justify-between bg-gray-50 border-l-4 border-gray-400"
                      >
                        <p className="text-xs text-gray-700 flex-1">{response}</p>
                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                          {index + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {motivationalQuote && (
                  <div className="p-2 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-xs italic text-blue-800">"{motivationalQuote}"</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-medium text-gray-500">Original Message</Label>
                  <p className="text-xs text-gray-600 mt-0.5">{originalMessage}</p>
                </div>

                {attachments && attachments.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto">
                    {attachments.slice(0, 4).map((attachment: string, index: number) => {
                      const isImage = isImagePath(attachment);
                      const imageSrc = getImageSrc(attachment);
                      return (
                        <div key={index} className="flex-shrink-0 w-14 h-14 rounded border overflow-hidden">
                          {isImage ? (
                            <img src={imageSrc} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover" crossOrigin="anonymous" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                              <span className="text-sm">📁</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {scheduledTime && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{scheduledTime}</span>
                  </div>
                )}
              </div>
              
              <p className="text-[10px] text-gray-400 text-center mt-3 pt-2 border-t border-gray-100">
                rudereminders.app
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
