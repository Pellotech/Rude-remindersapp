import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Pencil, Bell, Volume2, Mail, TestTube } from "lucide-react";
import { CalendarSchedule } from "./CalendarSchedule";
import { format } from "date-fns";

const formSchema = z.object({
  originalMessage: z.string().min(1, "Message is required"),
  scheduledFor: z.string().min(1, "Date and time are required").refine((dateStr) => {
    const scheduledDate = new Date(dateStr);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return scheduledDate >= now && scheduledDate <= oneWeekFromNow;
  }, {
    message: "Reminder can only be scheduled up to one week in advance",
  }),
  rudenessLevel: z.number().min(1).max(5),
  browserNotification: z.boolean(),
  voiceNotification: z.boolean(),
  emailNotification: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

const rudenessLabels = [
  { level: 1, emoji: "😊", label: "Gentle" },
  { level: 2, emoji: "🙂", label: "Firm" },
  { level: 3, emoji: "😏", label: "Sarcastic" },
  { level: 4, emoji: "😠", label: "Harsh" },
  { level: 5, emoji: "🤬", label: "Savage" },
];

export default function ReminderForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewMessage, setPreviewMessage] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originalMessage: "",
      scheduledFor: "",
      rudenessLevel: 3,
      browserNotification: true,
      voiceNotification: false,
      emailNotification: false,
    },
  });

  const rudenessLevel = form.watch("rudenessLevel");
  const originalMessage = form.watch("originalMessage");
  
  // Convert form's scheduledFor string to Date for calendar component
  const selectedDateTime = form.watch("scheduledFor") ? new Date(form.watch("scheduledFor")) : null;

  // Handle calendar date/time selection
  const handleDateTimeChange = (dateTime: Date) => {
    const formattedDateTime = format(dateTime, "yyyy-MM-dd'T'HH:mm");
    form.setValue("scheduledFor", formattedDateTime);
  };

  // Fetch rude phrases for preview
  const { data: phrases } = useQuery({
    queryKey: ["/api/phrases", rudenessLevel],
    enabled: rudenessLevel >= 1 && rudenessLevel <= 5,
  });

  // Update preview when message or rudeness level changes
  useEffect(() => {
    if (originalMessage && phrases && Array.isArray(phrases) && phrases.length > 0) {
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      setPreviewMessage(`${originalMessage}${randomPhrase.phrase}`);
    } else if (originalMessage) {
      setPreviewMessage(`${originalMessage}, get it done!`);
    } else {
      const samplePhrases = {
        1: ", you've got this! 💪",
        2: ", time to get moving!",
        3: ", because apparently you need reminding...",
        4: ", stop procrastinating like a lazy sloth!",
        5: ", you absolute couch potato!",
      };
      setPreviewMessage(`Finish that report${samplePhrases[rudenessLevel as keyof typeof samplePhrases]}`);
    }
  }, [originalMessage, rudenessLevel, phrases]);

  const createReminderMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/reminders", {
        ...data,
        title: data.originalMessage, // Use the original message as the title
        scheduledFor: new Date(data.scheduledFor).toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your rude reminder has been created.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
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
        description: "Failed to create reminder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testVoice = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(previewMessage);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Not Supported",
        description: "Voice synthesis is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: FormData) => {
    createReminderMutation.mutate(data);
  };

  // Set default date/time to tomorrow at 9 AM and calculate max date (one week from now)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const isoString = tomorrow.toISOString().slice(0, 16);
    form.setValue("scheduledFor", isoString);
  }, [form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PlusCircle className="text-rude-red-600 mr-3" />
          Create New Reminder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Message Field */}
            <FormField
              control={form.control}
              name="originalMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you need to be reminded about?</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="e.g., Finish that report, Call mom, Go to the gym"
                        {...field}
                      />
                      <Pencil className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Calendar Schedule */}
            <FormField
              control={form.control}
              name="scheduledFor"
              render={() => (
                <FormItem>
                  <FormLabel>When should we remind you?</FormLabel>
                  <FormControl>
                    <CalendarSchedule
                      selectedDateTime={selectedDateTime}
                      onDateTimeChange={handleDateTimeChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rudeness Level Slider */}
            <FormField
              control={form.control}
              name="rudenessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rudeness Level</FormLabel>
                  <div className="px-4 py-6 bg-gray-50 rounded-lg">
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
                    
                    {/* Slider Labels */}
                    <div className="flex justify-between mt-3 text-xs text-gray-500">
                      {rudenessLabels.map((item) => (
                        <div key={item.level} className="flex flex-col items-center">
                          <span className="text-lg mb-1">{item.emoji}</span>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    

                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Types */}
            <div>
              <FormLabel className="text-base">Notification Types</FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <FormField
                  control={form.control}
                  name="browserNotification"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <Bell className="text-rude-red-600 mr-2 h-4 w-4" />
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Browser
                        </FormLabel>
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
                  name="voiceNotification"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <Volume2 className="text-rude-red-600 mr-2 h-4 w-4" />
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Voice
                        </FormLabel>
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
                  name="emailNotification"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <Mail className="text-rude-red-600 mr-2 h-4 w-4" />
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Email
                        </FormLabel>
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
            </div>

            {/* Test Voice Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={testVoice}
            >
              <TestTube className="mr-2 h-4 w-4" />
              Test Voice Reminder
            </Button>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-rude-red-600 hover:bg-rude-red-700"
              disabled={createReminderMutation.isPending}
            >
              {createReminderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                "Create Rude Reminder"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
