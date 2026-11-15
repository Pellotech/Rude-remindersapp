import { useState, useEffect, useRef } from "react";
import { toZoned, zonedNow, formValueToInstant } from "@/lib/timeZone";
import { ReemCarryAnimation } from "@/components/ReemCarryAnimation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getFullApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { RudenessSlider } from "./RudenessSlider";
import { Card, CardContent } from "@/components/ui/card";
import { BookDatePicker } from "./BookDatePicker";
import { format } from "date-fns";
import { getPlatformInfo, supportsCamera } from "@/utils/platformDetection";
import { useAuth } from "@/hooks/useAuth";
import { usePaywallGate } from "@/components/PaywallGate";
import RoseSpinner from "@/components/RoseSpinner";
// The pieces of this screen live in ./reminder-form/
import { formSchema, QUICK_TIMES, getFreeReminderCount, type ReminderFormData as FormData } from "./reminder-form/schema";
import { reminderExtras, fetchMotivationalQuote } from "./reminder-form/payload";
import { useReminderAttachments } from "./reminder-form/useReminderAttachments";
import { useCreateReminder } from "./reminder-form/useCreateReminder";
import { ScheduleSummary } from "./reminder-form/ScheduleSummary";
import { FeatureTabs } from "./reminder-form/FeatureTabs";
import { FreeLimitModal } from "./reminder-form/FreeLimitModal";
import { QuickReminder } from "./reminder-form/QuickReminder";

