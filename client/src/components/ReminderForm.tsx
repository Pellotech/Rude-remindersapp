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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Pencil, Bell, Volume2, Mail, TestTube, User, Bot, Crown, Heart, Zap, Camera, Quote, ImageIcon, Video, ChevronDown, Calendar, Clock, Briefcase, Users, Dumbbell, Brain, GraduationCap, ChefHat, Home, DollarSign, Gamepad2 } from "lucide-react";
import { CalendarSchedule } from "./CalendarSchedule";
import { format, isSameDay } from "date-fns";
import { QuotesService } from "@/services/quotesService";
import { CulturalQuotesService } from "@/services/culturalQuotesService";
import { MobileCamera } from "./MobileCamera";
import { getPlatformInfo, supportsCamera } from "@/utils/platformDetection";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

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
  { level: 2, emoji: "🙂", label: "Firm" },
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

// Voice character icon mapping
const getVoiceIcon = (id: string) => {
  const iconMap: Record<string, any> = {
    "default": User,
    "drill-sergeant": Zap,
    "robot": Bot,
    "british-butler": Crown,
    "mom": Heart,
    "confident-leader": Crown
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
  const { user } = useAuth();

  // Get user settings for simplified interface
  const { data: userSettings } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  // Get user notification preferences from settings
  const { data: userNotificationSettings } = useQuery({
    queryKey: ["/api/settings"],
    enabled: !!user,
  });

  const isSimplifiedInterface = (userSettings as any)?.simplifiedInterface || false;
  const [previewMessage, setPreviewMessage] = useState("");

  // Fetch voice characters from backend
  const { data: voiceCharacters = [], isLoading: voicesLoading } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: async () => {
      const response = await fetch("/api/voices");
      if (!response.ok) throw new Error("Failed to fetch voices");
      return response.json();
    }
  });

  // Voice character state - randomly select initial voice
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const randomIndex = Math.floor(Math.random() * voiceCharacters.length);
    return voiceCharacters[randomIndex]?.id || "default";
  });
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedContextCategory, setSelectedContextCategory] = useState("");

  // Collapsible states for advanced sections
  const [voiceCharacterOpen, setVoiceCharacterOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [motivationalOpen, setMotivationalOpen] = useState(false);


  // Multi-day selection state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [multiDayHour, setMultiDayHour] = useState(9); // Default 9 AM
  const [multiDayMinute, setMultiDayMinute] = useState(0); // Default :00

  // Detect if we're on mobile platform
  const platformInfo = getPlatformInfo();
  const isMobileWithCamera = platformInfo.isNative && supportsCamera();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originalMessage: "",
      context: "",
      scheduledFor: "",
      rudenessLevel: (userNotificationSettings as any)?.defaultRudenessLevel || 3,
      voiceCharacter: "default",
      attachments: [],
      motivationalQuote: "",
      selectedDays: [],
      isMultiDay: false,
    },
  });

  const rudenessLevel = form.watch("rudenessLevel");
  const originalMessage = form.watch("originalMessage");

  // Convert form's scheduledFor string to Date for calendar component
  const scheduledForValue = form.watch("scheduledFor");
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
      const submissionData = {
        ...data,
        title: data.originalMessage, // Use the original message as the title
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : undefined,
      };

      const response = await apiRequest("POST", "/api/reminders", submissionData);
      return response.json();
    },
    onSuccess: (result) => {
      // Handle both single reminder and multi-day reminder responses
      const isMultiDayResult = result.count && result.reminders;

      toast({
        title: "Success!",
        description: isMultiDayResult
          ? `Created ${result.count} recurring reminders with AI responses and motivational quotes!`
          : `Your reminder has been created ${result.motivationalQuote ? 'with motivational quote ' : ''}and AI response generated automatically!`,
      });

      form.reset();

      // Reset all custom state variables
      const randomIndex = Math.floor(Math.random() * voiceCharacters.length);
      setSelectedVoice(voiceCharacters[randomIndex]?.id || "default");
      setSelectedAttachments([]);
      setSelectedCategory("");
      setSelectedContextCategory("");
      setSelectedDays([]);
      setIsMultiDay(false);
      setMultiDayHour(9);
      setMultiDayMinute(0);

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

  const testVoice = async () => {
    const selectedVoiceId = form.watch("voiceCharacter");
    const character = voiceCharacters.find((v: any) => v.id === selectedVoiceId) || voiceCharacters[0];
    if (!character) return;

    const message = previewMessage || character.testMessage;

    // Audio playback doesn't require microphone permissions

    try {
      const response = await fetch("/api/voices/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voiceCharacter: selectedVoiceId,
          testMessage: message,
        }),
      });

      if (response.ok) {
        const { audioUrl } = await response.json();
        if (audioUrl) {
          const audio = new Audio(audioUrl);

          // Enhanced error handling for audio playback
          audio.addEventListener('canplaythrough', () => {
            audio.play().then(() => {
              toast({
                title: "Voice Test",
                description: `Playing ${character.name} voice sample`,
              });
            }).catch((playError) => {
              console.error("Audio play error:", playError);
              // Try fallback
              useFallbackSpeech(message);
            });
          });

          audio.addEventListener('error', (audioError) => {
            console.error("Audio loading error:", audioError);
            useFallbackSpeech(message);
          });

          // Load the audio
          audio.load();
        } else {
          useFallbackSpeech(message);
        }
      } else {
        console.warn("Voice API failed, using fallback speech");
        useFallbackSpeech(message);
      }
    } catch (error) {
      console.error("Voice test error:", error);
      useFallbackSpeech(message);
    }
  };

  const useFallbackSpeech = (message: string) => {
    // Use browser speech with backend voice settings
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();

        // Fetch voice settings from backend for the selected character
        fetch('/api/voices/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceCharacter: form.watch("voiceCharacter"), // Use form.watch here
            testMessage: message
          })
        })
        .then(response => response.json())
        .then(data => {
          const utterance = new SpeechSynthesisUtterance(message);
          const currentVoiceId = form.watch("voiceCharacter"); // Define currentVoiceId here

          if (data.voiceSettings) {
            utterance.rate = data.voiceSettings.rate;
            utterance.pitch = data.voiceSettings.pitch;
            utterance.volume = 0.8;

            const voices = speechSynthesis.getVoices();
            let selectedVoice = null;

            // Map voice types from backend to browser voices
            switch (data.voiceSettings.voiceType) {
              case 'male':
              case 'upbeat-male':
                selectedVoice = voices.find(voice =>
                  voice.name.includes('Male') ||
                  voice.name.includes('David') ||
                  voice.name.includes('Daniel')
                );
                break;
              case 'british-male':
                selectedVoice = voices.find(voice =>
                  voice.lang.includes('en-GB') ||
                  voice.name.includes('British') ||
                  voice.name.includes('Oliver')
                );
                break;
              case 'female':
                selectedVoice = voices.find(voice =>
                  voice.name.includes('Female') ||
                  voice.name.includes('Samantha') ||
                  voice.name.includes('Victoria')
                );
                break;
              case 'robotic':
                selectedVoice = voices.find(voice =>
                  voice.name.includes('Microsoft') ||
                  voice.name.includes('Computer')
                );
                break;
            }

            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          } else {
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
          }

          utterance.onstart = () => {
            toast({
              title: "Voice Test",
              description: `Playing ${voiceCharacters.find((v: any) => v.id === currentVoiceId)?.name || 'voice'} sample`,
            });
          };

          utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            toast({
              title: "Voice Test Failed",
              description: "Unable to play voice. Check your browser's audio settings.",
              variant: "destructive",
            });
          };

          speechSynthesis.speak(utterance);
        })
        .catch(error => {
          console.error("Backend voice settings error:", error);
          // Pure fallback
          const utterance = new SpeechSynthesisUtterance(message);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;

          utterance.onstart = () => {
            toast({
              title: "Voice Test",
              description: "Playing voice sample",
            });
          };

          utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            toast({
              title: "Voice Test Failed",
              description: "Unable to play voice. Check your browser's audio settings.",
              variant: "destructive",
            });
          };

          speechSynthesis.speak(utterance);
        });

      } catch (speechError) {
        console.error("Speech synthesis error:", speechError);
        toast({
          title: "Voice Test Failed",
          description: "Voice playback is not available in your browser.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Voice Test Not Available",
        description: "Voice playback is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  // Photo attachment simulation (for web demo)
  const handlePhotoAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const newAttachments = Array.from(files).map(file => {
          const objectUrl = URL.createObjectURL(file);
          console.log(`Created object URL for ${file.name}:`, objectUrl);
          return objectUrl;
        });
        setSelectedAttachments(prev => {
          const updated = [...prev, ...newAttachments].slice(0, isFreePlan ? 1 : 5);
          console.log('Updated attachments array:', updated);
          return updated;
        });
        toast({
          title: "Media Added",
          description: `Added ${files.length} file(s) to your reminder`,
        });
      }
    };
    input.click();
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments(prev => prev.filter((_, i) => i !== index));
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
      // Make API call to get quote for the specific category
      const response = await fetch(`/api/quotes/${category}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Handle category selection without auto-generating quotes
  const handleCategorySelection = (categoryId: string) => {
    setSelectedCategory(categoryId);
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
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="flex items-center text-lg font-semibold p-0 h-auto hover:bg-transparent hover:text-blue-600"
            onClick={() => {
              // Scroll to the submit button to focus user's attention on creating the reminder
              const submitButton = document.querySelector('button[type="submit"]');
              if (submitButton) {
                submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a subtle highlight effect
                submitButton.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                setTimeout(() => {
                  submitButton.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                }, 2000);
              }
            }}
          >
            <PlusCircle className="text-rude-red-600 mr-3" />
            Create New Reminder
          </Button>
          {isSimplifiedInterface && (
            <span className="text-sm text-muted-foreground bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-md">
              Simplified Mode
            </span>
          )}
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
                        className="border-2 border-blue-500 focus:border-blue-600"
                        {...field}
                      />
                      <Pencil className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    </div>
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
                    <FormLabel>{isMultiDay ? "Set time for all selected days" : "When should we remind you?"}</FormLabel>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Multiple Days</span>
                      <Switch
                        checked={isMultiDay}
                        onCheckedChange={handleMultiDayToggle}
                      />
                    </div>
                  </div>

                  <FormControl>
                    {isMultiDay ? (
                      /* Multi-Day Selection - Card Layout like Single Day */
                      <div className="space-y-4">
                        {/* Days Selection Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Select Days</CardTitle>
                            <p className="text-sm text-muted-foreground">Choose which days of the week to repeat</p>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                              {daysOfWeek.map((day) => {
                                const isSelected = selectedDays.includes(day.id);
                                return (
                                  <div key={day.id} className="text-center flex-shrink-0 min-w-[70px]">
                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                      {day.label}
                                    </div>
                                    <Button
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleDayToggle(day.id)}
                                      className={cn(
                                        "w-full h-12 flex flex-col items-center justify-center p-1",
                                        day.isToday && !isSelected && "border-primary text-primary",
                                        isSelected && "bg-primary text-primary-foreground"
                                      )}
                                    >
                                      <span className="text-lg font-semibold">{day.short}</span>
                                      {day.isToday && (
                                        <span className="text-xs">Today</span>
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
                            <CardHeader>
                              <CardTitle className="text-lg">Select Time</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Choose a time for your recurring reminders
                              </p>
                            </CardHeader>
                            <CardContent>
                              {/* Hour Selection */}
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                {Array.from({ length: 24 }, (_, i) => {
                                  const hour = i; // Start from 0 (12 AM) and go to 23 (11 PM)
                                  const isSelected = multiDayHour === hour;
                                  const display = hour === 0 ? "12:00 AM" : hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;

                                  return (
                                    <Button
                                      key={hour}
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                      size="lg"
                                      onClick={() => setMultiDayHour(hour)}
                                      className={cn(
                                        "h-10 text-sm whitespace-nowrap flex-shrink-0 min-w-[80px]",
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
                            <CardHeader>
                              <CardTitle className="text-lg">Select Minutes</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Choose exact time for {
                                  multiDayHour === 0 ? "12 AM" : 
                                  multiDayHour === 12 ? "12 PM" : 
                                  multiDayHour > 12 ? `${multiDayHour - 12} PM` : `${multiDayHour} AM`
                                }
                              </p>
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                                      size="lg"
                                      onClick={() => setMultiDayMinute(slot.value)}
                                      className={cn(
                                        "h-16 text-sm whitespace-nowrap flex-shrink-0 min-w-[120px]",
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

            {/* Context Categories for Better AI Responses */}
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <span>What type of reminder is this?</span>
                    <span className="text-xs text-muted-foreground ml-2">(Optional - helps AI give better responses)</span>
                  </FormLabel>

                  {/* Quick Context Categories - Horizontal Scrolling */}
                  <div className="space-y-2">
                    <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide">
                      {contextCategories.map((category) => {
                        const IconComponent = category.icon;
                        const isSelected = selectedContextCategory === category.id;
                        return (
                          <Button
                            key={category.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleContextCategorySelect(category)}
                            className={cn(
                              "flex-shrink-0 h-auto py-2 px-3 text-xs font-medium transition-all",
                              isSelected
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "hover:bg-blue-50 hover:border-blue-300"
                            )}
                          >
                            <IconComponent className="w-4 h-4 mr-2" />
                            <span className="whitespace-nowrap">{category.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                    {selectedContextCategory && (
                      <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Selected: {contextCategories.find(c => c.id === selectedContextCategory)?.description}
                      </p>
                    )}
                  </div>

                  {/* Hidden input to store the selected context */}
                  <FormControl>
                    <input type="hidden" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show advanced sections only if not simplified interface */}
            {!isSimplifiedInterface && (
              <>

                


                {/* Voice Characters */}
                <Collapsible open={voiceCharacterOpen} onOpenChange={setVoiceCharacterOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      type="button"
                    >
                      <div className="flex items-center">
                        <Volume2 className="mr-2 h-4 w-4 text-rude-red-600" />
                        Voice Characters
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${voiceCharacterOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Choose who will deliver your rude reminders</p>
                    <FormField
                      control={form.control}
                      name="voiceCharacter"
                      render={({ field }) => (
                        <FormItem>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a voice character" />
                            </SelectTrigger>
                            <SelectContent>
                              {voiceCharacters.slice(0, isFreePlan ? 3 : 10).map((character: any) => {
                                const IconComponent = getVoiceIcon(character.id);
                                return (
                                  <SelectItem key={character.id} value={character.id}>
                                    <div className="flex items-center space-x-2">
                                      <IconComponent className="h-4 w-4 text-rude-red-600" />
                                      <div>
                                        <div className="font-medium">{character.name}</div>
                                        <div className="text-xs text-muted-foreground">{character.personality}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                              {isFreePlan && voiceCharacters.length > 3 && (
                                <div className="px-2 py-1 text-xs text-amber-600 bg-amber-50 rounded">
                                  {voiceCharacters.length - 3} more voices available with Premium
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={testVoice}
                    >
                      <TestTube className="mr-2 h-4 w-4" />
                      Test {voiceCharacters.find((v: any) => v.id === form.watch("voiceCharacter"))?.name || "Voice"}
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

                {/* Media Attachments */}
                <Collapsible open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      type="button"
                    >
                      <div className="flex items-center">
                        <Camera className="mr-2 h-4 w-4 text-rude-red-600" />
                        Media Attachments
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${attachmentsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Add photos or videos to make your reminder more memorable</p>

                    {isMobileWithCamera ? (
                      <MobileCamera
                        onPhotoCaptured={(photoUrl) => {
                          const maxAttachments = isFreePlan ? 1 : 5;
                          setSelectedAttachments(prev => [...prev, photoUrl].slice(0, maxAttachments));
                        }}
                        maxFiles={isFreePlan ? 1 : 5}
                        currentCount={selectedAttachments.length}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handlePhotoAttachment}
                        disabled={isFreePlan && selectedAttachments.length >= 1}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Add Photos/Videos ({selectedAttachments.length}/{isFreePlan ? 1 : 5})
                        {isFreePlan && selectedAttachments.length >= 1 && (
                          <span className="ml-2 text-xs text-amber-600">(Upgrade for more)</span>
                        )}
                      </Button>
                    )}

                    {selectedAttachments.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedAttachments.map((attachment, index) => (
                          <div key={index} className="relative">
                            <img
                              src={attachment}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-20 object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Motivational Quotes */}
                <Collapsible open={motivationalOpen} onOpenChange={setMotivationalOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      type="button"
                    >
                      <div className="flex items-center">
                        <Quote className="mr-2 h-4 w-4 text-rude-red-600" />
                        Motivational Quotes
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${motivationalOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Get inspired by quotes from historical figures and champions (Auto-generated if category selected)</p>

                    <Select value={selectedCategory} onValueChange={handleCategorySelection}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose motivation category (optional - generated on submit)" />
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



                    {selectedCategory && (
                      <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-blue-700">
                          📝 <strong>{motivationCategories.find(c => c.id === selectedCategory)?.name}</strong> category selected
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          A motivational quote will be generated when you submit the reminder
                        </p>
                      </div>
                    )}


                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Quick Reminder Settings - Show when not in multi-day mode and today or future date selected */}
            {!isMultiDay && scheduledForValue && (
              (() => {
                const scheduledDate = new Date(scheduledForValue);
                const now = new Date();
                const isToday = scheduledDate.toDateString() === now.toDateString();
                const isFuture = scheduledDate > now;
                
                // Show if it's today OR if it's a future date within the next 24 hours
                if (isToday || (isFuture && scheduledDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000)) {
                  return (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        Quick Reminder Settings
                      </h3>
                      <p className="text-sm text-blue-700 mb-3">
                        {isToday ? "Set a reminder for later today:" : "Quick time adjustments:"}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { minutes: 5, label: "5 minutes" },
                          { minutes: 15, label: "15 minutes" },
                          { minutes: 30, label: "30 minutes" }
                        ].map(({ minutes, label }) => (
                          <Button
                            key={minutes}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex flex-col items-center p-2 h-12 bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-300"
                            onClick={() => {
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
                              newTime.setMinutes(newTime.getMinutes() + minutes);
                              const formattedDateTime = format(newTime, "yyyy-MM-dd'T'HH:mm");
                              form.setValue("scheduledFor", formattedDateTime);
                              toast({
                                title: "Quick Reminder Set",
                                description: `Reminder set for ${format(newTime, "h:mm a")} (${label} from now)`,
                              });
                            }}
                          >
                            <span className="text-sm font-semibold text-blue-600">+{minutes}m</span>
                            <span className="text-xs text-gray-600">{label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}

            {/* Notification Settings Info */}
            <div className="text-center text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg">
              <p>Notifications will use your preferences from Settings → Notifications</p>
              <Button
                type="button"
                variant="link"
                className="text-blue-600 hover:text-blue-800 p-0 h-auto text-sm"
                onClick={() => window.location.href = '/settings/notifications'}
              >
                Change notification settings
              </Button>
            </div>

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
                  Generating AI Response & Quote...
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