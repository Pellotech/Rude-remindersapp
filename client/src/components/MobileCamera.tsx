import { useState, useEffect } from "react";
import { Camera, CameraResultType, CameraSource, Photo } from "@capacitor/camera";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Filesystem } from "@capacitor/filesystem";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera as CameraIcon, Image, AlertCircle } from "lucide-react";
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
    const detectDevice = async () => {
      const platform = Capacitor.getPlatform();
      
      if (platform === 'ios') {
        try {
          const info = await Device.getInfo();
          const iPadDetected = info.model?.toLowerCase().includes('ipad') || false;
          setIsIPad(iPadDetected);
        } catch (error) {
          // Silent error - device detection is non-critical
        }
      }
    };
    
    detectDevice();
  }, []);

  // Helper to derive MIME type from file extension
  const getMimeTypeFromExtension = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'heic' || ext === 'heif') return 'image/heic';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg'; // Safe fallback
  };

  // Helper function to upload file to backend
  const uploadFileFromUri = async (uri: string, mimeType?: string): Promise<string> => {
    try {
      // Normalize URI and fetch as blob
      const normalizedPath = Capacitor.convertFileSrc(uri);
      const encodedPath = encodeURI(normalizedPath);
      const response = await fetch(encodedPath);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Derive MIME type with multiple fallbacks
      const detectedMimeType = mimeType || blob.type || getMimeTypeFromExtension(uri);
      
      // Map MIME type to file extension
      const extension = detectedMimeType === 'image/jpeg' || detectedMimeType === 'image/jpg' ? 'jpg'
        : detectedMimeType === 'image/png' ? 'png'
        : detectedMimeType === 'image/heic' || detectedMimeType === 'image/heif' ? 'heic'
        : detectedMimeType === 'image/webp' ? 'webp'
        : 'jpg';

      // Create FormData with proper filename and extension
      const formData = new FormData();
      formData.append('file', blob, `photo-${Date.now()}.${extension}`);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { filePath } = await uploadResponse.json();
      return filePath;
    } catch (error) {
      throw error;
    }
  };

  // Legacy upload helper for Camera plugin (camera capture only)
  const uploadFileFromPhoto = async (photo: Photo): Promise<string> => {
    try {
      let blob: Blob;
      let detectedMimeType = '';

      // Try webPath first (more reliable on iOS), then path
      if (photo.webPath) {
        const normalizedPath = Capacitor.convertFileSrc(photo.webPath);
        const encodedPath = encodeURI(normalizedPath);
        const response = await fetch(encodedPath);
        blob = await response.blob();
        detectedMimeType = blob.type || getMimeTypeFromExtension(photo.webPath);
      } else if (photo.path) {
        const base64Data = await Filesystem.readFile({
          path: photo.path,
        });
        
        const format = photo.format || 'jpeg';
        detectedMimeType = format === 'jpeg' ? 'image/jpeg' 
          : format === 'png' ? 'image/png'
          : format === 'heic' ? 'image/heic'
          : format === 'webp' ? 'image/webp'
          : 'image/jpeg';
        
        const base64Response = await fetch(`data:${detectedMimeType};base64,${base64Data.data}`);
        blob = await base64Response.blob();
      } else {
        throw new Error('Photo has no valid path or webPath');
      }

      const mimeType = detectedMimeType || blob.type || 'image/jpeg';
      const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? 'jpg'
        : mimeType === 'image/png' ? 'png'
        : mimeType === 'image/heic' || mimeType === 'image/heif' ? 'heic'
        : mimeType === 'image/webp' ? 'webp'
        : 'jpg';

      const formData = new FormData();
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
      
      const cameraOptions: any = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
      };

      if (isIPad) {
        cameraOptions.presentationStyle = 'popover';
      }

      const photo: Photo = await Camera.getPhoto(cameraOptions);

      const filePath = await uploadFileFromPhoto(photo);
      
      onPhotoCaptured(filePath);
      toast({
        title: "Photo captured",
        description: "Photo added to your reminder",
      });
    } catch (error: any) {
      // Handle user cancellation silently
      if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
        return;
      }
      
      // Handle permission errors
      if (error?.message?.includes('permission') || error?.message?.includes('denied')) {
        setPermissionError('Camera permission is required. Please enable camera access in Settings.');
        toast({
          title: "Permission Required",
          description: "Please enable camera access in Settings",
          variant: "destructive",
        });
        return;
      }
      
      // Generic error handling
      toast({
        title: "Camera error",
        description: "Failed to take photo. Please try again.",
        variant: "destructive",
      });
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
      
      // Use FilePicker which uses native PHPicker on iOS/iPadOS
      // This is iPad-safe and doesn't have the crashes associated with Camera plugin gallery mode
      const result = await FilePicker.pickImages({
        limit: 1,
        readData: false, // Don't read data - we'll fetch via URI
      });

      if (!result.files || result.files.length === 0) {
        // User cancelled - silent return
        return;
      }

      const file = result.files[0];
      
      // Derive URI from available properties with fallback chain
      // file.path is preferred, but webPath or uri work on iPad/iCloud photos
      const fileUri = file.path || (file as any).webPath || (file as any).uri;
      
      if (!fileUri) {
        throw new Error('Selected file has no valid path, webPath, or uri');
      }

      // Upload using the file URI and mime type
      const filePath = await uploadFileFromUri(fileUri, file.mimeType);
      
      onPhotoCaptured(filePath);
      toast({
        title: "Photo selected",
        description: "Photo added to your reminder",
      });
    } catch (error: any) {
      // Handle user cancellation silently
      if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
        return;
      }
      
      // Handle permission errors
      if (error?.message?.includes('permission') || error?.message?.includes('denied')) {
        setPermissionError('Photo library permission is required. Please enable photo access in Settings.');
        toast({
          title: "Permission Required",
          description: "Please enable photo access in Settings",
          variant: "destructive",
        });
        return;
      }
      
      // Handle specific iPad/file errors
      if (error?.message?.includes('no valid path') || error?.message?.includes('no valid')) {
        toast({
          title: "Photo Error",
          description: "Unable to access the selected photo. Please try a different photo.",
          variant: "destructive",
        });
        return;
      }
      
      // Generic error handling
      toast({
        title: "Gallery error",
        description: "Failed to select photo. Please try again.",
        variant: "destructive",
      });
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
          {isCapturing ? "Selecting..." : "Gallery"}
        </Button>
      </div>
    </div>
  );
}
