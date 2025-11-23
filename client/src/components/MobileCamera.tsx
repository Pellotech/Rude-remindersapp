import { useState, useEffect } from "react";
import { Camera, CameraResultType, CameraSource, Photo } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Filesystem, Directory } from "@capacitor/filesystem";
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
  const [isIPad, setIsIPad] = useState(false);

  useEffect(() => {
    // Detect if device is iPad for iPad-specific configurations
    const detectDevice = async () => {
      const platform = Capacitor.getPlatform();
      
      if (platform === 'ios') {
        try {
          const info = await Device.getInfo();
          const iPadDetected = info.model?.toLowerCase().includes('ipad') || false;
          setIsIPad(iPadDetected);
          console.log('Device detected:', { model: info.model, isIPad: iPadDetected });
        } catch (error) {
          console.error('Error detecting device:', error);
        }
      }
    };
    
    detectDevice();
  }, []);

  // Helper function to upload file to backend
  const uploadFile = async (photo: Photo): Promise<string> => {
    try {
      let blob: Blob;
      
      // Determine mime type from photo format
      const format = photo.format || 'jpeg';
      const mimeType = format === 'jpeg' ? 'image/jpeg' 
        : format === 'png' ? 'image/png'
        : format === 'heic' ? 'image/heic'
        : format === 'webp' ? 'image/webp'
        : 'image/jpeg'; // fallback
      
      // Gallery photos often only have webPath, camera photos have path
      if (photo.webPath) {
        // For webPath (gallery selections), normalize URI and fetch as blob
        // convertFileSrc handles capacitor:// URIs on native builds
        const normalizedPath = Capacitor.convertFileSrc(photo.webPath);
        const response = await fetch(normalizedPath);
        blob = await response.blob();
      } else if (photo.path) {
        // For path (camera captures), read via Filesystem API
        const base64Data = await Filesystem.readFile({
          path: photo.path,
        });
        
        // Convert base64 to blob with proper mime type
        const base64Response = await fetch(`data:${mimeType};base64,${base64Data.data}`);
        blob = await base64Response.blob();
      } else {
        throw new Error('Photo has neither path nor webPath');
      }

      // Create FormData with proper filename and extension
      const formData = new FormData();
      const extension = format || 'jpg';
      formData.append('file', blob, `photo-${Date.now()}.${extension}`);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { filePath } = await response.json();
      return filePath;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

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
      
      // iPad-optimized configuration for iOS 18+ / iPadOS 26+
      const cameraOptions: any = {
        quality: 85, // Balanced quality for performance
        allowEditing: false, // CRITICAL: Disable editing on all iOS to prevent iPad crashes
        resultType: CameraResultType.Uri, // Use Uri to get file path for upload
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
      };

      // Add presentationStyle for iPad popover support (iOS 15+)
      if (isIPad) {
        cameraOptions.presentationStyle = 'popover';
        console.log('Using iPad-optimized camera settings with popover presentation');
      }

      const photo: Photo = await Camera.getPhoto(cameraOptions);

      console.log('Camera captured image:', { 
        path: photo.path,
        webPath: photo.webPath,
        format: photo.format,
        isIPad 
      });

      // Upload the file to backend (handles both path and webPath)
      const filePath = await uploadFile(photo);
      
      onPhotoCaptured(filePath);
      toast({
        title: "Photo captured",
        description: "Photo added to your reminder",
      });
    } catch (error: any) {
      console.error('Camera error details:', { 
        message: error?.message, 
        code: error?.code,
        isIPad 
      });
      
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
        // Show specific error message for debugging
        const errorMsg = error?.message || 'Unknown error occurred';
        toast({
          title: "Camera error",
          description: isIPad 
            ? `iPad camera error: ${errorMsg.substring(0, 50)}` 
            : "Failed to take photo. Please try again.",
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
      
      // iPad-optimized configuration for iOS 18+ / iPadOS 26+
      const galleryOptions: any = {
        quality: 85, // Balanced quality for performance
        allowEditing: false, // CRITICAL: Disable editing to prevent iPad crashes
        resultType: CameraResultType.Uri, // Use Uri to get file path for upload
        source: CameraSource.Photos,
        correctOrientation: true,
      };

      // Add presentationStyle for iPad popover support (iOS 15+)
      if (isIPad) {
        galleryOptions.presentationStyle = 'popover';
        console.log('Using iPad-optimized gallery settings with popover presentation');
      }

      const photo: Photo = await Camera.getPhoto(galleryOptions);

      console.log('Gallery selected image:', { 
        path: photo.path,
        webPath: photo.webPath,
        format: photo.format,
        isIPad 
      });

      // Upload the file to backend (handles both path and webPath)
      const filePath = await uploadFile(photo);
      
      onPhotoCaptured(filePath);
      toast({
        title: "Photo selected",
        description: "Photo added to your reminder",
      });
    } catch (error: any) {
      console.error('Gallery error details:', { 
        message: error?.message, 
        code: error?.code,
        isIPad 
      });
      
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
        // Show specific error message for debugging
        const errorMsg = error?.message || 'Unknown error occurred';
        toast({
          title: "Gallery error",
          description: isIPad 
            ? `iPad gallery error: ${errorMsg.substring(0, 50)}` 
            : "Failed to select photo. Please try again.",
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