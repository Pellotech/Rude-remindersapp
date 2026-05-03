import { useState, useEffect, useRef } from "react";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import rudeRemindersLogo from '@assets/translusant_logo2_1767108484844.png';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useLocation } from "wouter";
import { apiRequest, getFullApiUrl, getAuthToken } from "@/lib/queryClient";
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
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Volume2, Mail, TestTube, User, Bot, Crown, Heart, Zap, Camera, Quote, ImageIcon, Video, ChevronDown, Calendar, Clock, Briefcase, Users, Dumbbell, Brain, GraduationCap, ChefHat, Home, DollarSign, Gamepad2, Lock } from "lucide-react";
import { BookDatePicker } from "./BookDatePicker";
import { format } from "date-fns";
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
  onReminderCreated?: () => void;
  onTitleChange?: (title: string) => void;
  onDateSelected?: (type: 'date_today' | 'date_tomorrow' | 'date_future') => void;
  onVoiceTap?: () => void;
  onPhotoTap?: () => void;
  onQuotesTap?: () => void;
  onRudenessChange?: (level: number) => void;
  onMultiDayToggle?: (on: boolean) => void;
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
  let result: SpeechSynthesisVoice | undefined;
  if (voiceType === 'british-male') {
    result = voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.lang.startsWith('en-GB') && (v.name.includes('Arthur') || v.name.includes('Oliver') || v.name.includes('Daniel'))) ||
      voices.find(v => v.lang.startsWith('en-GB')) ||
      voices.find(v => v.name.includes('Daniel') || v.name.includes('Arthur'));
  } else if (voiceType === 'male') {
    result = voices.find(v => v.name.toLowerCase().includes('male') || v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Aaron') || v.name.includes('Fred') || v.name.includes('Tom') || v.name.includes('Alex'));
  } else if (voiceType === 'female') {
    result = voices.find(v => v.name.includes('Google US English') && v.name.includes('Female')) ||
      voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.includes('Samantha') || v.name.includes('Victoria'));
  } else {
    result = voices.find(v => v.lang.includes('en'));
  }
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
  maxReminders = 5,
  onReminderCreated,
  onTitleChange,
  onDateSelected,
  onVoiceTap,
  onPhotoTap,
  onQuotesTap,
  onRudenessChange,
  onMultiDayToggle,
}: ReminderFormProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { scheduleReminder: scheduleNativeNotification, requestPermissions } = useMobileNotifications();

  const hasProAccess = !isFreePlan && user?.subscriptionPlan === 'premium';
  const { gate: gateAttachments, modal: attachmentsModal } = usePaywallGate('MEDIA_ATTACHMENTS', 'Media Attachments', hasProAccess, 'Attach a photo to your reminder — your gym bag, meal prep, a sticky note, anything that makes it real. A picture really is worth a thousand words of nagging. Upgrade to unlock photo attachments.');
  const { gate: gateQuotes, modal: quotesModal } = usePaywallGate('MOTIVATIONAL_QUOTES', 'Motivational Quotes', hasProAccess, 'Add a hand-picked motivational quote from history\'s greatest minds to each reminder. The right words at the right time can light a fire under you. Upgrade to unlock motivational quotes.');

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
  const previousRudenessRef = useRef<number>(3);

  // Collapsible states for advanced sections
  const [activeFeatureTab, setActiveFeatureTab] = useState<'voice' | 'photo' | 'quotes' | null>(null);
  const [lockedTooltip, setLockedTooltip] = useState<'photo' | 'quotes' | null>(null);
  const lockedTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLockedTooltip = (which: 'photo' | 'quotes') => {
    if (lockedTooltipTimerRef.current) clearTimeout(lockedTooltipTimerRef.current);
    setLockedTooltip(which);
    lockedTooltipTimerRef.current = setTimeout(() => setLockedTooltip(null), 2000);
  };
  const [quickReminderOpen, setQuickReminderOpen] = useState(false);
  const [todayIsSelected, setTodayIsSelected] = useState(false);

  const [scheduleValid, setScheduleValid] = useState(false);

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
      rudenessLevel: parseInt(localStorage.getItem('default_rudeness_level') || '2'),
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
      const defaultRudeness = userData?.defaultRudenessLevel || parseInt(localStorage.getItem('default_rudeness_level') || '2');
      const defaultVoice = userData?.defaultVoiceCharacter || "default";

      // Update form values with user's saved preferences
      form.setValue("rudenessLevel", defaultRudeness);
      form.setValue("voiceCharacter", defaultVoice);
      setSelectedVoice(defaultVoice);
    }
  }, [userNotificationSettings, form]);

  // Live-sync form rudeness when default changes from settings page
  useEffect(() => {
    const handler = (e: Event) => {
      form.setValue("rudenessLevel", (e as CustomEvent).detail);
    };
    window.addEventListener('default_rudeness_changed', handler);
    return () => window.removeEventListener('default_rudeness_changed', handler);
  }, [form]);

  // Live-sync voice character when default changes from settings page
  useEffect(() => {
    const handler = (e: Event) => {
      const newVoice = (e as CustomEvent).detail;
      form.setValue("voiceCharacter", newVoice);
      setSelectedVoice(newVoice);
    };
    window.addEventListener('default_voice_changed', handler);
    return () => window.removeEventListener('default_voice_changed', handler);
  }, [form]);

  const rudenessLevel = form.watch("rudenessLevel");
  const voiceCharacter = form.watch("voiceCharacter");

  const sliderColors: Record<number, string> = {
    1: '#38BDF8',
    2: '#22C55E',
    3: '#FDE047',
    4: '#F97316',
    5: '#b70d0d',
  };
  const currentSliderColor = sliderColors[rudenessLevel] || '#38BDF8';

  // Update selectedVoice when form voiceCharacter changes
  useEffect(() => {
    setSelectedVoice(voiceCharacter);
  }, [voiceCharacter]);

  const originalMessage = form.watch("originalMessage");
  const scheduledForValue = form.watch("scheduledFor");

  // Notify parent of title changes for Rudy widget reactions
  useEffect(() => {
    onTitleChange?.(originalMessage ?? "");
  }, [originalMessage, onTitleChange]);


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

  const [showLimitModal, setShowLimitModal] = useState(false);

  const FREE_REMINDER_STORAGE_KEY = 'rr_free_reminder_count';
  const getFreeReminderCount = () => {
    try { return parseInt(localStorage.getItem(FREE_REMINDER_STORAGE_KEY) || '0', 10); } catch { return 0; }
  };
  const incrementFreeReminderCount = () => {
    try { localStorage.setItem(FREE_REMINDER_STORAGE_KEY, String(getFreeReminderCount() + 1)); } catch {}
  };

  const createReminderMutation = useMutation({
    mutationFn: async (data: FormData) => {
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

      if (isFreePlan) {
        incrementFreeReminderCount();
      }

      console.log('Ad action counter incremented: reminder created');
      onReminderCreated?.();

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
      setScheduleValid(false);

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
        utterance.volume = 0.8;

        const selectedVoiceId = form.watch("voiceCharacter");
        const voiceTypeMap: Record<string, string> = {
          'default': 'female',
          'confident-leader': 'british-male',
          'british-butler': 'british-male',
          'karen-nag': 'female'
        };
        const voiceRateMap: Record<string, number> = {
          'default': 0.85,
          'confident-leader': 0.75,
          'british-butler': 0.55,
          'karen-nag': 0.95,
        };
        const voicePitchMap: Record<string, number> = {
          'default': 0.9,
          'confident-leader': 0.35,
          'british-butler': 0.35,
          'karen-nag': 1.3,
        };
        utterance.rate = voiceSettings?.rate ?? voiceRateMap[selectedVoiceId] ?? 0.85;
        utterance.pitch = voiceSettings?.pitch ?? voicePitchMap[selectedVoiceId] ?? 0.9;
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
    if (isFreePlan && getFreeReminderCount() >= 30) {
      setShowLimitModal(true);
      return;
    }

    const isMultiDay = form.getValues("isMultiDay");
    const scheduledForRaw = form.getValues("scheduledFor");
    const scheduledDateTime = scheduledForRaw
      ? new Date(scheduledForRaw).toISOString()
      : undefined;

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
      selectedDays: form.getValues("selectedDays") || [],
      isMultiDay: form.getValues("isMultiDay") || false,
      // Apply user's notification preferences from settings
      browserNotification: (userNotificationSettings as any)?.browserNotifications ?? true,
      voiceNotification: (userNotificationSettings as any)?.voiceNotifications ?? false,
      emailNotification: (userNotificationSettings as any)?.emailNotifications ?? false,
      clientLocalTime: new Date().toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      }),
    };

    console.log('Submitting reminder data:', submissionData);
    createReminderMutation.mutate(submissionData);
  };




  return (
    <Card className="mt-4 bg-white border-2 border-[#FDF3E3] rounded-[24px] shadow-[var(--rr-card-shadow)] ring-2 ring-[#C53B3B] ring-offset-2">
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
                      placeholder="✏️ Write your reminder here..."
                      className="bg-[#FDF3E3] border-2 border-[#C9A063] focus:border-[#EF4444] focus-visible:ring-0 focus-visible:border-[#EF4444] rounded-[14px] h-[50px] py-3 text-[#111827] placeholder:text-[#111827]/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Select Date Section */}
            <FormItem>
              <FormControl>
                <BookDatePicker
                  onScheduleChange={(result) => {
                    setScheduleValid(result.hasValidSchedule);
                    if (result.scheduledFor) {
                      form.setValue(
                        "scheduledFor",
                        format(new Date(result.scheduledFor), "yyyy-MM-dd'T'HH:mm")
                      );
                    } else {
                      form.setValue("scheduledFor", "");
                    }
                    form.setValue("isMultiDay", result.isMultiDay);
                    form.setValue("selectedDays", result.selectedDays);
                    // Detect if today is selected (with or without a time chosen yet)
                    const todayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
                    if (result.scheduledFor) {
                      const d = new Date(result.scheduledFor);
                      setTodayIsSelected(d.toDateString() === new Date().toDateString());
                    } else if (!result.isMultiDay && result.selectedDays.length > 0) {
                      setTodayIsSelected(result.selectedDays.includes(todayName));
                    } else {
                      setTodayIsSelected(false);
                    }
                  }}
                  onDateEventFired={onDateSelected}
                />
              </FormControl>
            </FormItem>

            {/* Rudeness Level Slider */}
            <div className="-mt-1" style={{ '--slider-color': currentSliderColor } as React.CSSProperties}>
            <FormField
              control={form.control}
              name="rudenessLevel"
              render={({ field }) => (
                <FormItem>
                  <div className="px-4 pt-3 pb-5 bg-[#FDF3E3] rounded-lg">
                    <p className="text-sm font-medium text-[#1A1A1A] mb-3">Rudeness Level</p>
                    <FormControl>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => {
                          const newLevel = value[0];
                          if (newLevel !== previousRudenessRef.current) {
                            previousRudenessRef.current = newLevel;
                            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                          }
                          field.onChange(newLevel);
                          onRudenessChange?.(newLevel);
                        }}
                        className="rudeness-slider"
                      />
                    </FormControl>

                    {/* Slider Labels */}
                    <div className="flex justify-between mt-3 text-xs text-[#1A1A1A]">
                      {rudenessLabels.map((item) => {
                        const isSelected = field.value === item.level;
                        return (
                          <div key={item.level} className="flex flex-col items-center transition-all">
                            <span className={`mb-1 transition-all duration-200 ${isSelected ? 'text-3xl' : 'text-lg'}`}>{item.emoji}</span>
                            <span className={isSelected ? 'font-bold' : ''}>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>


                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            {/* Summary bubble — sits below Rudeness Level */}
            {scheduleValid && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#FDF3E3] rounded-lg border border-[#C9A063]">
                {/* Left: time or day count */}
                <span className="text-sm font-medium text-[#111827]">
                  {form.watch("isMultiDay")
                    ? `${form.watch("selectedDays")?.length || 0} days selected`
                    : form.watch("scheduledFor")
                      ? format(new Date(form.watch("scheduledFor")), "EEE, MMM d • h:mm a")
                      : ""}
                </span>

                {/* Right: compact icon indicators */}
                <div className="flex items-center gap-2 text-[#C9A063]">
                  <span className="text-xs font-medium">🔔 Lv.{rudenessLevel}</span>

                  {selectedVoice && selectedVoice !== "default" && (
                    <span className="text-xs font-medium">
                      🎙️ {(voiceCharacters as any[]).find((v: any) => v.id === selectedVoice)?.name?.split(" ")[0] || "Voice"}
                    </span>
                  )}

                  {selectedAttachments.length > 0 && (
                    <span className="text-xs font-medium">📷 x{selectedAttachments.length}</span>
                  )}

                  {selectedCategory && (
                    <span className="text-xs">💬</span>
                  )}

                  {form.watch("isMultiDay") && (form.watch("selectedDays")?.length || 0) > 0 && (
                    <span className="text-xs font-medium">📅 x{form.watch("selectedDays")?.length}</span>
                  )}
                </div>
              </div>
            )}

            {/* Hidden context field — value set programmatically if needed */}
            <input type="hidden" {...form.register("context")} />

            {/* Voice / Photo / Quotes unified tab section */}
            {!isSimplifiedInterface && (
              <>
                {/* Tab bar */}
                <div className="relative">
                  {lockedTooltip && (
                    <div style={{
                      position: 'absolute',
                      bottom: '105%',
                      left: lockedTooltip === 'photo' ? '50%' : '83%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#1a1a1a',
                      color: 'white',
                      fontSize: '12px',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      whiteSpace: 'nowrap',
                      zIndex: 50,
                      pointerEvents: 'none',
                    }}>
                      🔒 Go Premium
                    </div>
                  )}
                <div className="flex rounded-xl overflow-hidden border border-[#C9A063]">
                  <button
                    type="button"
                    onClick={() => {
                        const opening = activeFeatureTab !== 'voice';
                        setActiveFeatureTab(opening ? 'voice' : null);
                        if (opening) onVoiceTap?.();
                      }}
                    className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-sm font-bold transition-all focus:outline-none ${
                      activeFeatureTab === 'voice' ? 'bg-[#A07840] text-[#1A1A1A]' : 'bg-[#C9A063] text-[#1A1A1A] hover:bg-[#B8904F]'
                    }`}
                  >
                    <Volume2 className="h-5 w-5" />
                    Voice
                    <span className={`h-1 w-5 rounded-full mt-0.5 transition-all duration-200 ${activeFeatureTab === 'voice' ? 'bg-[#1A1A1A]' : 'bg-transparent'}`} />
                  </button>

                  {!isFeatureDisabled('MEDIA_ATTACHMENTS') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasProAccess) { showLockedTooltip('photo'); return; }
                        if (activeFeatureTab === 'photo') { setActiveFeatureTab(null); }
                        else { gateAttachments(() => { setActiveFeatureTab('photo'); onPhotoTap?.(); }); }
                      }}
                      className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-sm font-bold border-l border-r border-[#B8904F] transition-all relative focus:outline-none ${
                        activeFeatureTab === 'photo' ? 'bg-[#A07840] text-[#1A1A1A]' : 'bg-[#C9A063] text-[#1A1A1A] hover:bg-[#B8904F]'
                      }`}
                    >
                      <Camera className="h-5 w-5" />
                      Photo{selectedAttachments.length > 0 ? ` (${selectedAttachments.length})` : ''}
                      {!hasProAccess && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 text-[#1A1A1A]/50" />}
                      <span className={`h-1 w-5 rounded-full mt-0.5 transition-all duration-200 ${activeFeatureTab === 'photo' ? 'bg-[#1A1A1A]' : 'bg-transparent'}`} />
                    </button>
                  )}

                  {!isFeatureDisabled('MOTIVATIONAL_QUOTES') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasProAccess) { showLockedTooltip('quotes'); return; }
                        if (activeFeatureTab === 'quotes') { setActiveFeatureTab(null); }
                        else { gateQuotes(() => { setActiveFeatureTab('quotes'); onQuotesTap?.(); }); }
                      }}
                      className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-sm font-bold transition-all relative focus:outline-none ${
                        activeFeatureTab === 'quotes' ? 'bg-[#A07840] text-[#1A1A1A]' : 'bg-[#C9A063] text-[#1A1A1A] hover:bg-[#B8904F]'
                      }`}
                    >
                      <Quote className="h-5 w-5" />
                      Quotes
                      {!hasProAccess && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 text-[#1A1A1A]/50" />}
                      <span className={`h-1 w-5 rounded-full mt-0.5 transition-all duration-200 ${activeFeatureTab === 'quotes' ? 'bg-[#1A1A1A]' : 'bg-transparent'}`} />
                    </button>
                  )}
                </div>
                </div>{/* end relative tooltip wrapper */}

                {/* Content panel — only shown when a tab is active */}
                {activeFeatureTab && (
                  <div className="mt-2 border border-[#C9A063] rounded-xl bg-white px-3 pt-3 pb-4 space-y-3">

                    {/* Voice panel */}
                    {activeFeatureTab === 'voice' && (
                      <div className="space-y-3">
                        <p className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wide">Voice Character</p>
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
                          <SelectTrigger className="w-full text-[14px] h-10 bg-[#F5EDE0] border-[#C9A063] rounded-lg text-[#1A1A1A]">
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
                                  <span className="flex items-center gap-2 text-[14px] text-[#1A1A1A]">
                                    <span className="w-4 text-center text-xs">{isLocked ? '🔒' : isSelected ? '✓' : ''}</span>
                                    <span>{character.name}</span>
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Photo panel */}
                    {activeFeatureTab === 'photo' && (
                      <div className="space-y-3">
                        <p className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
                          Add Photos ({selectedAttachments.length}/{isFreePlan ? 1 : 5})
                        </p>
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
                            <button
                              type="button"
                              onClick={handlePhotoAttachment}
                              disabled={isFreePlan && selectedAttachments.length >= 1}
                              className="w-full h-16 rounded-xl border-2 border-dashed border-[#C9A063] bg-[#F5EDE0] flex items-center justify-center gap-2 text-xs text-[#C9A063] font-medium hover:bg-[#EDE0CF] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              <Camera className="h-4 w-4" />
                              Tap to add photo
                            </button>
                          </>
                        )}
                        <div className="grid grid-cols-5 gap-1.5">
                          {selectedAttachments.map((attachment, index) => (
                            <div key={index} className="relative aspect-square">
                              <img src={attachment} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                              <button type="button" onClick={() => removeAttachment(index)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                            </div>
                          ))}
                          {Array.from({ length: (isFreePlan ? 1 : 5) - selectedAttachments.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square rounded-lg border border-dashed border-[#C9A063]/40 bg-[#F5EDE0]/50" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quotes panel */}
                    {activeFeatureTab === 'quotes' && (
                      <div className="space-y-3">
                        <p className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wide">Motivation Style</p>
                        <Select value={selectedCategory} onValueChange={handleCategorySelection}>
                          <SelectTrigger className="w-full text-[14px] h-10 bg-[#F5EDE0] border-[#C9A063] rounded-lg text-[#1A1A1A]">
                            <SelectValue placeholder="Choose a motivation style…" />
                          </SelectTrigger>
                          <SelectContent>
                            {motivationCategories.map((category) => {
                              const IconComponent = category.icon;
                              return (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center space-x-2 text-[14px] text-[#1A1A1A]">
                                    <IconComponent className="h-4 w-4" />
                                    <span>{category.name}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <p className="text-[12px] text-[#1A1A1A]">A motivational quote from your chosen category will be added to your reminder.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {attachmentsModal}
            {quotesModal}

            {/* Free reminder limit modal */}
            {showLimitModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLimitModal(false)}>
                <div className="bg-white rounded-[20px] p-6 mx-4 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                  <div className="text-center space-y-4">
                    <img src={rudeRemindersLogo} alt="Rude Reminders" className="w-16 h-16 mx-auto object-contain" />
                    <h2 className="text-xl font-bold text-[#111827]">Free Limit Reached</h2>
                    <p className="text-[#6B7280] text-sm">You've reached the free limit of 30 reminders. Upgrade to Premium for unlimited reminders and full access to all features.</p>
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => { setShowLimitModal(false); setLocation('/subscribe'); }}
                        className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white font-semibold rounded-[14px] h-[48px] flex items-center justify-center gap-2 transition-colors"
                      >
                        Upgrade to Premium
                      </button>
                      <button
                        onClick={() => setShowLimitModal(false)}
                        className="w-full text-[#6B7280] h-[44px] text-sm"
                      >
                        Maybe Later
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-[#1B2A5E] hover:bg-[#152347] border-2 border-[#F5B942] text-white font-semibold py-8 px-6 text-lg disabled:opacity-100 disabled:cursor-default"
              disabled={createReminderMutation.isPending || !scheduleValid}
            >
              {createReminderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Reminder...
                </>
              ) : (
                "Create Reminder"
              )}
            </Button>

            {/* Quick Reminder Settings - Show only when today is selected */}
            {!form.watch("isMultiDay") && todayIsSelected && (
                    <Collapsible open={quickReminderOpen} onOpenChange={setQuickReminderOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-medium rounded-lg px-4 py-3 bg-white text-[#1A1A1A] border border-[#C9A063] hover:bg-[#FDF3E3] hover:text-[#1A1A1A] focus-visible:ring-0 focus-visible:border-[#C9A063]"
                        >
                          <span className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            Quick Reminder
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${quickReminderOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-4 bg-[#FDF3E3] rounded-lg border border-[#FDF3E3]">
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
                              className="flex items-center justify-center p-2 h-10 bg-white hover:bg-[#FDF3E3] border border-[#C9A063] hover:border-[#B8904F] text-[#1A1A1A] font-semibold text-sm rounded-lg"
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
                                  clientLocalTime: new Date().toLocaleString('en-US', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                    hour: 'numeric', minute: '2-digit', hour12: true,
                                  }),
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
            )}

          </form>
        </Form>
      </CardContent>
    </Card>
  );
}