// Create Reminder form: the form rules (what counts as a valid reminder) and
// the fixed lists the form uses.
import { z } from "zod";
import { Zap, Crown, Bot, User, Heart } from "lucide-react";
import { formValueToInstant } from "@/lib/timeZone";

export const formSchema = z.object({
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
    const scheduledDate = formValueToInstant(data.scheduledFor);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000); // Allow as short as 1 minute
    return scheduledDate >= oneMinuteFromNow && scheduledDate <= oneWeekFromNow;
  }
}, {
  message: "Please select a valid schedule: either a specific date/time or multiple days (minimum 1 minute from now)",
  path: ["scheduledFor"], // This will show the error on the scheduling field
});


export type ReminderFormData = z.infer<typeof formSchema>;

// Historical figures and motivation categories (the Quotes tab)
export const motivationCategories = [
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

/** The Quick Reminder buttons: fire this long from right now. */
export const QUICK_TIMES: { seconds?: number; minutes?: number; shortLabel: string }[] = [
  { seconds: 10, shortLabel: "10s" },
  { minutes: 5, shortLabel: "5m" },
  { minutes: 15, shortLabel: "15m" },
  { minutes: 30, shortLabel: "30m" },
];

// Local count of reminders made on a free plan (the real limit is on the server)
const FREE_REMINDER_STORAGE_KEY = 'rr_free_reminder_count';
export const getFreeReminderCount = () => {
  try { return parseInt(localStorage.getItem(FREE_REMINDER_STORAGE_KEY) || '0', 10); } catch { return 0; }
};
export const incrementFreeReminderCount = () => {
  try { localStorage.setItem(FREE_REMINDER_STORAGE_KEY, String(getFreeReminderCount() + 1)); } catch {}
};
