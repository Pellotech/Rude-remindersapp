// Create Reminder form: photos attached to the reminder.
import { useRef, useState } from "react";
import { getFullApiUrl, getAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useReminderAttachments({ isFreePlan, hasProAccess, gateAttachments }: {
  isFreePlan: boolean;
  hasProAccess: boolean;
  gateAttachments: (action: () => void) => void;
}) {
  const { toast } = useToast();
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handlers - gated behind premium
  const handlePhotoAttachment = () => {
    console.log('[FeatureGate] handlePhotoAttachment tapped, hasProAccess:', hasProAccess);
    gateAttachments(() => {
      console.log('[FeatureGate] Attachment gate PASSED, opening file picker');
      fileInputRef.current?.click();
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxFiles = isFreePlan ? 1 : 5;
    const currentCount = selectedAttachments.length;
    const remainingSlots = maxFiles - currentCount;

    if (remainingSlots <= 0) {
      toast({
        title: "Limit reached",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const token = getAuthToken();
        const response = await fetch(getFullApiUrl('/api/upload'), {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        });

        if (response.ok) {
          const { filePath } = await response.json();
          setSelectedAttachments(prev => [...prev, filePath]);
          toast({
            title: "File uploaded",
            description: "File added to your reminder",
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Upload error",
          description: "Failed to upload file. Please try again.",
          variant: "destructive",
        });
      }
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return { selectedAttachments, setSelectedAttachments, fileInputRef, handlePhotoAttachment, handleFileSelect, removeAttachment };
}
