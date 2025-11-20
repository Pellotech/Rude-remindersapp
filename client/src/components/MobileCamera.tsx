import { useState, useEffect } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera as CameraIcon, Image, Video, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MobileCameraProps {
  onPhotoCaptured: (photoUrl: string) => void;
  maxFiles?: number;
  currentCount?: number;
}

export function MobileCamera({ onPhotoCaptured, maxFiles = 5, currentCount = 0 }: MobileCameraProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  // Default to true (conservative/safe) - only disable editing after confirming NOT an iPad
  const [disableEditing, setDisableEditing] = useState(true);

  useEffect(() => {
    // Detect device and enable editing only if NOT iPad
    const detectDevice = async () => {
      const platform = Capacitor.getPlatform();
      
      // Only enable editing for non-iOS platforms
      if (platform !== 'ios') {
        setDisableEditing(false);
        return;
      }
      
      // For iOS, check if it's an iPad
      try {
        const info = await Device.getInfo();
        const isIPad = info.model?.toLowerCase().includes('ipad') || false;
        // Enable editing only on iPhone (not iPad)
        setDisableEditing(isIPad);
      } catch (error) {
        console.error('Error detecting device:', error);
        // If detection fails, stay conservative (keep editing disabled)
      }
    };
    
    detectDevice();
  }, []);

  const takePhoto = async () => {
    if (currentCount >= maxFiles) {
      toast({
        title: "Limit reached",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCapturing(true);
      setPermissionError(null);
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: !disableEditing, // Disabled on iPad to prevent crashes
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 1920,
        height: 1920
      });

      if (image.webPath) {
        console.log('Camera captured image with webPath:', image.webPath);
        onPhotoCaptured(image.webPath);
        toast({
          title: "Photo captured",
          description: "Photo added to your reminder",
        });
      } else {
        console.error('Camera image captured but no webPath available:', image);
        throw new Error('No image path returned from camera');
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      
      // Handle specific permission errors
      if (error?.message?.includes('permission') || error?.message?.includes('denied')) {
        setPermissionError('Camera permission is required. Please enable camera access in your device Settings → Rude Reminders → Camera');
        toast({
          title: "Permission Required",
          description: "Please enable camera access in Settings",
          variant: "destructive",
        });
      } else if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
        // User cancelled - no error needed
        console.log('User cancelled camera');
      } else {
        toast({
          title: "Camera error",
          description: "Failed to take photo. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    if (currentCount >= maxFiles) {
      toast({
        title: "Limit reached",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCapturing(true);
      setPermissionError(null);
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: !disableEditing, // Disabled on iPad to prevent crashes
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        correctOrientation: true,
        width: 1920,
        height: 1920
      });

      if (image.webPath) {
        console.log('Gallery selected image with webPath:', image.webPath);
        onPhotoCaptured(image.webPath);
        toast({
          title: "Photo selected",
          description: "Photo added to your reminder",
        });
      } else {
        console.error('Gallery image selected but no webPath available:', image);
        throw new Error('No image path returned from gallery');
      }
    } catch (error: any) {
      console.error('Error picking photo:', error);
      
      // Handle specific permission errors
      if (error?.message?.includes('permission') || error?.message?.includes('denied')) {
        setPermissionError('Photo library permission is required. Please enable photo access in your device Settings → Rude Reminders → Photos');
        toast({
          title: "Permission Required",
          description: "Please enable photo access in Settings",
          variant: "destructive",
        });
      } else if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
        // User cancelled - no error needed
        console.log('User cancelled photo selection');
      } else {
        toast({
          title: "Gallery error",
          description: "Failed to select photo. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-3">
      {permissionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {permissionError}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={takePhoto}
          disabled={isCapturing || currentCount >= maxFiles}
          className="flex-1"
          data-testid="button-camera"
        >
          <CameraIcon className="mr-2 h-4 w-4" />
          {isCapturing ? "Taking..." : "Camera"}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={pickFromGallery}
          disabled={isCapturing || currentCount >= maxFiles}
          className="flex-1"
          data-testid="button-gallery"
        >
          <Image className="mr-2 h-4 w-4" />
          Gallery
        </Button>
      </div>
    </div>
  );
}