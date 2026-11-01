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
    description: "Learn the basics of Reems Rude Reminders",
    articles: [
      {
        id: "create-account",
        title: "Creating an Account",
        icon: "UserPlus",
        keywords: ["account", "signup", "register", "login", "sync"],
        steps: [
          "Open the app — you'll be taken to the sign-in screen",
          "Sign in with Apple (iPhone), Google, or email",
          "Your reminders sync across all your devices",
          "An account is required to use Reems Rude Reminders"
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
          "Level 1 🤗 Sympathy: Understanding, warm and encouraging — Reem gets that it's hard",
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
        id: "meet-reem",
        title: "Meet Reem",
        icon: "Smile",
        keywords: ["reem", "rudy", "mascot", "widget", "floating", "nice mode", "bubble", "character"],
        steps: [
          "Reem lives at the top of your home screen and reacts to what you do — creating, finishing or skipping reminders",
          "The top bubble shows Reem's rotating one-liners; the bottom bubble (Premium) reacts to your actions",
          "Scroll down and Reem glides along with you — tap Reem or the ✕ to send him back to his spot",
          "Settings → Notifications → Floating Reem turns the follow-along off completely",
          "Settings → Notifications → Nice Reem Mode makes Reem say only encouraging things",
          "Every time you create a reminder, Reem shoves the Create Reminder button off the screen — it pops right back"
        ],
        faqs: [
          { question: "Can I stop Reem following me when I scroll?", answer: "Yes — tap Reem or the ✕ to tuck him away until you scroll back up, or turn off Floating Reem in Settings → Notifications." },
          { question: "Reem is too mean. Can I calm him down?", answer: "Turn on Nice Reem Mode in Settings → Notifications, or slide your reminders down to 🤗 Sympathy." }
        ]
      },
      {
        id: "motivational-popup",
        title: "Habit Building Popup",
        icon: "Sparkles",
        keywords: ["popup", "habit", "66 days", "motivational", "modal", "tip"],
        steps: [
          "A short motivational message appears automatically every 4 days on app open",
          "Messages are one line, quick to read, and cycle through 7 tips automatically",
          "One of them ties directly to habit-building science (it takes ~66 days to form a habit)",
          "Tap 'Let's get it 💥' to dismiss",
          "If a reminder notification is showing, the popup waits until you dismiss it first"
        ],
        faqs: [
          { question: "How often does the popup show?", answer: "Once every 4 days when you open the app. It never interrupts an active reminder notification." },
          { question: "Can I turn it off?", answer: "Just dismiss it each time — it only appears every 4 days so it's never intrusive." }
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
        title: "Picking a Date & Time (the Book)",
        icon: "Calendar",
        keywords: ["time", "date", "schedule", "when", "single", "day", "hour", "minute", "calendar", "book"],
        steps: [
          "In the Create tab, find the brown book — that's your week ahead",
          "Swipe or tap → to open the cover and flip through the next 7 days",
          "Tap 'Select this day' on the page you want — the date turns red and Reem scribbles a smiley",
          "Pick an hour from the hour row, then :00, :15, :30 or :45",
          "The summary under the Create Reminder button shows exactly when it will fire"
        ],
        faqs: [
          { question: "Can I set reminders for next month?", answer: "The book covers the next 7 days. For anything further out, set a reminder to make another reminder!" },
          { question: "Why can't I pick some times?", answer: "Times that have already passed today are disabled — reminders can only be set for the future." }
        ]
      },
      {
        id: "multiple-days",
        title: "Multiple Days (Recurring)",
        icon: "CalendarDays",
        keywords: ["recurring", "multiple", "days", "repeat", "weekly", "multi-day"],
        steps: [
          "Open the book and tap 'Select this day' on more than one page",
          "The counter next to the arrows shows how many days you've picked",
          "Your picked days appear as red chips under the book — tap 'Deselect' on a page to remove it",
          "Choose one hour and minute — every picked day fires at that time"
        ],
        faqs: [
          { question: "Do all selected days fire at the same time?", answer: "Yes, each picked day uses the same time." },
          { question: "Can I pick different times for different days?", answer: "Not yet — create separate reminders if you need different times." }
        ]
      },
      {
        id: "quick-reminders",
        title: "Quick Reminders (10s · 5m · 15m · 30m)",
        icon: "Zap",
        keywords: ["quick", "10s", "5m", "15m", "30m", "fast", "shortcut", "now", "hurry", "test", "seconds", "minutes"],
        steps: [
          "Type what you want to be reminded about at the top of the Create tab",
          "Scroll down to the Quick Reminder bar (red ⚡ icon) under the Create Reminder button and tap it — it opens like a drawer",
          "Tap 10s, 5m, 15m or 30m — the reminder fires that long from right now",
          "No need to open the book or pick a date — Quick Reminders always work from the current time",
          "Your rudeness level, voice, photos and quote settings are all used",
          "Reem shoves the Create Reminder button off screen to confirm it's set, and a message shows the exact time it will fire"
        ],
        faqs: [
          { question: "When should I use a Quick Reminder?", answer: "Anything happening soon — 'take the pizza out' in 15 minutes, 'leave for the bus' in 5. Use 10s to try out a rudeness level or voice instantly." },
          { question: "Does 10s really fire in 10 seconds?", answer: "Yes. Make sure notifications are allowed so it can pop up even if you leave the app." },
          { question: "Do Quick Reminders count toward my monthly limit?", answer: "Yes — each one counts as one reminder, the same as the main Create button." }
        ]
      },
      {
        id: "rudeness-slider",
        title: "Using the Rudeness Slider",
        icon: "Sliders",
        keywords: ["slider", "rudeness", "adjust", "level"],
        steps: [
          "The rudeness slider sits in the cream-coloured section with emoji labels",
          "Drag left for kinder (🤗 Sympathy) or right for more aggressive (🤬 Savage)",
          "The emoji row shows: Sympathy · Motivational · Sarcastic · Harsh · Savage",
          "Your default level can be saved in Settings"
        ],
        faqs: [
          { question: "Why does my reminder sound different than the preview?", answer: "AI generates fresh content each time. The preview shows the style, but your actual reminder will be uniquely created." }
        ]
      },
      {
        id: "content-safety",
        title: "Content Safety — What Gets Blocked",
        icon: "ShieldCheck",
        keywords: ["blocked", "rejected", "safety", "moderation", "harmful", "content", "error", "can't create"],
        steps: [
          "Reems Rude Reminders screens reminder text for genuinely harmful content before it's created",
          "This is separate from the app's rudeness — sarcasm, dark humor, and mild profanity are all fine and expected",
          "What actually gets blocked: things like real-world violence, illegal activity, and credible threats — not ordinary rudeness",
          "If a reminder is blocked, you'll see a message asking you to rephrase it",
          "The same check runs again when the reminder fires, using the freshly generated message, so it stays protected even after creation"
        ],
        faqs: [
          { question: "Why was my reminder rejected?", answer: "Its text (or the AI-generated response) matched one of a small set of genuinely harmful categories — not because it was too rude. Try rephrasing it." },
          { question: "Will ordinary swearing or dark jokes get blocked?", answer: "No. The app is built to be rude — only content describing real harm gets screened out." }
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
          "Free: 1 photo per reminder · Premium: up to 5",
          "Your photos appear in the reminder pop-up when it fires — tap one to see it full size",
          "JPEG, PNG, HEIC and WebP work, up to 10MB each"
        ],
        faqs: [
          { question: "iPad camera not working?", answer: "Use 'Choose from Gallery' for the most reliable result on iPad." },
          { question: "Is there a size limit?", answer: "Yes, 10MB per photo." }
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
        title: "Upcoming & Past Tabs",
        icon: "Layers",
        keywords: ["active", "overdue", "completed", "tab", "filter", "status", "manage", "upcoming", "past", "open", "reopen"],
        steps: [
          "Go to the Manage tab on the home screen",
          "Upcoming: reminders that haven't fired yet",
          "Past: reminders you haven't logged yet, plus anything you logged in the last 24 hours",
          "Tap any unlogged Past reminder to reopen the full reminder — message, photos, voice and the Got it done / Didn't do it buttons",
          "Or log it straight from the list with 😊 (did it) or 😞 (didn't)",
          "Logged reminders clear from Past automatically 24 hours later"
        ],
        faqs: [
          { question: "What happens to overdue reminders?", answer: "They wait in Past, unlogged, until you mark them. Logging them feeds your graph." },
          { question: "Can I delete a reminder?", answer: "Upcoming reminders: swipe left or tap the trash. Past reminders can't be deleted — log them and they clear on their own after 24 hours." }
        ]
      },
      {
        id: "editing-reminders",
        title: "Deleting & Changing Reminders",
        icon: "Pencil",
        keywords: ["edit", "change", "modify", "update", "delete", "remove", "swipe"],
        steps: [
          "Go to Manage → Upcoming",
          "Swipe a reminder left, or tap its trash icon, to delete it",
          "To change a reminder, delete it and create a new one with the new details",
          "Past reminders are kept for your history — log them and they clear after 24 hours"
        ],
        faqs: [
          { question: "Can I edit a reminder after it fires?", answer: "Once it has fired you can only log it — Got it done or Didn't do it." }
        ]
      },
      {
        id: "marking-complete",
        title: "Got It Done / Let You Know Later / Didn't Do It",
        icon: "Check",
        keywords: ["complete", "done", "accomplish", "finish", "missed", "log", "later"],
        steps: [
          "When a reminder fires, the notification pops up with three options",
          "'Got it done 👊' logs it as completed",
          "'Didn't do it.' logs it as not accomplished",
          "'Let you know later' just closes the popup — nothing is logged yet",
          "A reminder dismissed with 'Let you know later' shows up under Manage → Past so you can log it whenever you're ready",
          "Every log feeds your completion graph in the Analytics tab",
          "Logging is permanent — it stays on the graph even if you delete the reminder"
        ],
        faqs: [
          { question: "What does 'Let you know later' actually do?", answer: "It just dismisses the popup without marking anything. The reminder stays unlogged and waits for you in Manage → Past." },
          { question: "Does marking affect future reminders?", answer: "Your completion history is tracked in the graph, but doesn't change how future reminders fire." }
        ]
      },
      {
        id: "it-hit-feedback",
        title: "It Hit — Did the Message Land?",
        icon: "Target",
        keywords: ["it hit", "nahh", "feedback", "funny", "target", "rate", "rating"],
        steps: [
          "Every reminder card has a quick feedback row near the bottom: 'Let us know did It Hit 🎯 or Nahh 😒'",
          "Tap 'It Hit' if the message actually landed — made you laugh, hit different, whatever counts as a win for you",
          "Tap 'Nahh' if it didn't do much for you",
          "Whichever you tap locks in right away — no changing your answer after",
          "You'll see this same row on the reminder popup and on the Share preview card in Manage",
          "Reem's face at the top of the card changes expression based on the reminder's rudeness level"
        ],
        faqs: [
          { question: "What does It Hit actually do?", answer: "It's quick feedback on whether the AI-generated message worked. It helps us understand which messages are actually landing." },
          { question: "Can I add a comment explaining why?", answer: "Not yet — a short optional note is planned for a future update." }
        ]
      },
      {
        id: "filters-search",
        title: "Search & Filter",
        icon: "Search",
        keywords: ["filter", "search", "find", "sort"],
        steps: [
          "Use the search bar at the top of the Manage tab to find reminders by title or content",
          "Switch between Upcoming and Past tabs to filter by status",
          "Results update instantly as you type",
          "Clear search to see all reminders in the current tab"
        ],
        faqs: [
          { question: "Can I filter by date?", answer: "Currently you can filter by status (Upcoming or Past). Date filtering is planned for a future update." }
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
          "Tap Share on a reminder in Manage → Past, or at the top of the reminder pop-up",
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
        title: "Free vs Premium",
        icon: "Sparkles",
        keywords: ["free", "premium", "difference", "features", "upgrade", "limit"],
        steps: [
          "Free: 15 reminders a month (10 a month after your first 6 months), Scarlett voice, 1 photo per reminder, standard messages",
          "Premium: 120 reminders a month and all 4 voices (Scarlett, Will, Gerald, Karen)",
          "Premium: AI-written messages with extra variations, personalised quotes and up to 5 photos",
          "Premium: your full Analytics graph and Reem's live reactions",
          "Monthly limits reset on the 1st of each month"
        ],
        faqs: [
          { question: "What happens when I hit the free limit?", answer: "You can upgrade, or wait until the 1st when your reminders reset." },
          { question: "Is there a free trial?", answer: "Any current offer is shown on the Subscribe screen before you pay." }
        ]
      },
      {
        id: "upgrade",
        title: "How to Upgrade",
        icon: "ArrowUpCircle",
        keywords: ["upgrade", "subscribe", "buy", "purchase", "premium"],
        steps: [
          "Tap 'Go Premium' on Reem, or go to Settings → Payment & Billing → Upgrade to Premium",
          "Pick Yearly (best value) or Monthly — prices come straight from the App Store / Google Play",
          "Tap Continue and confirm with Face ID, Touch ID or your store password",
          "Premium switches on straight away and you're taken back home"
        ],
        faqs: [
          { question: "How do I pay?", answer: "Through your Apple ID or Google Play account — any card or balance linked there works." },
          { question: "Do I need an account to subscribe?", answer: "Yes — it ties Premium to you so it follows you to any device you sign in on." }
        ]
      },
      {
        id: "restore-purchases",
        title: "Restore Purchases",
        icon: "RefreshCw",
        keywords: ["restore", "recover", "lost", "purchase", "new phone", "reinstall"],
        steps: [
          "Go to Settings → Payment & Billing",
          "Tap 'Restore Purchases' (it's also under Continue on the Subscribe screen)",
          "Premium comes straight back if your store account has an active subscription"
        ],
        faqs: [
          { question: "Restore not working?", answer: "Make sure your phone is signed into the same Apple ID / Google account you paid with." },
          { question: "Changed phones and lost Premium?", answer: "Sign into the app, then tap Restore Purchases on the new phone." }
        ]
      },
      {
        id: "manage-subscription",
        title: "Manage Your Subscription",
        icon: "Settings",
        keywords: ["cancel", "manage", "subscription", "change", "plan", "refund"],
        steps: [
          "Go to Settings → Payment & Billing → Manage Subscription",
          "This opens your Apple ID or Google Play subscriptions page",
          "Switch between Monthly and Yearly, or turn off auto-renew there",
          "If you stop renewing, you keep Premium until the end of the period you've paid for"
        ],
        faqs: [
          { question: "Can I get a refund?", answer: "Payments go through Apple or Google, so refunds are handled by them. Email us and we'll point you the right way." },
          { question: "What happens to my reminders if I stop Premium?", answer: "Nothing is deleted — you just go back to the free plan's monthly limit." }
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
          "iPhone: Settings → Notifications → Reems Rude Reminders → Allow Notifications ON",
          "Android: Settings → Apps → Reems Rude Reminders → Notifications ON",
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
          "Go to Settings → Payment & Billing → Restore Purchases",
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
          "Switch to another tab and back to reload that screen",
          "Fully close the app (swipe it away from the app switcher) and reopen it",
          "Check your internet connection — the app needs it to sync",
          "Still stuck? Sign out with the exit icon at the top of the home screen, then sign back in"
        ],
        faqs: [
          { question: "Will signing out delete my reminders?", answer: "No. Everything is saved to your account and comes back when you sign in." },
          { question: "Should I reinstall the app?", answer: "Only as a last resort — your data is safe on our servers and returns after you sign in." }
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
