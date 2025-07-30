import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const settingsSchema = z.object({
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  defaultRudenessLevel: z.number().min(1).max(5),
  voiceNotifications: z.boolean(),
  emailNotifications: z.boolean(),
  browserNotifications: z.boolean(),
});

type SettingsData = z.infer<typeof settingsSchema>;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth() as { user: User | undefined };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      email: user?.email || "",
      defaultRudenessLevel: user?.defaultRudenessLevel || 3,
      voiceNotifications: user?.voiceNotifications ?? true,
      emailNotifications: user?.emailNotifications ?? false,
      browserNotifications: user?.browserNotifications ?? true,
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsData) => {
      const response = await apiRequest("PATCH", "/api/user/settings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsData) => {
    updateSettingsMutation.mutate(data);
  };

  // Update form values when user data changes
  useState(() => {
    if (user) {
      form.reset({
        email: user.email || "",
        defaultRudenessLevel: user.defaultRudenessLevel || 3,
        voiceNotifications: user.voiceNotifications ?? true,
        emailNotifications: user.emailNotifications ?? false,
        browserNotifications: user.browserNotifications ?? true,
      });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your rude reminder preferences and notification settings.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Rudeness Level */}
            <FormField
              control={form.control}
              name="defaultRudenessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Rudeness Level</FormLabel>
                  <div className="px-2 py-4">
                    <FormControl>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="rudeness-slider"
                      />
                    </FormControl>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>Gentle</span>
                      <span>Firm</span>
                      <span>Sarcastic</span>
                      <span>Harsh</span>
                      <span>Savage</span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Preferences */}
            <div className="space-y-4">
              <FormLabel className="text-base">Notification Preferences</FormLabel>
              
              <FormField
                control={form.control}
                name="browserNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Browser Notifications
                      </FormLabel>
                      <div className="text-xs text-gray-500">
                        Show notifications in your browser
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="voiceNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Voice Notifications
                      </FormLabel>
                      <div className="text-xs text-gray-500">
                        Speak reminders out loud
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Email Notifications
                      </FormLabel>
                      <div className="text-xs text-gray-500">
                        Send reminders to your email
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-rude-red-600 hover:bg-rude-red-700"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
