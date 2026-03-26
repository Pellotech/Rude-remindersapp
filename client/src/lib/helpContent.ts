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
          "Tap the Sign In button in the top right corner",
          "Choose Apple, Google, Facebook, or email to register",
          "Your reminders will now sync across all your devices",
          "Logged-in users get the full premium interface automatically"
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
        keywords: ["rudeness", "level", "intensity", "rude", "mild", "spicy", "emoji", "smiley", "slider"],
        steps: [
          "Level 1 😊 Gentle: Encouraging and supportive",
          "Level 2 🙂 Motivational: Friendly nudge with personality",
          "Level 3 😏 Sarcastic: Balanced motivation with attitude",
          "Level 4 😠 Harsh: Strong push with humor",
          "Level 5 🤬 Savage: Maximum sass and tough love",
          "Drag the slider in the cream-coloured box to adjust your level"
        ],
        faqs: [
          { question: "What level should I start with?", answer: "Try Level 3 to get a feel for the app. Adjust up or down based on your motivation style." },
          { question: "Are higher levels offensive?", answer: "Higher levels use stronger humor and direct language, but never cross into truly offensive territory. It's motivational tough love!" }
        ]
      },
      {
        id: "motivational-popup",
        title: "Habit Building Popup",
        icon: "Sparkles",
        keywords: ["popup", "habit", "66 days", "motivational", "modal", "tip"],
        steps: [
          "A motivational message appears automatically every 2 days on app open",
          "Each message focuses on habit-building science (it takes ~66 days to form a habit)",
          "Messages cycle through 5 different tips automatically",
          "Tap 'Let's get it 💥' to dismiss",
          "If a reminder notification is showing, the popup waits until you dismiss it first",
          "To preview a popup anytime: add ?showPopup=1 to the app URL"
        ],
        faqs: [
          { question: "How often does the popup show?", answer: "Once every 2 days when you open the app. It never interrupts an active reminder notification." },
          { question: "Can I turn it off?", answer: "Just dismiss it each time — it only appears every 2 days so it's never intrusive." }
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
        title: "Single Day: Pick Date & Time",
        icon: "Calendar",
        keywords: ["time", "date", "schedule", "when", "single", "day", "hour", "minute", "calendar"],
        steps: [
          "In the Create tab, scroll to the date picker",
          "Tap a date button (cream background, turns red when selected)",
          "Scroll the hour row to pick your hour — same color scheme",
          "Scroll the minute row to pick :00, :15, :30, or :45",
          "The summary bubble below the Create button shows your full schedule"
        ],
        faqs: [
          { question: "Can I set reminders for next month?", answer: "Currently reminders can be scheduled up to one week ahead. For longer planning, set a reminder to create another reminder!" },
          { question: "Why are some date buttons greyed out?", answer: "Past dates and times are disabled — you can only schedule reminders for the future." }
        ]
      },
      {
        id: "multiple-days",
        title: "Multiple Days (Recurring)",
        icon: "CalendarDays",
        keywords: ["recurring", "multiple", "days", "repeat", "weekly", "multi-day", "toggle"],
        steps: [
          "Toggle 'Multiple Days' on below the message input",
          "The toggle turns gold when active; its track turns cream when off",
          "Select which days of the week to repeat (buttons turn red when selected)",
          "Scroll the hour row to pick your time",
          "Pick your minute: :00, :15, :30, or :45",
          "The summary shows all selected days and time"
        ],
        faqs: [
          { question: "Do all selected days trigger at the same time?", answer: "Yes, each selected day will fire at the same time you set." },
          { question: "Can I pick different times for different days?", answer: "Not yet — all recurring days share one time. Set separate reminders if you need different times." }
        ]
      },
      {
        id: "quick-reminders",
        title: "Quick Reminder Buttons",
        icon: "Zap",
        keywords: ["quick", "10s", "5m", "15m", "30m", "fast", "shortcut"],
        steps: [
          "Type your reminder message first",
          "Scroll down to the 'Quick Reminder' section and tap to expand",
          "Tap +10s, +5m, +15m, or +30m to create a reminder that fires in that time",
          "All your current settings (rudeness, voice, attachments, quotes) are applied",
          "A full AI-generated message is created — no extra steps needed"
        ],
        faqs: [
          { question: "Does +10s really work in 10 seconds?", answer: "Yes! It's great for testing. Real use cases: +5m for a quick task you're about to start." },
          { question: "Is quick reminder different from the main form?", answer: "It uses all your form settings — rudeness level, voice character, attachments — but fires at a fixed offset from now." }
        ]
      },
      {
        id: "rudeness-slider",
        title: "Using the Rudeness Slider",
        icon: "Sliders",
        keywords: ["slider", "rudeness", "adjust", "level"],
        steps: [
          "The rudeness slider sits in the cream-coloured section with emoji labels",
          "Drag left for gentler (😊 Gentle) or right for more aggressive (🤬 Savage)",
          "The emoji row shows: Gentle · Motivational · Sarcastic · Harsh · Savage",
          "Your default level can be saved in Settings"
        ],
        faqs: [
          { question: "Why does my reminder sound different than the preview?", answer: "AI generates fresh content each time. The preview shows the style, but your actual reminder will be uniquely created." }
        ]
      },
      {
        id: "voice-characters",
        title: "Voice Characters",
        icon: "Mic",
        keywords: ["voice", "character", "sound", "speak", "audio", "scarlett", "will", "gerald", "karen"],
        steps: [
          "Scarlett — free for all users, warm US female voice",
          "Will — premium, confident US male voice",
          "Gerald — premium, British butler-style voice",
          "Karen — premium, energetic US female voice",
          "Select your voice character when creating a reminder",
          "Enable voice notifications in Settings for audio playback"
        ],
        faqs: [
          { question: "Do I need premium for voice characters?", answer: "Scarlett is free for all users. Will, Gerald, and Karen require a premium subscription." },
          { question: "Why isn't the voice playing?", answer: "Check that 'Voice Notifications' is enabled in Settings and your device volume is up." }
        ]
      },
      {
        id: "media-attachments",
        title: "Media Attachments (Photos)",
        icon: "Image",
        keywords: ["photo", "image", "attachment", "camera", "gallery", "ipad", "upload"],
        steps: [
          "Tap the camera icon in the form to add a photo",
          "Choose 'Take Photo' or 'Choose from Gallery'",
          "On iPad: the native PHPicker is used automatically for stability",
          "Your photo appears in the reminder notification when it fires",
          "Up to 10MB per image; JPEG, PNG, HEIC, WebP supported"
        ],
        faqs: [
          { question: "iPad camera not working?", answer: "Use 'Choose from Gallery' for best reliability on iPad. Camera capture works best on iPhone." },
          { question: "Is there a size limit?", answer: "Yes, 10MB per file for optimal performance." }
        ]
      },
      {
        id: "motivational-quotes",
        title: "Motivational Quotes",
        icon: "Quote",
        keywords: ["quote", "motivation", "inspiration", "toggle"],
        steps: [
          "Toggle 'Include Motivational Quote' when creating a reminder",
          "Quotes are selected based on your category and preferences",
          "Premium users get AI-personalized quotes",
          "Quotes appear below your reminder message when it fires"
        ],
        faqs: [
          { question: "Can I choose specific quotes?", answer: "The app selects quotes that match your reminder context. Set cultural preferences in Settings for more relevant quotes." }
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
        id: "manage-tabs",
        title: "Active, Overdue & Completed Tabs",
        icon: "Layers",
        keywords: ["active", "overdue", "completed", "tab", "filter", "status", "manage"],
        steps: [
          "Go to the Manage tab at the top of the home screen",
          "Active: reminders scheduled for the future",
          "Overdue: past reminders not yet marked — tap to log them",
          "Completed: reminders you've finished",
          "Tap any reminder card to expand it and see options",
          "Use the search bar to find reminders by title or content"
        ],
        faqs: [
          { question: "What happens to overdue reminders?", answer: "They stay visible until you mark them as Accomplished or Not Accomplished. Logging them feeds your completion graph." },
          { question: "Can I delete a reminder?", answer: "Yes — expand the reminder card and tap the delete icon. Reminders within 24h of firing show a timer before they're cleared." }
        ]
      },
      {
        id: "editing-reminders",
        title: "Editing & Deleting Reminders",
        icon: "Pencil",
        keywords: ["edit", "change", "modify", "update", "delete", "remove"],
        steps: [
          "Go to Manage tab and tap a reminder card to expand it",
          "Tap 'Edit' to modify the message, time, or settings",
          "Tap the trash icon to delete",
          "Reminders that fired recently show a countdown before deletion clears"
        ],
        faqs: [
          { question: "Can I edit a reminder after it fires?", answer: "Once triggered, you can only mark it as Accomplished or Not Accomplished." }
        ]
      },
      {
        id: "marking-complete",
        title: "Mark Accomplished / Not Accomplished",
        icon: "Check",
        keywords: ["complete", "done", "accomplish", "finish", "missed", "log"],
        steps: [
          "When a reminder fires, the notification pops up — tap 'Did it ✅' or 'Didn't do it ❌'",
          "You can also log from the Manage tab under Overdue",
          "Every log feeds your completion graph in the Analytics tab",
          "Logging is permanent — it stays on the graph even if you delete the reminder"
        ],
        faqs: [
          { question: "Does marking affect future reminders?", answer: "Your completion history is tracked in the graph, but doesn't change how future reminders fire." }
        ]
      },
      {
        id: "filters-search",
        title: "Search & Filter",
        icon: "Search",
        keywords: ["filter", "search", "find", "sort"],
        steps: [
          "Use the search bar at the top of the Manage tab to find reminders by title or content",
          "Switch between Active / Overdue / Completed tabs to filter by status",
          "Results update instantly as you type",
          "Clear search to see all reminders in the current tab"
        ],
        faqs: [
          { question: "Can I filter by date?", answer: "Currently you can filter by status (Active, Overdue, Completed). Date filtering is planned for a future update." }
        ]
      }
    ]
  },
  {
    id: "analytics",
    title: "Analytics & Graph",
    icon: "TrendingUp",
    description: "Track your habit-building progress",
    articles: [
      {
        id: "completion-graph",
        title: "Understanding Your Completion Graph",
        icon: "BarChart2",
        keywords: ["graph", "analytics", "chart", "completion", "stats", "progress", "history"],
        steps: [
          "Go to the Analytics tab on the home screen",
          "The bar chart shows days you completed vs missed reminders",
          "Green bars = completions, red bars = misses",
          "Switch views: Week (last 7 days) · 10 Weeks · Year",
          "The graph data is permanent — it stays even if you delete reminders",
          "Your streak and total counts appear above the chart"
        ],
        faqs: [
          { question: "Why is my graph empty?", answer: "The graph only shows data after you start logging reminders as Accomplished or Not Accomplished. Start marking them to see your progress." },
          { question: "Does deleting a reminder remove it from the graph?", answer: "No — completion history is stored separately and is never deleted. Your progress is safe." }
        ]
      },
      {
        id: "graph-views",
        title: "Week / 10-Week / Year Views",
        icon: "Calendar",
        keywords: ["week", "year", "ten weeks", "10 weeks", "view", "toggle", "graph"],
        steps: [
          "In the Analytics tab, find the view switcher above the graph",
          "Week: shows each day of the last 7 days individually",
          "10 Weeks: shows weekly totals for the past 10 weeks — good for spotting trends",
          "Year: shows monthly totals across the past 12 months",
          "Tap any bar to see the exact count for that period"
        ],
        faqs: [
          { question: "Which view should I use?", answer: "Start with Week to see recent habits. Switch to 10 Weeks or Year once you've been using the app for a while to spot longer patterns." }
        ]
      },
      {
        id: "stats-summary",
        title: "Stats Summary",
        icon: "CircleCheck",
        keywords: ["stats", "total", "streak", "summary", "count"],
        steps: [
          "Above the graph you'll see: Total Reminders Created, Completed, and Missed",
          "Your current streak shows consecutive days with at least one completion",
          "Completion rate percentage is calculated from your logged history",
          "These stats update immediately when you mark a reminder"
        ],
        faqs: [
          { question: "Does my streak reset if I miss a day?", answer: "Yes — a streak counts consecutive days with at least one completed reminder. Missing a day resets it to 0." }
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
          "Tap the Share icon",
          "A preview card is generated with your reminder content",
          "Choose how to share: Messages, social media, or save to photos"
        ],
        faqs: [
          { question: "What gets shared?", answer: "The share card includes: your title, the generated response, response variations, and any attached images." },
          { question: "Can others see my personal info?", answer: "No. Only the reminder content is shared, not your account details." }
        ]
      },
      {
        id: "share-troubleshooting",
        title: "Troubleshooting Share Issues",
        icon: "AlertCircle",
        keywords: ["problem", "issue", "blank", "not working", "share"],
        steps: [
          "If share sheet is blank, wait a moment and try again",
          "Ensure all images are loaded before sharing",
          "On some devices, saving to Photos works better than direct share",
          "Check that you have permission to access Photos"
        ],
        faqs: [
          { question: "Share button not responding?", answer: "Close and reopen the reminder, then try again." },
          { question: "Images missing from shared card?", answer: "Wait for 'Loading...' to finish before tapping Share Now. Large images take longer to load." }
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
        keywords: ["free", "premium", "difference", "features", "upgrade", "limit"],
        steps: [
          "Free: 15 reminders per month, Scarlett voice, standard quotes",
          "Premium: 120 reminders per month, all 4 voice characters",
          "Premium: AI-powered responses, personalized quotes, photo attachments",
          "Premium: Multiple response variations to choose from",
          "Limits reset automatically on the 1st of each month"
        ],
        faqs: [
          { question: "What happens when I hit the free limit?", answer: "You'll be prompted to upgrade or wait until the 1st of next month when your limit resets." },
          { question: "Can I try premium before paying?", answer: "New users may be eligible for a free trial. Check the Upgrade tab for current offers." }
        ]
      },
      {
        id: "upgrade",
        title: "How to Upgrade",
        icon: "ArrowUpCircle",
        keywords: ["upgrade", "subscribe", "buy", "purchase"],
        steps: [
          "Create an account first if you haven't already",
          "Go to the Upgrade tab or tap the Crown icon",
          "Review premium features and pricing",
          "Tap 'Subscribe' and confirm with Face ID / Touch ID",
          "Your premium status activates immediately"
        ],
        faqs: [
          { question: "Which payment methods work?", answer: "We use Apple/Google Pay through the app stores. All cards linked to your app store account work." },
          { question: "Do I need an account to subscribe?", answer: "Yes — you must be registered and logged in so your subscription syncs across devices." }
        ]
      },
      {
        id: "restore-purchases",
        title: "Restore Purchases",
        icon: "RefreshCw",
        keywords: ["restore", "recover", "lost", "purchase"],
        steps: [
          "Go to Settings (tap the ⚙️ icon in the header)",
          "Scroll to the Subscription section",
          "Tap 'Restore Purchases'",
          "Your subscription will be verified and restored"
        ],
        faqs: [
          { question: "Restore not working?", answer: "Make sure you're signed into the same Apple/Google account used for the original purchase." },
          { question: "Changed phones and lost premium?", answer: "Restore purchases on your new device while signed into the same app store account." }
        ]
      },
      {
        id: "manage-subscription",
        title: "Cancel or Change Subscription",
        icon: "Settings",
        keywords: ["cancel", "manage", "subscription", "settings"],
        steps: [
          "On iPhone: Settings → Apple ID → Subscriptions → Rude Reminders",
          "On Android: Play Store → Menu → Subscriptions → Rude Reminders",
          "Change plans or cancel here",
          "Cancellation takes effect at end of your billing period — you keep access until then"
        ],
        faqs: [
          { question: "Will I get a refund if I cancel?", answer: "Subscriptions are non-refundable, but you keep access until end of your paid period. Contact App Store/Play Store support for billing issues." },
          { question: "What happens to my reminders if I cancel?", answer: "All reminders remain. You return to the free tier (15/month limit)." }
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
        keywords: ["notification", "alert", "not working", "missing", "push"],
        steps: [
          "iPhone: Settings → Notifications → Rude Reminders → Allow Notifications ON",
          "Android: Settings → Apps → Rude Reminders → Notifications ON",
          "Check that Do Not Disturb / Focus modes allow our app",
          "In-app: Settings → Notifications → make sure they're enabled",
          "Try creating a test reminder using the +10s Quick Reminder button"
        ],
        faqs: [
          { question: "Notifications work sometimes but not always?", answer: "Check Focus modes and Low Power mode, which can delay or block notifications." },
          { question: "Notification sound not playing?", answer: "Check your device volume and that notifications aren't set to silent." }
        ]
      },
      {
        id: "subscription-not-updating",
        title: "Subscription Status Not Updating",
        icon: "CreditCard",
        keywords: ["subscription", "premium", "not working", "stuck", "restore"],
        steps: [
          "Force close the app and reopen",
          "Go to Settings → tap 'Restore Purchases'",
          "Check your internet connection",
          "Wait 5–10 minutes; subscription servers sometimes sync slowly"
        ],
        faqs: [
          { question: "I was charged but still showing free?", answer: "Try Restore Purchases. If still not working, email us with your receipt and we'll fix it within 24 hours." }
        ]
      },
      {
        id: "app-stuck",
        title: "App Feels Stuck / How to Refresh",
        icon: "RefreshCcw",
        keywords: ["stuck", "frozen", "slow", "refresh", "reset", "reload"],
        steps: [
          "Pull down on any screen to refresh data",
          "Force close: swipe up from bottom of screen, swipe app away",
          "Reopen the app fresh",
          "If still stuck, sign out from Settings and sign back in"
        ],
        faqs: [
          { question: "Will signing out delete my reminders?", answer: "No. Reminders are saved to your account and return when you sign back in." },
          { question: "Should I reinstall the app?", answer: "Only as a last resort. Account data is safe, but guest-only data may be lost." }
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
