export interface HelpFAQ {
  question: string;
  answer: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  icon: string;
  keywords: string[];
  steps: string[];
  faqs: HelpFAQ[];
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  articles: HelpArticle[];
}

export const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "Rocket",
    description: "Learn the basics of Rude Reminders",
    articles: [
      {
        id: "guest-mode",
        title: "Start Using App (Guest)",
        icon: "User",
        keywords: ["guest", "start", "begin", "new"],
        steps: [
          "Open the app and tap 'Continue as Guest'",
          "You can create reminders immediately without an account",
          "Guest data is stored locally on your device only",
          "To sync across devices, create an account later"
        ],
        faqs: [
          { question: "Will I lose my reminders as a guest?", answer: "Guest reminders are stored locally. If you uninstall the app, they will be lost. Create an account to sync and backup." },
          { question: "Can I upgrade from guest to account?", answer: "Yes! Tap the profile icon and select 'Create Account' to keep all your existing reminders." }
        ]
      },
      {
        id: "create-account",
        title: "Creating an Account",
        icon: "UserPlus",
        keywords: ["account", "signup", "register", "login", "sync"],
        steps: [
          "Tap the profile icon in the top corner",
          "Choose 'Sign Up' or 'Log In'",
          "Use Apple, Google, Facebook, or email to register",
          "Your reminders will now sync across all your devices"
        ],
        faqs: [
          { question: "Which login method is best?", answer: "Apple Sign-In is fastest on iOS devices and keeps your email private. All methods work equally well." },
          { question: "Can I change my login method later?", answer: "Currently you'll need to create a new account with a different method. Your subscription transfers if using the same app store account." }
        ]
      },
      {
        id: "rudeness-levels",
        title: "What 'Rudeness Levels' Mean",
        icon: "Flame",
        keywords: ["rudeness", "level", "intensity", "rude", "mild", "spicy"],
        steps: [
          "Level 1: Gentle and encouraging",
          "Level 2: Friendly nudge with personality",
          "Level 3: Balanced motivation with attitude",
          "Level 4: Strong push with humor",
          "Level 5: Maximum sass and tough love"
        ],
        faqs: [
          { question: "What level should I start with?", answer: "Try Level 3 to get a feel for the app. Adjust up or down based on your motivation style." },
          { question: "Are higher levels offensive?", answer: "Higher levels use stronger humor and direct language, but never cross into truly offensive territory. It's motivational tough love!" }
        ]
      }
    ]
  },
  {
    id: "creating-reminder",
    title: "Creating a Reminder",
    icon: "Plus",
    description: "Set up reminders with full customization",
    articles: [
      {
        id: "set-time-date",
        title: "Set Time, Date & Multiple Days",
        icon: "Calendar",
        keywords: ["time", "date", "schedule", "when", "recurring", "multiple"],
        steps: [
          "Tap the date/time field to open the picker",
          "Select your desired date and time",
          "For recurring reminders, toggle 'Multi-Day' on",
          "Select which days of the week to repeat",
          "Reminders can be set up to one week in advance"
        ],
        faqs: [
          { question: "Can I set reminders for next month?", answer: "Currently reminders can be scheduled up to one week ahead. For longer planning, set a reminder to create another reminder!" },
          { question: "Do multi-day reminders send at the same time?", answer: "Yes, each selected day will trigger at the same time you set." }
        ]
      },
      {
        id: "rudeness-slider",
        title: "Using the Rudeness Slider",
        icon: "Sliders",
        keywords: ["slider", "rudeness", "adjust", "level"],
        steps: [
          "Drag the slider left for gentler reminders",
          "Drag right for more aggressive motivation",
          "The preview updates as you adjust",
          "Your default level can be set in Settings"
        ],
        faqs: [
          { question: "Why does my reminder sound different than the preview?", answer: "AI generates fresh content each time. The preview shows the style, but your actual reminder will be uniquely created." }
        ]
      },
      {
        id: "categories",
        title: "Categories (Work, Family & Friends)",
        icon: "Tag",
        keywords: ["category", "work", "family", "personal", "type"],
        steps: [
          "Categories help organize your reminders",
          "Choose from: Work, Family & Friends, Personal, Health, or Other",
          "The AI tailors the tone based on category",
          "Filter reminders by category in the Manage tab"
        ],
        faqs: [
          { question: "Do categories affect the reminder content?", answer: "Yes! A 'Work' reminder might reference deadlines, while 'Family' focuses on relationships." }
        ]
      },
      {
        id: "voice-characters",
        title: "Voice Characters",
        icon: "Mic",
        keywords: ["voice", "character", "sound", "speak", "audio"],
        steps: [
          "Tap 'Voice Character' to see options",
          "Choose from: Default, Drill Sergeant, Robot, British Butler, Mom, or Confident Leader",
          "Enable voice notifications in Settings",
          "When the reminder fires, it will be read aloud in that voice style"
        ],
        faqs: [
          { question: "Do I need premium for voice characters?", answer: "All voice characters are available to all users. Premium unlocks additional AI-powered features." },
          { question: "Why isn't the voice playing?", answer: "Check that 'Voice Notifications' is enabled in Settings and your device volume is up." }
        ]
      },
      {
        id: "media-attachments",
        title: "Media Attachments",
        icon: "Image",
        keywords: ["photo", "image", "attachment", "camera", "gallery", "ipad", "upload"],
        steps: [
          "Tap the camera icon to add photos",
          "Choose 'Take Photo' or 'Choose from Gallery'",
          "On iPad: Uses the native photo picker for stability",
          "Attachments appear in your reminder notification",
          "Tap any attachment to view full-size"
        ],
        faqs: [
          { question: "What file types are supported?", answer: "JPEG, PNG, HEIC, WebP, and GIF images are all supported." },
          { question: "iPad camera not working?", answer: "Some iPad models require camera permission in Settings. We recommend using 'Choose from Gallery' for best reliability." },
          { question: "Is there a size limit?", answer: "Yes, each file is limited to 10MB for optimal performance." }
        ]
      },
      {
        id: "motivational-quotes",
        title: "Motivational Quotes",
        icon: "Quote",
        keywords: ["quote", "motivation", "inspiration", "toggle"],
        steps: [
          "Toggle 'Include Motivational Quote' when creating a reminder",
          "Quotes are selected based on your preferences",
          "Premium users get AI-personalized quotes",
          "Quotes appear below your reminder message"
        ],
        faqs: [
          { question: "Can I choose specific quotes?", answer: "The app selects quotes that match your reminder context. You can set cultural preferences in Settings for relevant quotes." }
        ]
      }
    ]
  },
  {
    id: "manage-reminders",
    title: "Manage Reminders",
    icon: "ListTodo",
    description: "View, edit, and organize your reminders",
    articles: [
      {
        id: "reminder-status",
        title: "Active vs Overdue vs Completed",
        icon: "CircleCheck",
        keywords: ["active", "overdue", "completed", "status", "filter"],
        steps: [
          "Active: Reminders scheduled for the future",
          "Overdue: Past reminders not yet marked complete",
          "Completed: Reminders you've accomplished",
          "Use the tabs at the top to filter by status"
        ],
        faqs: [
          { question: "What happens to overdue reminders?", answer: "They stay in your list until you mark them as Completed or Not Accomplished." }
        ]
      },
      {
        id: "editing-reminders",
        title: "Editing Reminders",
        icon: "Pencil",
        keywords: ["edit", "change", "modify", "update"],
        steps: [
          "Go to Manage tab and find your reminder",
          "Tap the reminder card to expand it",
          "Tap 'Edit' to modify any field",
          "Save changes when done"
        ],
        faqs: [
          { question: "Can I edit a reminder after it fires?", answer: "Once a reminder has triggered, you can only mark it as Completed or Not Accomplished." }
        ]
      },
      {
        id: "marking-complete",
        title: "Mark Accomplished / Not Accomplished",
        icon: "Check",
        keywords: ["complete", "done", "accomplish", "finish", "failed"],
        steps: [
          "When a reminder fires, tap 'Mark as Complete'",
          "Or tap 'Not Accomplished' if you didn't complete it",
          "This helps track your completion rate",
          "You can also mark from the Manage tab"
        ],
        faqs: [
          { question: "Does marking affect future reminders?", answer: "Your completion history is tracked, but doesn't change how future reminders work." }
        ]
      },
      {
        id: "filters-search",
        title: "Filters & Search",
        icon: "Search",
        keywords: ["filter", "search", "find", "sort"],
        steps: [
          "Use the search bar to find reminders by title or content",
          "Filter by status using the tabs (Active, Overdue, Completed)",
          "Results update as you type",
          "Clear search to see all reminders again"
        ],
        faqs: [
          { question: "Can I filter by date?", answer: "Currently you can sort by status. Date filtering is coming in a future update!" }
        ]
      }
    ]
  },
  {
    id: "sharing",
    title: "Sharing",
    icon: "Share2",
    description: "Share your reminders with friends",
    articles: [
      {
        id: "how-sharing-works",
        title: "How Sharing Works",
        icon: "Send",
        keywords: ["share", "send", "export"],
        steps: [
          "Open any reminder from the Manage tab",
          "Tap the Share icon in the top-right",
          "A preview card is generated with your reminder",
          "Choose how to share: Messages, social media, save to photos"
        ],
        faqs: [
          { question: "What gets shared?", answer: "The share card includes: your title, the generated response, response variations, and any attached images." },
          { question: "Can others see my personal info?", answer: "No. Only the reminder content is shared, not your account details." }
        ]
      },
      {
        id: "share-card-preview",
        title: "Share Card Preview",
        icon: "CreditCard",
        keywords: ["preview", "card", "image"],
        steps: [
          "The preview shows exactly what will be shared",
          "Includes the Rude Reminders branding",
          "Images and attachments are included",
          "Tap 'Share Now' to open the share sheet"
        ],
        faqs: [
          { question: "Can I customize the share card?", answer: "The card automatically uses your reminder content. Custom styling is coming in a future update." }
        ]
      },
      {
        id: "share-troubleshooting",
        title: "Troubleshooting Share Issues",
        icon: "AlertCircle",
        keywords: ["problem", "issue", "blank", "not working"],
        steps: [
          "If share sheet is blank, wait a moment and try again",
          "Ensure all images are loaded before sharing",
          "On some devices, saving to Photos works better than direct share",
          "Check that you have permission to access Photos"
        ],
        faqs: [
          { question: "Share button not responding?", answer: "Close and reopen the reminder, then try again. If issues persist, restart the app." },
          { question: "Images missing from shared card?", answer: "Wait for 'Loading...' to finish before tapping Share Now. Large images may take longer to load." }
        ]
      }
    ]
  },
  {
    id: "billing",
    title: "Billing & Subscriptions",
    icon: "CreditCard",
    description: "Manage your subscription and payments",
    articles: [
      {
        id: "free-vs-premium",
        title: "Free vs Premium Features",
        icon: "Sparkles",
        keywords: ["free", "premium", "difference", "features", "upgrade"],
        steps: [
          "Free: 5 reminders per month, basic responses, standard quotes",
          "Premium: Unlimited reminders, AI-powered responses, personalized quotes",
          "Premium: Multiple response variations to choose from",
          "Premium: Priority support and early access to new features"
        ],
        faqs: [
          { question: "What happens when I hit the free limit?", answer: "You'll be prompted to upgrade or wait until the next month when your limit resets." },
          { question: "Can I try premium before paying?", answer: "New users may be eligible for a free trial. Check the Upgrade tab for current offers." }
        ]
      },
      {
        id: "upgrade",
        title: "How to Upgrade",
        icon: "ArrowUpCircle",
        keywords: ["upgrade", "subscribe", "buy", "purchase"],
        steps: [
          "Go to the Upgrade tab in the bottom navigation",
          "Review the premium features and pricing",
          "Tap 'Subscribe' and confirm with Face ID/Touch ID",
          "Your premium status activates immediately"
        ],
        faqs: [
          { question: "Which payment methods work?", answer: "We use Apple/Google Pay through the app stores. All cards linked to your app store account work." }
        ]
      },
      {
        id: "restore-purchases",
        title: "Restore Purchases",
        icon: "RefreshCw",
        keywords: ["restore", "recover", "lost", "purchase"],
        steps: [
          "Go to Settings (tap profile icon)",
          "Scroll to 'Subscription' section",
          "Tap 'Restore Purchases'",
          "Your subscription will be verified and restored"
        ],
        faqs: [
          { question: "Restore not working?", answer: "Make sure you're signed into the same Apple/Google account used for the original purchase." },
          { question: "Changed phones and lost premium?", answer: "Just restore purchases on your new device while signed into the same app store account." }
        ]
      },
      {
        id: "manage-subscription",
        title: "Manage Your Subscription",
        icon: "Settings",
        keywords: ["cancel", "manage", "subscription", "settings"],
        steps: [
          "On iPhone: Settings → Apple ID → Subscriptions → Rude Reminders",
          "On Android: Play Store → Menu → Subscriptions → Rude Reminders",
          "Here you can change plans or cancel",
          "Cancellation takes effect at end of billing period"
        ],
        faqs: [
          { question: "Will I get a refund if I cancel?", answer: "Subscriptions are non-refundable, but you keep access until the end of your paid period. Contact App Store/Play Store support for billing issues." },
          { question: "What happens to my reminders if I cancel?", answer: "All your reminders remain. You'll just return to the free tier limits." }
        ]
      }
    ]
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "Wrench",
    description: "Fix common issues",
    articles: [
      {
        id: "notifications-not-showing",
        title: "Notifications Not Showing",
        icon: "BellOff",
        keywords: ["notification", "alert", "not working", "missing"],
        steps: [
          "Check iPhone Settings → Notifications → Rude Reminders → Allow Notifications ON",
          "Ensure 'Do Not Disturb' and 'Focus' modes allow our app",
          "In the app, go to Settings and verify notifications are enabled",
          "Try creating a test reminder 1 minute from now"
        ],
        faqs: [
          { question: "Notifications work sometimes but not always?", answer: "Check Focus modes and Low Power mode, which can delay or block notifications." },
          { question: "Notification sound not playing?", answer: "Check your device volume and that notifications aren't set to silent mode." }
        ]
      },
      {
        id: "subscription-not-updating",
        title: "Subscription Status Not Updating",
        icon: "CreditCard",
        keywords: ["subscription", "premium", "not working", "stuck"],
        steps: [
          "Force close the app and reopen",
          "Go to Settings → Restore Purchases",
          "Check your internet connection",
          "Wait 5-10 minutes; sometimes servers sync slowly"
        ],
        faqs: [
          { question: "I was charged but still showing free?", answer: "Try Restore Purchases. If still not working, email us with your receipt and we'll fix it within 24 hours." }
        ]
      },
      {
        id: "media-upload-issues",
        title: "Media Upload Issues",
        icon: "ImageOff",
        keywords: ["upload", "photo", "image", "failed", "error"],
        steps: [
          "Check that photos are under 10MB in size",
          "Try a different image format (JPEG works best)",
          "On iPad, use 'Choose from Gallery' instead of camera",
          "Check internet connection for cloud-synced photos"
        ],
        faqs: [
          { question: "Photos from iCloud not loading?", answer: "iCloud photos need to download first. Open the photo in Photos app, wait for it to load, then try again." }
        ]
      },
      {
        id: "app-stuck",
        title: "App Feels Stuck / Refresh Steps",
        icon: "RefreshCcw",
        keywords: ["stuck", "frozen", "slow", "refresh", "reset"],
        steps: [
          "Pull down on any screen to refresh data",
          "Force close: swipe up from bottom, swipe app away",
          "Reopen the app fresh",
          "If still stuck, try signing out and back in"
        ],
        faqs: [
          { question: "Will signing out delete my reminders?", answer: "No. Your reminders are saved to your account and will return when you sign back in." },
          { question: "Should I reinstall the app?", answer: "Only as a last resort. Your account data is safe, but guest data may be lost." }
        ]
      }
    ]
  }
];

export function searchHelp(query: string): HelpArticle[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];
  
  const results: HelpArticle[] = [];
  
  for (const category of helpCategories) {
    for (const article of category.articles) {
      const matchesTitle = article.title.toLowerCase().includes(lowerQuery);
      const matchesKeywords = article.keywords.some(k => k.includes(lowerQuery));
      const matchesSteps = article.steps.some(s => s.toLowerCase().includes(lowerQuery));
      
      if (matchesTitle || matchesKeywords || matchesSteps) {
        results.push(article);
      }
    }
  }
  
  return results;
}
