import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useLocation } from "wouter";
import { apiRequest, getFullApiUrl, getAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { guestStorage } from "@/services/guestStorage";
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
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Volume2, Mail, TestTube, User, Bot, Crown, Heart, Zap, Camera, Quote, ImageIcon, Video, ChevronDown, Calendar, Clock, Briefcase, Users, Dumbbell, Brain, GraduationCap, ChefHat, Home, DollarSign, Gamepad2, Lock } from "lucide-react";
import { CalendarSchedule } from "./CalendarSchedule";
import { format, isSameDay, startOfDay, isBefore } from "date-fns";
import { QuotesService } from "@/services/quotesService";
import { CulturalQuotesService } from "@/services/culturalQuotesService";
import { MobileCamera } from "./MobileCamera";
import { getPlatformInfo, supportsCamera, supportsNotifications } from "@/utils/platformDetection";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useMobileNotifications } from "./MobileNotifications";
import { usePaywallGate } from "@/components/PaywallGate";
import { isFeatureDisabled } from "@/config/featureFlags";

const formSchema = z.object({
  originalMessage: z.string().min(1, "Message is required"),
  context: z.string().optional(),
  scheduledFor: z.string().optional(), // Made optional since multi-day doesn't use this
  rudenessLevel: z.number().min(1).max(5),
  voiceCharacter: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  motivationalQuote: z.string().optional(),
  selectedDays: z.array(z.string()).optional(),
  isMultiDay: z.boolean().optional(),
}).refine((data) => {
  // Custom validation: either scheduledFor is provided (single day) OR isMultiDay with selectedDays
  if (data.isMultiDay) {
    return data.selectedDays && data.selectedDays.length > 0;
  } else {
    if (!data.scheduledFor) return false;
    const scheduledDate = new Date(data.scheduledFor);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000); // Allow as short as 1 minute
    return scheduledDate >= oneMinuteFromNow && scheduledDate <= oneWeekFromNow;
  }
}, {
  message: "Please select a valid schedule: either a specific date/time or multiple days (minimum 1 minute from now)",
  path: ["scheduledFor"], // This will show the error on the scheduling field
});

type FormData = z.infer<typeof formSchema>;

interface ReminderFormProps {
  isFreePlan?: boolean;
  currentReminderCount?: number;
  maxReminders?: number;
}

const rudenessLabels = [
  { level: 1, emoji: "😊", label: "Gentle" },
  { level: 2, emoji: "🙂", label: "Motivational" },
  { level: 3, emoji: "😏", label: "Sarcastic" },
  { level: 4, emoji: "😠", label: "Harsh" },
  { level: 5, emoji: "🤬", label: "Savage" },
];

// Context categories for quick selection
const contextCategories = [
  { id: "work", label: "Work", description: "Job, career, professional tasks", icon: Briefcase },
  { id: "family", label: "Family & Friends", description: "Relationships, social commitments", icon: Users },
  { id: "health", label: "Working Out", description: "Exercise, fitness, health goals", icon: Dumbbell },
  { id: "meditation", label: "Personal Reflection", description: "Meditation, mindfulness, self-care", icon: Brain },
  { id: "learning", label: "Learning & School", description: "Education, studying, skill development", icon: GraduationCap },
  { id: "cooking", label: "Food & Cooking", description: "Meals, recipes, nutrition", icon: ChefHat },
  { id: "household", label: "Home & Chores", description: "Cleaning, organization, maintenance", icon: Home },
  { id: "finance", label: "Money & Finance", description: "Bills, budgeting, financial goals", icon: DollarSign },
  { id: "entertainment", label: "Fun & Hobbies", description: "Recreation, entertainment, personal time", icon: Gamepad2 },
];

function findPreferredVoice(voices: SpeechSynthesisVoice[], voiceType: string): SpeechSynthesisVoice | undefined {
  console.log(`🎙️ [TTS-DIAG] findPreferredVoice called | voiceType="${voiceType}" | available voices: ${voices.length}`);
  if (voices.length > 0) {
    console.log(`🎙️ [TTS-DIAG] Voice list:`, voices.map(v => `${v.name} (${v.lang})`).join(', '));
  } else {
    console.warn(`🎙️ [TTS-DIAG] ⚠️ NO VOICES available from getVoices()`);
  }
  let result: SpeechSynthesisVoice | undefined;
  if (voiceType === 'british-male') {
    result = voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.lang.includes('en-GB') && (v.name.toLowerCase().includes('male') || v.name.includes('Oliver') || v.name.includes('Arthur'))) ||
      voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man'));
  } else if (voiceType === 'male') {
    result = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man') || v.name.includes('David') || v.name.includes('Daniel'));
  } else if (voiceType === 'female') {
    result = voices.find(v => v.name.includes('Google US English') && v.name.includes('Female')) ||
      voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.includes('Samantha') || v.name.includes('Victoria'));
  } else {
    result = voices.find(v => v.lang.includes('en'));
  }
  console.log(`🎙️ [TTS-DIAG] Selected voice: ${result ? `${result.name} (${result.lang})` : 'NONE - using default'}`);
  return result;
}