// ─────────────────────────────────────────────────────────────────────────────
// The Create Reminder card on Home. This file puts the pieces together:
//   message box → book date picker → (rudeness slider) → summary bar →
//   Voice / Photo / Quotes → Create Reminder button → Quick Reminder.
// Saving, photos, quotes and each section are in ./reminder-form/.
// ─────────────────────────────────────────────────────────────────────────────

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
  /** When provided, the page owns the rudeness level: the in-form slider is hidden and the form follows this value. */
  externalRudenessLevel?: number;
}


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
  externalRudenessLevel,
}: ReminderFormProps = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [todayIsSelected, setTodayIsSelected] = useState(false);
  const [scheduleValid, setScheduleValid] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Detect if we're on mobile platform
  const platformInfo = getPlatformInfo();
  const isMobileWithCamera = platformInfo.isNative && supportsCamera();

  // Photos attached to this reminder
  const attachments = useReminderAttachments({ isFreePlan, hasProAccess, gateAttachments });
  const { selectedAttachments, setSelectedAttachments } = attachments;

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

  // When the page owns the slider, keep the form's rudeness in sync with it
  useEffect(() => {
    if (externalRudenessLevel != null) {
      form.setValue("rudenessLevel", externalRudenessLevel);
    }
  }, [externalRudenessLevel, form]);

  // Update form defaults when user settings change
  useEffect(() => {
    if (userNotificationSettings) {
      const userData = userNotificationSettings as any;
      const defaultRudeness = userData?.defaultRudenessLevel || parseInt(localStorage.getItem('default_rudeness_level') || '2');
      const defaultVoice = userData?.defaultVoiceCharacter || "default";

      // Update form values with user's saved preferences
      // (skip rudeness when the page owns the slider — the page handles settings sync)
      if (externalRudenessLevel == null) {
        form.setValue("rudenessLevel", defaultRudeness);
      }
      form.setValue("voiceCharacter", defaultVoice);
      setSelectedVoice(defaultVoice);
    }
  }, [userNotificationSettings, form]);

  // Live-sync form rudeness when default changes from settings page
  useEffect(() => {
    if (externalRudenessLevel != null) return; // page owns the slider
    const handler = (e: Event) => {
      form.setValue("rudenessLevel", (e as CustomEvent).detail);
    };
    window.addEventListener('default_rudeness_changed', handler);
    return () => window.removeEventListener('default_rudeness_changed', handler);
  }, [form, externalRudenessLevel]);

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


  // Reem carries the Create Reminder button away after each new reminder
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [carryRect, setCarryRect] = useState<DOMRect | null>(null);

  const createReminderMutation = useCreateReminder({
    isFreePlan,
    getAttachments: () => selectedAttachments,
    onReminderCreated,
    startCarry: () => {
    const btn = createButtonRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      const onScreen = r.width > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
      if (onScreen) {
        setCarryRect(r);
      } else if (r.width > 0) {
        // e.g. scrolled down in Quick Reminder — bring the button into view, then play
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
          if (createButtonRef.current) setCarryRect(createButtonRef.current.getBoundingClientRect());
        }, 500);
      }
    }
    },
    onSaved: () => {
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
    setScheduleValid(false);
    },
  });

  // Handle category selection - gated behind premium
  const handleCategorySelection = (categoryId: string) => {
    console.log('[FeatureGate] handleCategorySelection tapped, hasProAccess:', hasProAccess);
    gateQuotes(() => {
      console.log('[FeatureGate] Quote gate PASSED, selecting category:', categoryId);
      setSelectedCategory(categoryId);
    });
  };

  const onSubmit = async (data: FormData) => {
    if (isFreePlan && getFreeReminderCount() >= 30) {
      setShowLimitModal(true);
      return;
    }

    const isMultiDay = form.getValues("isMultiDay");
    const scheduledForRaw = form.getValues("scheduledFor");
    const scheduledDateTime = scheduledForRaw
      ? formValueToInstant(scheduledForRaw).toISOString()
      : undefined;

    // Generate quote if category is selected
    let finalMotivationalQuote = "";
    if (selectedCategory) {
      try {
        // Generate quote based on selected category
        const generatedQuote = await fetchMotivationalQuote(selectedCategory, userSettings);
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
      // Apply user's notification preferences from settings (+ time zone)
      ...reminderExtras(userNotificationSettings),
    };

    console.log('Submitting reminder data:', submissionData);
    createReminderMutation.mutate(submissionData);
  };

  // Quick Reminder: make a reminder for N seconds/minutes from now, no date needed
  const handleQuickReminder = async ({ seconds, minutes, shortLabel }: (typeof QUICK_TIMES)[number]) => {
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
      motivationalQuote: selectedCategory ? (await fetchMotivationalQuote(selectedCategory, userSettings)) || undefined : undefined,
      selectedDays: [],
      isMultiDay: false,
      ...reminderExtras(userNotificationSettings),
    };

    createReminderMutation.mutate(quickReminderData);

    toast({
      title: "Quick Reminder Created",
      description: `Reminder set for ${format(newTime, "h:mm a")} (${shortLabel} from now)`,
    });
  };

  return (
    <Card className="mt-4 bg-white border-2 border-reem-cream rounded-[24px] shadow-[var(--rr-card-shadow)] dark:bg-transparent dark:border-transparent dark:shadow-none">
      <CardContent className="pt-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Message Field */}
            <FormField
              control={form.control}
              name="originalMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-white">What do you need to be reminded about?</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="✏️ Write your reminder here..."
                      className="bg-reem-cream border-2 border-reem-gold focus:border-[#EF4444] focus-visible:ring-0 focus-visible:border-[#EF4444] rounded-[14px] h-[50px] py-3 text-reem-ink placeholder:text-reem-ink/50"
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
                        format(toZoned(result.scheduledFor), "yyyy-MM-dd'T'HH:mm")
                      );
                    } else {
                      form.setValue("scheduledFor", "");
                    }
                    form.setValue("isMultiDay", result.isMultiDay);
                    form.setValue("selectedDays", result.selectedDays);
                    // Detect if today is selected (with or without a time chosen yet)
                    const todayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][zonedNow().getDay()];
                    if (result.scheduledFor) {
                      const d = toZoned(result.scheduledFor);
                      setTodayIsSelected(d.toDateString() === zonedNow().toDateString());
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

            {/* Rudeness Level Slider — standalone component, movable anywhere.
                Hidden when the page renders its own slider (externalRudenessLevel provided). */}
            {externalRudenessLevel == null && (
              <FormField
                control={form.control}
                name="rudenessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RudenessSlider
                        value={field.value}
                        onChange={(newLevel) => {
                          field.onChange(newLevel);
                          onRudenessChange?.(newLevel);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Summary bubble — sits below Rudeness Level */}
            {scheduleValid && (
              <ScheduleSummary
                form={form}
                selectedVoice={selectedVoice}
                voiceCharacters={voiceCharacters as any[]}
                attachmentsCount={selectedAttachments.length}
                selectedCategory={selectedCategory}
              />
            )}

            {/* Hidden context field — value set programmatically if needed */}
            <input type="hidden" {...form.register("context")} />

            {/* Voice / Photo / Quotes unified tab section */}
            {!isSimplifiedInterface && (
              <FeatureTabs
                form={form}
                voiceCharacters={voiceCharacters as any[]}
                setSelectedVoice={setSelectedVoice}
                hasProAccess={hasProAccess}
                isFreePlan={isFreePlan}
                isMobileWithCamera={isMobileWithCamera}
                gateAttachments={gateAttachments}
                gateQuotes={gateQuotes}
                attachments={attachments}
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelection}
                onVoiceTap={onVoiceTap}
                onPhotoTap={onPhotoTap}
                onQuotesTap={onQuotesTap}
              />
            )}

            {attachmentsModal}
            {quotesModal}

            {/* Free reminder limit modal */}
            {showLimitModal && (
              <FreeLimitModal
                onClose={() => setShowLimitModal(false)}
                onUpgrade={() => { setShowLimitModal(false); setLocation('/subscribe'); }}
              />
            )}

            {carryRect && <ReemCarryAnimation rect={carryRect} onDone={() => setCarryRect(null)} />}

            {/* Submit Button */}
            <Button
              ref={createButtonRef}
              type="submit"
              className="w-full bg-reem-navy hover:bg-[#152347] border-2 border-[#F5B942] text-white font-semibold py-8 px-6 text-lg disabled:opacity-100 disabled:cursor-default"
              style={{
                // Hidden while Reem "has" it, then pops back in
                opacity: carryRect ? 0 : 1,
                transform: carryRect ? 'scale(0.9)' : 'scale(1)',
                transition: carryRect ? 'none' : 'opacity 0.35s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              disabled={createReminderMutation.isPending || !scheduleValid || !!carryRect}
            >
              {createReminderMutation.isPending ? (
                <>
                  <RoseSpinner size={20} className="mr-2" />
                  Creating Reminder...
                </>
              ) : (
                "Create Reminder"
              )}
            </Button>

            {/* Quick Reminder — always available (fires from right now, no date needed) */}
            <QuickReminder onPick={handleQuickReminder} />

          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
