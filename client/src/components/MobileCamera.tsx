import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera as CameraIcon, Image, Video } from "lucide-react";

interface MobileCameraProps {
  onPhotoCaptured: (photoUrl: string) => void;
  maxFiles?: number;
  currentCount?: number;
}

export function MobileCamera({ onPhotoCaptured, maxFiles = 5, currentCount = 0 }: MobileCameraProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

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
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        onPhotoCaptured(image.webPath);
        toast({
          title: "Photo captured",
          description: "Photo added to your reminder",
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
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
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        onPhotoCaptured(image.webPath);
        toast({
          title: "Photo selected",
          description: "Photo added to your reminder",
        });
      }
    } catch (error) {
      console.error('Error picking photo:', error);
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
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={takePhoto}
        disabled={isCapturing || currentCount >= maxFiles}
        className="flex-1"
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
      >
        <Image className="mr-2 h-4 w-4" />
        Gallery
      </Button>
    </div>
  );
}