// Voice character icon mapping
const getVoiceIcon = (id: string) => {
  const iconMap: Record<string, any> = {
    "default": User,
    "confident-leader": Crown,
    "british-butler": Crown,
    "karen-nag": Heart,
  };
  return iconMap[id] || User;
};

// Historical figures and motivation categories
const motivationCategories = [
  {
    id: "sports",
    name: "Sports Champions",
    icon: Zap,
    description: "Motivation from legendary athletes",
    figures: ["Muhammad Ali", "Michael Jordan", "Serena Williams", "Tom Brady", "Usain Bolt"]
  },
  {
    id: "historical",
    name: "Historical Leaders",
    icon: Crown,
    description: "Wisdom from great leaders",
    figures: ["Winston Churchill", "Abraham Lincoln", "Nelson Mandela", "Martin Luther King Jr.", "Theodore Roosevelt"]
  },
  {
    id: "entrepreneurs",
    name: "Business Innovators",
    icon: Bot,
    description: "Insights from successful entrepreneurs",
    figures: ["Steve Jobs", "Bill Gates", "Elon Musk", "Oprah Winfrey", "Jeff Bezos"]
  },
  {
    id: "scientists",
    name: "Great Minds",
    icon: User,
    description: "Knowledge from brilliant scientists",
    figures: ["Albert Einstein", "Marie Curie", "Stephen Hawking", "Nikola Tesla", "Isaac Newton"]
  },
  {
    id: "motivational",
    name: "Life Coaches",
    icon: Heart,
    description: "General motivational wisdom",
    figures: ["Tony Robbins", "Maya Angelou", "Ralph Waldo Emerson", "Dale Carnegie", "Zig Ziglar"]
  }
];

// Sample quotes for different categories
const sampleQuotes = {
  sports: [
    "Float like a butterfly, sting like a bee. - Muhammad Ali",
    "I've failed over and over again in my life. That's why I succeed. - Michael Jordan",
    "Champions are made from something they have deep inside them - a desire, a dream, a vision. - Muhammad Ali"
  ],
  historical: [
    "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
    "The best way to predict the future is to create it. - Abraham Lincoln",
    "It always seems impossible until it's done. - Nelson Mandela"
  ],
  entrepreneurs: [
    "Innovation distinguishes between a leader and a follower. - Steve Jobs",
    "Success is a lousy teacher. It seduces smart people into thinking they can't lose. - Bill Gates",
    "When something is important enough, you do it even if the odds are not in your favor. - Elon Musk"
  ],
  scientists: [
    "Imagination is more important than knowledge. - Albert Einstein",
    "Nothing in life is to be feared, it is only to be understood. - Marie Curie",
    "Look up at the stars and not down at your feet. - Stephen Hawking"
  ],
  motivational: [
    "The way to get started is to quit talking and begin doing. - Walt Disney",
    "Don't be afraid to give up the good to go for the great. - John D. Rockefeller",
    "Believe you can and you're halfway there. - Theodore Roosevelt"
  ]
};

