import { useState, useEffect } from "react";
import { Camera, CameraResultType, CameraSource, Photo } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { AppLauncher } from "@capacitor/app-launcher";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera as CameraIcon, Image, AlertCircle, Settings } from "lucide-react";
import { getFullApiUrl, getAuthToken } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MobileCameraProps {
  onPhotoCaptured: (photoUrl: string) => void;
  maxFiles?: number;
  currentCount?: number;
  onGatedAction?: (action: () => void) => void;
}

export function MobileCamera({ onPhotoCaptured, maxFiles = 5, currentCount = 0, onGatedAction }: MobileCameraProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isIPad, setIsIPad] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionType, setPermissionType] = useState<'camera' | 'photos'>('camera');

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

  // Request camera permissions
  const requestCameraPermissions = async (): Promise<boolean> => {
    try {
      const permissions = await Camera.checkPermissions();
      
      if (permissions.camera === 'granted') {
        return true;
      }
      
      if (permissions.camera === 'denied') {
        setPermissionType('camera');
        setShowPermissionDialog(true);
        return false;
      }
      
      // Request permission
      const result = await Camera.requestPermissions({ permissions: ['camera'] });
      
      if (result.camera === 'granted') {
        return true;
      } else {
        setPermissionType('camera');
        setShowPermissionDialog(true);
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Request photos permissions
  const requestPhotosPermissions = async (): Promise<boolean> => {
    try {
      const permissions = await Camera.checkPermissions();
      
      // Accept both 'granted' and 'limited' as valid permission states
      // iOS users who select "Allow Limited Access" should be able to use the gallery
      if (permissions.photos === 'granted' || permissions.photos === 'limited') {
        return true;
      }
      
      if (permissions.photos === 'denied') {
        setPermissionType('photos');
        setShowPermissionDialog(true);
        return false;
      }
      
      // Request permission
      const result = await Camera.requestPermissions({ permissions: ['photos'] });
      
      // Accept both 'granted' and 'limited' after requesting
      if (result.photos === 'granted' || result.photos === 'limited') {
        return true;
      } else {
        setPermissionType('photos');
        setShowPermissionDialog(true);
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Open iOS Settings
  const openSettings = async () => {
    try {
      // Use Capacitor App Launcher to open app-specific settings
      await AppLauncher.openUrl({ url: 'app-settings:' });
    } catch (error) {
      // Fallback - show instructions
      toast({
        title: "Open Settings Manually",
        description: "Go to Settings > Rude Reminders > Enable Camera/Photos",
        variant: "destructive",
      });
    }
  };

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

      const token = getAuthToken();
      const uploadResponse = await fetch(getFullApiUrl('/api/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', uploadResponse.status, errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
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
      console.log('uploadFileFromPhoto starting with photo:', { 
        hasBase64: !!photo.base64String,
        format: photo.format 
      });
      
      if (!photo.base64String) {
        throw new Error('No base64 data in photo');
      }

      // Determine MIME type from format
      const format = photo.format || 'jpeg';
      const mimeType = format === 'jpeg' ? 'image/jpeg' 
        : format === 'png' ? 'image/png'
        : format === 'heic' ? 'image/heic'
        : format === 'webp' ? 'image/webp'
        : 'image/jpeg';
      
      console.log('Converting base64 to blob, mimeType:', mimeType);
      
      // Convert base64 to blob
      const base64Response = await fetch(`data:${mimeType};base64,${photo.base64String}`);
      const blob = await base64Response.blob();
      
      console.log('Blob created, size:', blob.size, 'type:', blob.type);

      // Determine file extension from MIME type
      const extension = mimeType === 'image/jpeg' ? 'jpg'
        : mimeType === 'image/png' ? 'png'
        : mimeType === 'image/heic' ? 'heic'
        : mimeType === 'image/webp' ? 'webp'
        : 'jpg';

      const formData = new FormData();
      const filename = `photo-${Date.now()}.${extension}`;
      formData.append('file', blob, filename);
      console.log('FormData created with filename:', filename);

      console.log('Uploading to /api/upload...');
      const token = getAuthToken();
      const response = await fetch(getFullApiUrl('/api/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });

      console.log('Upload response:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const { filePath } = await response.json();
      console.log('Upload successful, filePath:', filePath);
      return filePath;
    } catch (error) {
      console.error('uploadFileFromPhoto error:', error);
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
      
      // Request camera permissions BEFORE opening camera
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) {
        setIsCapturing(false);
        return; // Permission dialog will be shown
      }
      
      const cameraOptions: any = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64, // Get base64 directly
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
      
      console.error('Camera error:', error);
      
      // Show specific error message
      const errorMsg = error?.message || 'Failed to take photo. Please try again.';
      toast({
        title: "Camera error",
        description: errorMsg,
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
      
      // Request photos permissions BEFORE opening gallery
      const hasPermission = await requestPhotosPermissions();
      if (!hasPermission) {
        setIsCapturing(false);
        return; // Permission dialog will be shown
      }
      
      // Use Camera plugin's gallery mode
      // Note: On iPad, this uses a popover presentation
      const galleryOptions: any = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64, // Get base64 directly
        source: CameraSource.Photos, // Use gallery/photos
      };

      // iPad-specific: Use popover to prevent crashes
      if (isIPad) {
        galleryOptions.presentationStyle = 'popover';
      }

      const photo = await Camera.getPhoto(galleryOptions);

      if (!photo) {
        // User cancelled - silent return
        return;
      }

      console.log('Gallery photo selected:', {
        hasBase64: !!photo.base64String,
        format: photo.format
      });

      if (!photo.base64String) {
        console.error('Gallery photo missing base64 data');
        toast({
          title: "Gallery error",
          description: "Failed to read photo data",
          variant: "destructive",
        });
        return;
      }

      // Upload the gallery photo
      const filePath = await uploadFileFromPhoto(photo);
      
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
      
      console.error('Gallery error:', error);
      
      // Show specific error message
      const errorMsg = error?.message || 'Failed to select photo. Please try again.';
      toast({
        title: "Gallery error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            console.log('[FeatureGate] Camera button tapped');
            if (onGatedAction) {
              onGatedAction(() => takePhoto());
            } else {
              takePhoto();
            }
          }}
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
          onClick={() => {
            console.log('[FeatureGate] Gallery button tapped');
            if (onGatedAction) {
              onGatedAction(() => pickFromGallery());
            } else {
              pickFromGallery();
            }
          }}
          disabled={isCapturing || currentCount >= maxFiles}
          className="flex-1"
          data-testid="button-gallery"
        >
          <Image className="mr-2 h-4 w-4" />
          {isCapturing ? "Selecting..." : "Gallery"}
        </Button>
      </div>

      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {permissionType === 'camera' ? 'Camera Access Required' : 'Photos Access Required'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {permissionType === 'camera' 
                ? 'Rude Reminders needs access to your camera to take photos for your reminders. Please enable camera access in Settings.'
                : 'Rude Reminders needs access to your photo library to select images for your reminders. Please enable photo access in Settings.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={openSettings} className="gap-2">
              <Settings className="h-4 w-4" />
              Open Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
