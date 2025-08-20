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
import { PlusCircle, Pencil, Bell, Volume2, Mail, TestTube, User, Bot, Crown, Heart, Zap, Camera, Quote, ImageIcon, Video, ChevronDown, Settings, Calendar, Clock } from "lucide-react";
import { CalendarSchedule } from "./CalendarSchedule";
import { format } from "date-fns";
import { QuotesService } from "@/services/quotesService";
import { CulturalQuotesService } from "@/services/culturalQuotesService";
import { MobileCamera } from "./MobileCamera";
import { getPlatformInfo, supportsCamera } from "@/utils/platformDetection";
import { useAuth } from "@/hooks/useAuth";

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
  voiceCharacter: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  motivationalQuote: z.string().optional(),
  selectedDays: z.array(z.string()).optional(),
  isMultiDay: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

const rudenessLabels = [
  { level: 1, emoji: "😊", label: "Gentle" },
  { level: 2, emoji: "🙂", label: "Firm" },
  { level: 3, emoji: "😏", label: "Sarcastic" },
  { level: 4, emoji: "😠", label: "Harsh" },
  { level: 5, emoji: "🤬", label: "Savage" },
];

// Voice character icon mapping
const getVoiceIcon = (id: string) => {
  const iconMap: Record<string, any> = {
    "default": User,
    "drill-sergeant": Zap,
    "robot": Bot,
    "british-butler": Crown,
    "mom": Heart,
    "motivational-coach": Zap,
    "wise-teacher": User,
    "confident-leader": Crown,
    "calm-narrator": Heart,
    "energetic-trainer": Zap
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

export default function ReminderForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get user settings for simplified interface
  const { data: userSettings } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });
  
  const isSimplifiedInterface = (userSettings as any)?.simplifiedInterface || false;
  const [previewMessage, setPreviewMessage] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("default");
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [selectedMotivation, setSelectedMotivation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  
  // Collapsible states for advanced sections
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [voiceCharacterOpen, setVoiceCharacterOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [motivationalOpen, setMotivationalOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);

  
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
      scheduledFor: "",
      rudenessLevel: 3,
      browserNotification: true,
      voiceNotification: false,
      emailNotification: false,
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

  // Fetch voice characters from backend
  const { data: voiceCharacters = [], isLoading: voicesLoading } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: async () => {
      const response = await fetch("/api/voices");
      if (!response.ok) throw new Error("Failed to fetch voices");
      return response.json();
    }
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
    // Fallback to Web Speech API
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        utterance.onstart = () => {
          toast({
            title: "Voice Test (Browser Speech)",
            description: "Playing voice sample using browser speech",
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
          return URL.createObjectURL(file);
        });
        setSelectedAttachments(prev => [...prev, ...newAttachments].slice(0, 5));
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

  // Multi-day selection helper functions
  const daysOfWeek = [
    { id: "monday", label: "Mon", full: "Monday" },
    { id: "tuesday", label: "Tue", full: "Tuesday" },
    { id: "wednesday", label: "Wed", full: "Wednesday" },
    { id: "thursday", label: "Thu", full: "Thursday" },
    { id: "friday", label: "Fri", full: "Friday" },
    { id: "saturday", label: "Sat", full: "Saturday" },
    { id: "sunday", label: "Sun", full: "Sunday" },
  ];

  const toggleDay = (dayId: string) => {
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



  const getRandomQuote = (category: string) => {
    // Check if user has cultural preferences enabled
    const userData = userSettings as any;
    if (userData?.ethnicitySpecificQuotes && userData?.ethnicity) {
      const culturalQuote = CulturalQuotesService.getPersonalizedQuote(
        userData.ethnicity,
        true,
        userData.gender,
        userData.genderSpecificReminders
      );
      if (culturalQuote) {
        setSelectedMotivation(culturalQuote);
        toast({
          title: "Cultural Motivation Added",
          description: "Personalized quote based on your cultural background!",
        });
        return;
      }
    }
    
    // Fallback to general quotes
    const quote = QuotesService.getRandomQuote(category);
    if (quote) {
      const formattedQuote = QuotesService.formatQuote(quote);
      setSelectedMotivation(formattedQuote);
      toast({
        title: "Motivation Added",
        description: `Quote from ${quote.author} selected!`,
      });
    } else {
      toast({
        title: "No quotes found",
        description: "Please try a different category",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: FormData) => {
    let scheduledDateTime;
    
    if (isMultiDay) {
      // For multi-day reminders, create a date with the selected hour and minute
      // Use tomorrow as base date for multi-day scheduling
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(multiDayHour, multiDayMinute, 0, 0);
      scheduledDateTime = tomorrow.toISOString();
    } else {
      scheduledDateTime = data.scheduledFor;
    }

    // Include all the new features in the submission
    const submissionData = {
      ...data,
      scheduledFor: scheduledDateTime,
      voiceCharacter: selectedVoice,
      attachments: selectedAttachments,
      motivationalQuote: selectedMotivation,
      selectedDays: isMultiDay ? selectedDays : [],
      isMultiDay: isMultiDay
    };
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <PlusCircle className="text-rude-red-600 mr-3" />
            Create New Reminder
          </div>
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
              render={() => (
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
                      /* Multi-Day Selection Grid */
                      <div className="space-y-3 p-4 border rounded-lg bg-red-50">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">Select Days of Week</span>
                          {selectedDays.length > 0 && (
                            <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                              {selectedDays.length} days selected
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-2">
                          {daysOfWeek.map((day) => (
                            <Button
                              key={day.id}
                              type="button"
                              variant={selectedDays.includes(day.id) ? "default" : "outline"}
                              size="sm"
                              className={`text-xs h-12 ${
                                selectedDays.includes(day.id) 
                                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600" 
                                  : "hover:bg-red-100 border-gray-300"
                              }`}
                              onClick={() => toggleDay(day.id)}
                            >
                              <div className="flex flex-col items-center">
                                <span className="font-semibold">{day.label}</span>
                              </div>
                            </Button>
                          ))}
                        </div>

                        {/* Time Selection for Multi-Day */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-800">Set Time</span>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {/* Hour Selection - Scrollable */}
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Hour:</span>
                              <div className="relative">
                                <div className="w-16 h-10 border border-gray-300 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                                    style={{ scrollbarWidth: 'thin' }}
                                  >
                                    <div className="py-1">
                                      {Array.from({ length: 24 }, (_, i) => (
                                        <div
                                          key={i}
                                          className={`px-3 py-1 text-sm cursor-pointer hover:bg-red-50 text-center ${
                                            multiDayHour === i ? 'bg-red-100 text-red-800 font-medium' : 'text-gray-700'
                                          }`}
                                          onClick={() => setMultiDayHour(i)}
                                        >
                                          {i.toString().padStart(2, '0')}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Minute Selection - Scrollable */}
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Min:</span>
                              <div className="relative">
                                <div className="w-16 h-10 border border-gray-300 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                                    style={{ scrollbarWidth: 'thin' }}
                                  >
                                    <div className="py-1">
                                      {[0, 15, 30, 45].map((minute) => (
                                        <div
                                          key={minute}
                                          className={`px-3 py-1 text-sm cursor-pointer hover:bg-red-50 text-center ${
                                            multiDayMinute === minute ? 'bg-red-100 text-red-800 font-medium' : 'text-gray-700'
                                          }`}
                                          onClick={() => setMultiDayMinute(minute)}
                                        >
                                          {minute.toString().padStart(2, '0')}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Time Display */}
                            <div className="text-sm font-medium text-red-800">
                              {multiDayHour.toString().padStart(2, '0')}:{multiDayMinute.toString().padStart(2, '0')}
                            </div>
                          </div>
                        </div>

                        {selectedDays.length > 0 && (
                          <>
                            <p className="text-xs text-red-600 mt-2">
                              Selected: {selectedDays.map(dayId => 
                                daysOfWeek.find(d => d.id === dayId)?.full
                              ).join(", ")} at {multiDayHour.toString().padStart(2, '0')}:{multiDayMinute.toString().padStart(2, '0')}
                            </p>
                            <div className="bg-red-100 p-3 rounded-md mt-3">
                              <p className="text-sm font-medium text-red-800">Multi-Day Summary:</p>
                              <p className="text-xs text-red-700 mt-1">
                                Your reminder will be sent on <strong>{selectedDays.map(dayId => 
                                  daysOfWeek.find(d => d.id === dayId)?.full
                                ).join(", ")}</strong> at <strong>{multiDayHour.toString().padStart(2, '0')}:{multiDayMinute.toString().padStart(2, '0')}</strong> with <strong>different responses</strong> for each day to keep it fresh!
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Regular Calendar/Time Picker */
                      <CalendarSchedule
                        selectedDateTime={selectedDateTime}
                        onDateTimeChange={handleDateTimeChange}
                      />
                    )}
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

            {/* Show advanced sections only if not simplified interface */}
            {!isSimplifiedInterface && (
              <>
                {/* Quick Settings */}
                <Collapsible open={quickSettingsOpen} onOpenChange={setQuickSettingsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      type="button"
                    >
                      <div className="flex items-center">
                        <Settings className="mr-2 h-4 w-4 text-rude-red-600" />
                        Quick Settings
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${quickSettingsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Quickly adjust common reminder settings</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className="p-3 border rounded-lg hover:bg-gray-100 bg-white cursor-pointer text-center text-sm font-medium"
                        onClick={() => form.setValue("rudenessLevel", 1)}
                      >
                        😊 Be Nice
                      </div>
                      <div 
                        className="p-3 border rounded-lg hover:bg-gray-100 bg-white cursor-pointer text-center text-sm font-medium"
                        onClick={() => form.setValue("rudenessLevel", 5)}
                      >
                        🤬 Be Savage
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Notification Options */}
                <Collapsible open={notificationOpen} onOpenChange={setNotificationOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      type="button"
                    >
                      <div className="flex items-center">
                        <Bell className="mr-2 h-4 w-4 text-rude-red-600" />
                        Notification Options
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${notificationOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">Choose how you want to be notified</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="browserNotification"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-100 bg-white">
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
                          <FormItem className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-100 bg-white">
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
                          <FormItem className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-100 bg-white">
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
                  </CollapsibleContent>
                </Collapsible>

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
                              {voiceCharacters.map((character: any) => {
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
                          setSelectedAttachments(prev => [...prev, photoUrl].slice(0, 5));
                        }}
                        maxFiles={5}
                        currentCount={selectedAttachments.length}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handlePhotoAttachment}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Add Photos/Videos ({selectedAttachments.length}/5)
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
                    <p className="text-sm text-muted-foreground">Get inspired by quotes from historical figures and champions</p>
                    
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose motivation category" />
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
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => getRandomQuote(selectedCategory)}
                      >
                        <Quote className="mr-2 h-4 w-4" />
                        Get Random Quote
                      </Button>
                    )}

                    {selectedMotivation && (
                      <div className="p-4 bg-white rounded-lg border-l-4 border-rude-red-600">
                        <p className="text-sm italic">"{selectedMotivation}"</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMotivation("")}
                          className="mt-2 h-auto p-1 text-xs"
                        >
                          Remove quote
                        </Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 text-lg"
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