export default function ReminderForm({
  isFreePlan = false,
  currentReminderCount = 0,
  maxReminders = 5
}: ReminderFormProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const [, setLocation] = useLocation();
  const { scheduleReminder: scheduleNativeNotification, requestPermissions } = useMobileNotifications();

  const hasProAccess = !isFreePlan && user?.subscriptionPlan === 'premium';
  console.log('[FeatureGate] hasProAccess:', hasProAccess, 'isFreePlan:', isFreePlan, 'subscriptionPlan:', user?.subscriptionPlan);
  const { gate: gateAttachments, modal: attachmentsModal } = usePaywallGate('MEDIA_ATTACHMENTS', 'Media Attachments', hasProAccess);
  const { gate: gateQuotes, modal: quotesModal } = usePaywallGate('MOTIVATIONAL_QUOTES', 'Motivational Quotes', hasProAccess);

  // Get user settings for simplified interface
  const { data: userSettings } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  // Get user notification preferences from settings
  const { data: userNotificationSettings } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  const isSimplifiedInterface = (userSettings as any)?.simplifiedInterface || false;
  const [previewMessage, setPreviewMessage] = useState("");

  // Fetch voice characters from backend
  const { data: voiceCharacters = [], isLoading: voicesLoading } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: async () => {
      const response = await fetch(getFullApiUrl("/api/voices"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch voices");
      return response.json();
    }
  });

  // Voice character state - use user's default or random selection
  const [selectedVoice, setSelectedVoice] = useState(() => {
    // First try to use user's saved preference
    if ((userNotificationSettings as any)?.defaultVoiceCharacter) {
      return (userNotificationSettings as any).defaultVoiceCharacter;
    }
    // Fallback to random selection if no preference saved
    const randomIndex = Math.floor(Math.random() * voiceCharacters.length);
    return voiceCharacters[randomIndex]?.id || "default";
  });
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedContextCategory, setSelectedContextCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collapsible states for advanced sections
  const [voiceCharacterOpen, setVoiceCharacterOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [motivationalOpen, setMotivationalOpen] = useState(false);
  const [quickReminderOpen, setQuickReminderOpen] = useState(false);


  // Multi-day selection state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [multiDayHour, setMultiDayHour] = useState(9); // Default 9 AM
  const [multiDayMinute, setMultiDayMinute] = useState(0); // Default :00

  // Detect if we're on mobile platform
  const platformInfo = getPlatformInfo();
  const isMobileWithCamera = platformInfo.isNative && supportsCamera();

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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originalMessage: "",
      context: "",
      scheduledFor: "",
      rudenessLevel: 3, // Will be updated when user data loads
      voiceCharacter: "default", // Will be updated when user data loads
      attachments: [],
      motivationalQuote: "",
      selectedDays: [],
      isMultiDay: false,
    },
  });

  // Update form defaults when user settings change
  useEffect(() => {
    if (userNotificationSettings) {
      const userData = userNotificationSettings as any;
      const defaultRudeness = userData?.defaultRudenessLevel || 3;
      const defaultVoice = userData?.defaultVoiceCharacter || "default";

      // Update form values with user's saved preferences
      form.setValue("rudenessLevel", defaultRudeness);
      form.setValue("voiceCharacter", defaultVoice);
      setSelectedVoice(defaultVoice);
    }
  }, [userNotificationSettings, form]);

  const rudenessLevel = form.watch("rudenessLevel");
  const voiceCharacter = form.watch("voiceCharacter");

  // Update selectedVoice when form voiceCharacter changes
  useEffect(() => {
    setSelectedVoice(voiceCharacter);
  }, [voiceCharacter]);

  const originalMessage = form.watch("originalMessage");
  const scheduledForValue = form.watch("scheduledFor");

  // Convert form's scheduledFor string to Date for calendar component
  const selectedDateTime = scheduledForValue ? new Date(scheduledForValue) : null;

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
    let baseMessage = "";
    if (originalMessage && phrases && Array.isArray(phrases) && phrases.length > 0) {
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      baseMessage = `${originalMessage}${randomPhrase.phrase}`;
    } else if (originalMessage) {
      baseMessage = `${originalMessage}, get it done!`;
    } else {
      const samplePhrases = {
        1: ", you've got this! 💪",
        2: ", time to get moving!",
        3: ", because apparently you need reminding...",
        4: ", stop procrastinating like a lazy sloth!",
        5: ", you absolute couch potato!",
      };
      baseMessage = `Finish that report${samplePhrases[rudenessLevel as keyof typeof samplePhrases]}`;
    }

    setPreviewMessage(baseMessage);
  }, [originalMessage, rudenessLevel, phrases]);

  const createReminderMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // For guest users, store reminders in localStorage
      if (isGuest) {
        const guestReminder = guestStorage.addReminder({
          title: data.originalMessage,
          scheduledFor: data.scheduledFor || new Date().toISOString(),
          rudeMessage: previewMessage || `${data.originalMessage}, get it done!`,
          motivationLevel: data.rudenessLevel,
          isMultiDay: data.isMultiDay,
          selectedDays: data.selectedDays,
          voiceCharacter: data.voiceCharacter,
          browserNotification: true,
          voiceNotification: false,
        });
        return guestReminder;
      }

      // For authenticated users, use API
      const submissionData = {
        ...data,
        title: data.originalMessage, // Use the original message as the title
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : undefined,
        attachments: selectedAttachments, // Ensure attachments are included
      };

      return await apiRequest("/api/reminders", {
        method: "POST",
        body: submissionData as any
      });
    },
    onSuccess: async (result) => {
      // Handle both single reminder and multi-day reminder responses
      const isMultiDayResult = result.count && result.reminders;

      toast({
        title: "Success!",
        description: isMultiDayResult
          ? `Created ${result.count} recurring reminders!`
          : `Your reminder has been created!`,
      });

      // Schedule native iOS/Android notifications if on mobile platform
      const notificationsSupported = supportsNotifications();
      console.log('🔔 Notifications supported:', notificationsSupported);

      if (notificationsSupported) {
        try {
          // Request notification permissions first
          console.log('📱 Requesting notification permissions...');
          const hasPermission = await requestPermissions();
          console.log('🔐 Permission granted:', hasPermission);

          if (hasPermission) {
            // Handle both single and multi-day reminders
            const remindersToSchedule = isMultiDayResult ? result.reminders : [result];
            console.log('📋 Reminders to schedule:', remindersToSchedule.length);

            for (const reminder of remindersToSchedule) {
              console.log('⏰ Scheduling notification for:', {
                id: reminder.id,
                title: reminder.title || reminder.originalMessage,
                scheduledFor: new Date(reminder.scheduledFor)
              });

              await scheduleNativeNotification({
                id: reminder.id,
                title: reminder.title || reminder.originalMessage,
                body: reminder.rudeMessage || reminder.originalMessage,
                scheduledFor: new Date(reminder.scheduledFor),
                attachments: reminder.attachments || [],
                motivationalQuote: reminder.motivationalQuote,
                voiceNotification: reminder.voiceNotification,
                voiceCharacter: reminder.voiceCharacter
              });
            }

            console.log(`✅ Scheduled ${remindersToSchedule.length} native notification(s)`);
          } else {
            console.warn('⚠️ No notification permission - showing toast');
            toast({
              title: "Notification Permissions Required",
              description: "Please enable notifications in Settings to receive reminders when the app is closed.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ Failed to schedule native notifications:', error);
          // Don't block the success flow, just log the error
        }
      } else {
        console.log('ℹ️ Notifications not supported on this platform');
      }

      // Reset form while preserving user defaults
      form.reset({
        originalMessage: "",
        context: "",
        scheduledFor: "",
        rudenessLevel: (userNotificationSettings as any)?.defaultRudenessLevel || 3,
        voiceCharacter: (userNotificationSettings as any)?.defaultVoiceCharacter || "default",
        attachments: [],
        motivationalQuote: "",
        selectedDays: [],
        isMultiDay: false,
      });

      // Reset all custom state variables but preserve user defaults
      const defaultVoice = (userNotificationSettings as any)?.defaultVoiceCharacter || "default";
      setSelectedVoice(defaultVoice);
      setSelectedAttachments([]);
      setSelectedCategory("");
      setSelectedContextCategory("");
      setSelectedDays([]);
      setIsMultiDay(false);
      setMultiDayHour(9);
      setMultiDayMinute(0);

      // Invalidate the correct query based on guest mode
      if (isGuest) {
        queryClient.invalidateQueries({ queryKey: ["guest-reminders"] });
        queryClient.invalidateQueries({ queryKey: ["guest-stats"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 500);
        return;
      }
      // Handle specific error codes
      try {
        const errorData = JSON.parse(error.message);
        if (errorData?.code === 'REMINDER_LIMIT_EXCEEDED') {
          toast({
            title: "Reminder Limit Reached",
            description: errorData.error || `You've reached your reminder limit for this month. Your limit resets on ${errorData.resetDate || 'the 1st of next month'}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create reminder. Please try again.",
            variant: "destructive",
          });
        }
      } catch (e) {
        // Fallback for non-JSON error messages
        toast({
          title: "Error",
          description: "Failed to create reminder. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const testVoice = async () => {
    const selectedVoiceId = form.watch("voiceCharacter");
    const character = voiceCharacters.find((v: any) => v.id === selectedVoiceId) || voiceCharacters[0];
    if (!character) return;

    const message = previewMessage || character.testMessage;

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(getFullApiUrl("/api/voices/test"), {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          voiceCharacter: selectedVoiceId,
          testMessage: message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);

          audio.addEventListener('canplaythrough', () => {
            audio.play().then(() => {
              toast({
                title: "Voice Test",
                description: `Playing ${character.name} voice sample`,
              });
            }).catch(() => {
              useFallbackSpeech(message, character.name, data.voiceSettings);
            });
          });

          audio.addEventListener('error', () => {
            useFallbackSpeech(message, character.name, data.voiceSettings);
          });

          audio.load();
        } else if (data.voiceSettings) {
          useFallbackSpeech(message, character.name, data.voiceSettings);
        } else {
          useFallbackSpeech(message, character.name);
        }
      } else {
        useFallbackSpeech(message, character.name);
      }
    } catch (error) {
      console.error("Voice test error:", error);
      useFallbackSpeech(message, character.name);
    }
  };

  const useFallbackSpeech = (message: string, characterName?: string, voiceSettings?: { rate: number, pitch: number, voiceType?: string }) => {
    console.log(`🎙️ [TTS-DIAG] ReminderForm.useFallbackSpeech called | character="${characterName}" | speechSynthesis in window: ${'speechSynthesis' in window}`);
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = voiceSettings?.rate ?? 0.9;
        utterance.pitch = voiceSettings?.pitch ?? 1.0;
        utterance.volume = 0.8;

        const selectedVoiceId = form.watch("voiceCharacter");
        const voiceTypeMap: Record<string, string> = {
          'default': 'female',
          'confident-leader': 'male',
          'british-butler': 'british-male',
          'karen-nag': 'female'
        };
        const voiceType = voiceSettings?.voiceType || voiceTypeMap[selectedVoiceId] || 'female';
        console.log(`🎙️ [TTS-DIAG] ReminderForm settings: rate=${utterance.rate}, pitch=${utterance.pitch}, voiceType="${voiceType}", selectedVoiceId="${selectedVoiceId}"`);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = findPreferredVoice(voices, voiceType);
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          toast({
            title: "Voice Test",
            description: `Playing ${characterName || 'voice'} sample`,
          });
        };

        utterance.onstart = () => console.log(`🎙️ [TTS-DIAG] ✅ ReminderForm utterance STARTED speaking`);
        utterance.onend = () => console.log(`🎙️ [TTS-DIAG] ✅ ReminderForm utterance ENDED`);
        utterance.onerror = (e) => {
          console.error(`🎙️ [TTS-DIAG] ❌ ReminderForm utterance ERROR:`, e.error, e);
          toast({
            title: `${characterName || 'Voice'} Selected`,
            description: "Voice preview isn't available on this device, but your reminders will use this voice.",
          });
        };

        speechSynthesis.speak(utterance);
        console.log(`🎙️ [TTS-DIAG] ReminderForm: speechSynthesis.speak() called`);
      } catch {
        toast({
          title: `${characterName || 'Voice'} Selected`,
          description: "Voice preview isn't available on this device, but your reminders will use this voice.",
        });
      }
    } else {
      toast({
        title: `${characterName || 'Voice'} Selected`,
        description: "Voice preview isn't available on this device, but your reminders will use this voice.",
      });
    }
  };

  // Handle category selection - gated behind premium
  const handleCategorySelection = (categoryId: string) => {
    console.log('[FeatureGate] handleCategorySelection tapped, hasProAccess:', hasProAccess);
    gateQuotes(() => {
      console.log('[FeatureGate] Quote gate PASSED, selecting category:', categoryId);
      setSelectedCategory(categoryId);
    });
  };

  // Multi-day selection helper functions
  const getWeekDays = () => {
    const today = new Date();
    // Generate the 7 days starting from today, just like single day interface
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      return {
        id: dayNames[date.getDay()],
        label: format(date, 'EEE'), // Mon, Tue, Wed, etc.
        short: format(date, 'd'), // Date number
        full: format(date, 'EEEE'), // Full day name
        date: date,
        isToday: isSameDay(date, today)
      };
    });
  };

  const daysOfWeek = getWeekDays();

  const handleDayToggle = (dayId: string) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId];
      form.setValue("selectedDays", newDays);
      return newDays;
    });
  };

  const handleMultiDayToggle = (checked: boolean) => {
    setIsMultiDay(checked);
    form.setValue("isMultiDay", checked);
    if (!checked) {
      setSelectedDays([]);
      form.setValue("selectedDays", []);
    }
  };





  // New function specifically for generating quotes during form submission
  const generateQuoteForSubmission = async (category: string): Promise<string | null> => {
    try {
      // Make API call to get quote for the specific category - use getFullApiUrl and auth token
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(getFullApiUrl(`/api/quotes/${category}`), {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quote: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.quote) {
        return data.quote;
      } else {
        throw new Error("No quote received from API");
      }
    } catch (error) {
      console.error("Error fetching quote for submission:", error);

      // Fallback to client-side quotes if API fails
      const userData = userSettings as any;
      if (userData?.ethnicitySpecificQuotes && userData?.ethnicity) {
        const culturalQuote = CulturalQuotesService.getPersonalizedQuote(
          userData.ethnicity,
          true,
          userData.gender,
          userData.genderSpecificReminders
        );
        if (culturalQuote) {
          return culturalQuote;
        }
      }

      // Final fallback to general quotes
      const quote = QuotesService.getRandomQuote(category);
      if (quote) {
        return QuotesService.formatQuote(quote);
      }

      return null;
    }
  };

  // Handle context category selection
  const handleContextCategorySelect = (category: typeof contextCategories[0]) => {
    if (selectedContextCategory === category.id) {
      // Deselect if already selected
      setSelectedContextCategory("");
      form.setValue("context", "");
    } else {
      // Select new category
      setSelectedContextCategory(category.id);
      // Set the context field with the category ID for AI analysis
      form.setValue("context", category.id);
    }
  };


  const onSubmit = async (data: FormData) => {
    let scheduledDateTime;

    if (isMultiDay && selectedDays.length > 0) {
      // For multi-day reminders, create a date with the selected hour and minute
      // Use tomorrow as base date for multi-day scheduling
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(multiDayHour, multiDayMinute, 0, 0);
      scheduledDateTime = tomorrow.toISOString();
    } else if (!isMultiDay && data.scheduledFor) {
      scheduledDateTime = data.scheduledFor;
    } else {
      // Fallback: use tomorrow at 9 AM if no valid schedule is set
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      scheduledDateTime = tomorrow.toISOString();
    }

    // Generate quote if category is selected
    let finalMotivationalQuote = "";
    if (selectedCategory) {
      try {
        // Generate quote based on selected category
        const generatedQuote = await generateQuoteForSubmission(selectedCategory);
        finalMotivationalQuote = generatedQuote || "";
      } catch (error) {
        console.error("Failed to generate quote on submission:", error);
      }
    }

    // Include all the new features in the submission along with user notification preferences
    const submissionData = {
      ...data,
      scheduledFor: scheduledDateTime,
      voiceCharacter: selectedVoice,
      attachments: selectedAttachments,
      motivationalQuote: finalMotivationalQuote,
      selectedDays: isMultiDay ? selectedDays : [],
      isMultiDay: isMultiDay,
      // Apply user's notification preferences from settings
      browserNotification: (userNotificationSettings as any)?.browserNotifications ?? true,
      voiceNotification: (userNotificationSettings as any)?.voiceNotifications ?? false,
      emailNotification: (userNotificationSettings as any)?.emailNotifications ?? false,
    };

    console.log('Submitting reminder data:', submissionData);
    createReminderMutation.mutate(submissionData);
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
    <Card className="mt-4 bg-white border-2 border-[#C9A063] rounded-[24px] shadow-[var(--rr-card-shadow)] ring-2 ring-[#C53B3B] ring-offset-2">
      <CardContent className="pt-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Message Field */}
            <FormField
              control={form.control}
              name="originalMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you need to be reminded about?</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-white border-2 border-[#C53B3B] focus:border-[#C53B3B] focus:ring-0 rounded-[14px] py-3 text-[#111827]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Select Date Section */}
            <FormField
              control={form.control}
              name="scheduledFor"
              render={({ fieldState }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Multiple Days</span>
                      <Switch
                        checked={isMultiDay}
                        onCheckedChange={handleMultiDayToggle}
                        className="data-[state=checked]:bg-[#C9A063] data-[state=unchecked]:bg-gray-300"
                      />
                    </div>
                  </div>

                  <FormControl>
                    {isMultiDay ? (
                      /* Multi-Day Selection */
                      <div className="space-y-3">
                        {/* Days Selection Card */}
                        <Card>
                          <CardContent className="pt-3 pb-3">
                            <p className="text-xs text-muted-foreground mb-2">Choose which days to repeat</p>
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                              {daysOfWeek.map((day) => {
                                const isSelected = selectedDays.includes(day.id);
                                return (
                                  <div key={day.id} className="text-center flex-shrink-0 min-w-[56px]">
                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                      {day.label}
                                    </div>
                                    <Button
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleDayToggle(day.id)}
                                      className={cn(
                                        "w-full h-10 flex flex-col items-center justify-center p-1",
                                        day.isToday && !isSelected && "border-primary text-primary",
                                        isSelected && "bg-primary text-primary-foreground"
                                      )}
                                    >
                                      <span className="text-base font-semibold">{day.short}</span>
                                      {day.isToday && (
                                        <span className="text-[10px] leading-tight">Today</span>
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Time Selection Card */}
                        {selectedDays.length > 0 && (
                          <Card>
                            <CardContent className="pt-3 pb-3">
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                {Array.from({ length: 24 }, (_, i) => {
                                  const hour = i;
                                  const isSelected = multiDayHour === hour;
                                  const display = hour === 0 ? "12:00 AM" : hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
                                  return (
                                    <Button
                                      key={hour}
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setMultiDayHour(hour)}
                                      className={cn(
                                        "h-9 text-sm whitespace-nowrap flex-shrink-0 min-w-[72px]",
                                        isSelected && "bg-primary text-primary-foreground"
                                      )}
                                    >
                                      {display}
                                    </Button>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Minutes Selection Card */}
                        {selectedDays.length > 0 && (
                          <Card>
                            <CardContent className="pt-3 pb-3">
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                {[
                                  { value: 0, label: ":00", displayLabel: "On the hour" },
                                  { value: 15, label: ":15", displayLabel: "Quarter past" },
                                  { value: 30, label: ":30", displayLabel: "Half past" },
                                  { value: 45, label: ":45", displayLabel: "Quarter to" }
                                ].map((slot) => {
                                  const isSelected = multiDayMinute === slot.value;
                                  return (
                                    <Button
                                      key={slot.value}
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setMultiDayMinute(slot.value)}
                                      className={cn(
                                        "h-14 text-sm whitespace-nowrap flex-shrink-0 min-w-[90px]",
                                        isSelected && "bg-primary text-primary-foreground"
                                      )}
                                    >
                                      <div className="flex flex-col items-center">
                                        <span className="font-semibold text-base">{slot.label}</span>
                                        <span className="text-xs opacity-75">{slot.displayLabel}</span>
                                      </div>
                                    </Button>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Selected Summary Display */}
                        {selectedDays.length > 0 && (
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Selected recurring reminder:</p>
                            <p className="font-medium">
                              {selectedDays.map(dayId =>
                                daysOfWeek.find(d => d.id === dayId)?.full
                              ).join(", ")} at {
                                multiDayHour === 0 ? "12" : multiDayHour === 12 ? "12" : multiDayHour > 12 ? `${multiDayHour - 12}` : `${multiDayHour}`
                              }:{multiDayMinute.toString().padStart(2, '0')} {multiDayHour >= 12 ? "PM" : "AM"}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Regular Calendar/Time picker */
                      <CalendarSchedule
                        selectedDateTime={selectedDateTime}
                        onDateTimeChange={handleDateTimeChange}
                      />
                    )}
                  </FormControl>
                  {/* Show validation errors */}
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                  {isMultiDay && selectedDays.length === 0 && (
                    <p className="text-sm text-amber-600">
                      Please select at least one day for your recurring reminder
                    </p>
                  )}
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

            {/* Hidden context field — value set programmatically if needed */}
            <input type="hidden" {...form.register("context")} />

            {/* Compact icon-button row for Voice / Photo / Quotes */}
            {!isSimplifiedInterface && (
              <>
                <div className="flex gap-2">
                  {/* Voice */}
                  <button
                    type="button"
                    onClick={() => setVoiceCharacterOpen(v => !v)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all ${voiceCharacterOpen ? 'border-[#C9A063] bg-[#C9A063] text-white' : 'border-[#C9A063] bg-white text-[#111827] hover:bg-[#FDF8F0]'}`}
                  >
                    <Volume2 className={`h-5 w-5 ${voiceCharacterOpen ? 'text-white' : 'text-[#B8900A]'}`} />
                    <span>Voice</span>
                  </button>

                  {/* Photo */}
                  {!isFeatureDisabled('MEDIA_ATTACHMENTS') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (attachmentsOpen) { setAttachmentsOpen(false); }
                        else { gateAttachments(() => setAttachmentsOpen(true)); }
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all relative ${attachmentsOpen ? 'border-[#C9A063] bg-[#C9A063] text-white' : 'border-[#C9A063] bg-white text-[#111827] hover:bg-[#FDF8F0]'}`}
                    >
                      <Camera className={`h-5 w-5 ${attachmentsOpen ? 'text-white' : 'text-[#B8900A]'}`} />
                      <span>Photo{selectedAttachments.length > 0 ? ` (${selectedAttachments.length})` : ''}</span>
                      {!hasProAccess && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 text-amber-500" />}
                    </button>
                  )}

                  {/* Quotes */}
                  {!isFeatureDisabled('MOTIVATIONAL_QUOTES') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (motivationalOpen) { setMotivationalOpen(false); }
                        else { gateQuotes(() => setMotivationalOpen(true)); }
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all relative ${motivationalOpen ? 'border-[#C9A063] bg-[#C9A063] text-white' : 'border-[#C9A063] bg-white text-[#111827] hover:bg-[#FDF8F0]'}`}
                    >
                      <Quote className={`h-5 w-5 ${motivationalOpen ? 'text-white' : 'text-[#B8900A]'}`} />
                      <span className="truncate max-w-full px-1 text-center leading-tight">
                        {selectedCategory
                          ? (motivationCategories.find(c => c.id === selectedCategory)?.name ?? 'Quotes').split(' ')[0]
                          : 'Quotes'}
                      </span>
                      {!hasProAccess && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 text-amber-500" />}
                    </button>
                  )}
                </div>

                {/* Voice panel */}
                {voiceCharacterOpen && (
                  <div className="space-y-2 p-3 border rounded-xl bg-gray-50">
                    <Select
                      value={form.watch("voiceCharacter")}
                      onValueChange={(value) => {
                        const character = voiceCharacters.find((v: any) => v.id === value);
                        if (character?.premium && !hasProAccess) {
                          setLocation('/subscribe');
                        } else {
                          form.setValue("voiceCharacter", value);
                          setSelectedVoice(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full text-sm h-9 border-[#C9A063] text-[#111827]">
                        <SelectValue placeholder="Select voice">
                          {voiceCharacters.find((v: any) => v.id === form.watch("voiceCharacter"))?.name || "Select voice"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {voiceCharacters.map((character: any) => {
                          const isLocked = character.premium && !hasProAccess;
                          const isSelected = form.watch("voiceCharacter") === character.id;
                          return (
                            <SelectItem key={character.id} value={character.id}>
                              <span className="flex items-center gap-2">
                                <span className="w-4 text-center text-xs">
                                  {isLocked ? '🔒' : isSelected ? '✓' : ''}
                                </span>
                                <span>{character.name}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="w-full text-xs h-8" onClick={testVoice}>
                      <TestTube className="mr-2 h-3.5 w-3.5" />
                      Test {voiceCharacters.find((v: any) => v.id === form.watch("voiceCharacter"))?.name || "Voice"}
                    </Button>
                  </div>
                )}

                {/* Photo panel */}
                {attachmentsOpen && (
                  <div className="space-y-2 p-3 border rounded-xl bg-gray-50">
                    {isMobileWithCamera ? (
                      <MobileCamera
                        onPhotoCaptured={(photoUrl) => {
                          const maxAttachments = isFreePlan ? 1 : 5;
                          setSelectedAttachments(prev => [...prev, photoUrl].slice(0, maxAttachments));
                        }}
                        maxFiles={isFreePlan ? 1 : 5}
                        currentCount={selectedAttachments.length}
                        onGatedAction={(action) => { gateAttachments(action); }}
                      />
                    ) : (
                      <>
                        <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                        <Button type="button" variant="outline" className="w-full text-xs h-8" onClick={handlePhotoAttachment} disabled={isFreePlan && selectedAttachments.length >= 1}>
                          <Camera className="mr-2 h-3.5 w-3.5" />
                          Add Photos ({selectedAttachments.length}/{isFreePlan ? 1 : 5})
                        </Button>
                      </>
                    )}
                    {selectedAttachments.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedAttachments.map((attachment, index) => (
                          <div key={index} className="relative">
                            <img src={attachment} alt={`Attachment ${index + 1}`} className="w-full h-20 object-cover rounded-md" />
                            <button type="button" onClick={() => removeAttachment(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quotes panel */}
                {motivationalOpen && (
                  <div className="space-y-2 p-3 border rounded-xl bg-gray-50">
                    <Select value={selectedCategory} onValueChange={handleCategorySelection}>
                      <SelectTrigger className="w-full text-xs h-9 text-[#111827] data-[placeholder]:text-[#111827]">
                        <SelectValue placeholder="Choose your motivation" />
                      </SelectTrigger>
                      <SelectContent>
                        {motivationCategories.map((category) => {
                          const IconComponent = category.icon;
                          return (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-4 w-4 text-rude-red-600" />
                                <div>
                                  <div className="font-medium">{category.name}</div>
                                  <div className="text-xs text-muted-foreground">{category.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {attachmentsModal}
            {quotesModal}

            {/* Quick Reminder Settings - Show only when today is selected */}
            {!isMultiDay && scheduledForValue && (
              (() => {
                const scheduledDate = new Date(scheduledForValue);
                const now = new Date();
                const isToday = scheduledDate.toDateString() === now.toDateString();

                if (isToday) {
                  return (
                    <Collapsible open={quickReminderOpen} onOpenChange={setQuickReminderOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-medium rounded-lg px-4 py-3 bg-[#C9A063] text-white border-[#B8904F] hover:bg-[#BF944F] hover:text-white"
                        >
                          <span className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            Quick Reminder
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${quickReminderOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-4 bg-[#E5E7EB] rounded-lg border border-[#D1D5DB]">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { seconds: 10, shortLabel: "10s" },
                            { minutes: 5, shortLabel: "5m" },
                            { minutes: 15, shortLabel: "15m" },
                            { minutes: 30, shortLabel: "30m" }
                          ].map(({ seconds, minutes, shortLabel }) => (
                            <Button
                              key={shortLabel}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex items-center justify-center p-2 h-10 bg-[#B8904F] hover:bg-[#A8803F] border-[#A8803F] hover:border-[#98703F] text-[#111827] font-semibold text-sm rounded-lg"
                              onClick={async () => {
                                const currentMessage = form.watch("originalMessage");
                                if (!currentMessage || currentMessage.trim() === "") {
                                  toast({
                                    title: "Message Required",
                                    description: "Please enter what you need to be reminded about first",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                const newTime = new Date();
                                if (seconds) {
                                  newTime.setSeconds(newTime.getSeconds() + seconds);
                                } else if (minutes) {
                                  newTime.setMinutes(newTime.getMinutes() + minutes);
                                }
                                const formattedDateTime = newTime.toISOString();
                                form.setValue("scheduledFor", formattedDateTime);

                                const quickReminderData = {
                                  originalMessage: currentMessage,
                                  context: form.watch("context") || "",
                                  scheduledFor: formattedDateTime,
                                  rudenessLevel: form.watch("rudenessLevel"),
                                  voiceCharacter: selectedVoice,
                                  attachments: selectedAttachments,
                                  motivationalQuote: selectedCategory ? (await generateQuoteForSubmission(selectedCategory)) || undefined : undefined,
                                  selectedDays: [],
                                  isMultiDay: false,
                                  browserNotification: (userNotificationSettings as any)?.browserNotifications ?? true,
                                  voiceNotification: (userNotificationSettings as any)?.voiceNotifications ?? false,
                                  emailNotification: (userNotificationSettings as any)?.emailNotifications ?? false,
                                };

                                createReminderMutation.mutate(quickReminderData);

                                toast({
                                  title: "Quick Reminder Created",
                                  description: `Reminder set for ${format(newTime, "h:mm a")} (${shortLabel} from now)`,
                                });
                              }}
                            >
                              {shortLabel}
                            </Button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                }
                return null;
              })()
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 text-lg"
              disabled={
                createReminderMutation.isPending ||
                (isMultiDay && selectedDays.length === 0) ||
                (!isMultiDay && !form.watch("scheduledFor"))
              }
            >
              {createReminderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Reminder...
                </>
              ) : isMultiDay ? (
                selectedDays.length > 0
                  ? `Create Recurring Reminder (${selectedDays.length} days)`
                  : "Select Days to Continue"
              ) : (
                "Create Reminder"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}