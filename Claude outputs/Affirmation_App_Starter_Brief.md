# Affirmation App — Starter Brief
*Working name: "Affirmation App" (placeholder). Written Nov 14, 2026, from the Reems Rude Reminders project, so a new project can start with the full background.*

Read this whole brief first. It explains who you're working with, the sister app this one is based on, what can be reused, and what's still undecided.

---

## 1. Who you're working with
- **Owner:** Mohammed (developer account "Pello Tech", Edmonton, Canada, time zone America/Edmonton).
- He isn't a professional developer. He built his first app, Reems Rude Reminders, with Replit, then moved to working on his Mac with Claude.
- **How he likes to work:**
  - Plain language, step by step, one screen at a time.
  - Concise answers.
  - Mockups or screenshots before big visual changes.
  - Ask before anything that can't be undone.
- **Standing rules from the first app (keep them):**
  - Mohammed presses every final Submit, Publish, Buy or Send button himself, or gives a clear "yes" first.
  - He does all sign-ins himself (Apple ID, Google, 2FA, passwords).
  - Don't git commit or push without asking.
  - He uploads files to the App Store and Google Play himself. Claude prepares them at the exact sizes and says which folder they're in.

## 2. The idea
An app built on the same premise as **Reems Rude Reminders**, but for **affirmations instead of reminders**. Keep the spirit (a strong personality, AI-written messages in a tone the user picks, delivered on a schedule), but make it **its own app**, and a **better, more focused version** of the first one.

**Still to be decided in this project (ask Mohammed, don't assume):**
- The feature list. Mohammed will explain the abilities he wants.
- The final name.
- Whether it gets its own mascot or shares Reem.
- The tone levels: the affirmation version of Rude Reminders' rudeness slider.
- Free vs Premium split, and whether Premium removes ads.

## 3. The sister app: Reems Rude Reminders (what it does)
Live on the Apple App Store (v1.2.0) and Google Play.

- **Core flow:**
  - The user writes a reminder and picks a date and time in a book-style date picker.
  - They pick a **rudeness level**: Sympathy, Motivational, Sarcastic, Harsh or Savage.
  - AI (DeepSeek) writes the message plus variations in that tone.
- **Quick Reminders:** one tap for 10 seconds, 5, 15 or 30 minutes.
- **Extras:** optional voice (text-to-speech), photos and quotes.
- **Habits:** habit tracking and analytics (built on the "66 days to form a habit" idea), a Manage list (Past/Upcoming), and sharing.
- **Mascot "Reem":** a flat 2D character with a floating widget (off by default) and a walk-in "push" animation when a reminder is created.
- **Money:**
  - Free: 15 per month plus AdMob ads (a banner, and a full-screen ad after each reminder).
  - Premium (RevenueCat, monthly or yearly): 120 per month, AI messages, voices, 5 photos and analytics.
  - The paywall is a single screen, with a Billing page and Restore Purchases.
- **Other screens:**
  - Help & Support (searchable articles, contact and bug report by email).
  - Settings with a Save bar.
  - Siri shortcuts (iPhone only).
  - A hidden Developer Space admin area (passcode-protected, sessions stored in the database).
- **Sign-in:** email and password (with email verification), Google and Apple. Accounts link by verified email.
- **Content safety:** OpenAI moderation checks what users type.

### Tone and personality lessons
- The level system works best when level 1 is gentle (it was renamed from a harsher name to "Sympathy").
- The character is blunt, funny and helpful, never cruel.
- Planned idea for later: the user picks a humour "voice" (British banter, Desi auntie, Arab uncle and so on). The app never stereotypes by ethnicity; the user chooses the style.
- Marketing ads (Hype Jet work): the mascot never explains the app inside a scene; the closing shot does the selling. Humans can roast the mascot back, which keeps it unpredictable.

## 4. Tech stack to reuse
- **App:** React + TypeScript + Vite, wouter (routing), TanStack Query (saved to disk), framer-motion and Tailwind.
- **Phone layer:** Capacitor 8 (LocalNotifications, Camera, Haptics, Preferences, Browser, App), plus AdMob, RevenueCat and App Tracking Transparency.
- **Server:** Node + Express + Passport, Drizzle ORM + Postgres.
- **AI and services:** DeepSeek for writing messages, OpenAI for moderation, Unreal Speech for voices.
- **Build:** `npm run build && npx cap sync ios && npx cap sync android`. Then iOS via Xcode → Archive; Android via Android Studio → Generate Signed App Bundle.
- **Reference code:** Rude Reminders lives at `/Users/macbookpro/Documents/GitHub/Rude-remindersapp`. When building, connect **both** folders (the new app's and this one) so working pieces can be copied:
  - sign-in (email, Google, Apple)
  - the paywall and RevenueCat
  - notifications and resync
  - the AdMob setup
  - the Help page
  - the Save bar
  - the Developer Space

  **Never edit the Rude Reminders folder from the new project.**

## 5. Hosting: own it from day one (no Replit)
Rude Reminders is moving off Replit because its server sleeps (so timers and email are unreliable), it uses Replit's web address, and photos saved on Replit's disk can disappear. The new app starts on the target setup straight away:
- **Railway** (Hobby plan) for the server **and** its Postgres database, deployed automatically from GitHub. Never sleeps. Estimate: about $7–14 CAD/month extra for this app.
- **Own domain**, bought through Cloudflare (about $15 CAD/year for a .com), with the server at `api.<domain>`. **Never hard-code a host address** in the app or the emails. Use one setting (for example `PUBLIC_URL`) so a host change never needs an app update.
- **Cloudflare R2** for photos and voice files (free up to 10 GB). Never save uploads to the server's own disk.
- **Resend or Postmark** for email from the domain, not Gmail.
- **Neon isn't recommended:** an always-on server keeps it awake, which costs more than Railway's own Postgres.
- Mohammed has started (or is starting) Railway and Cloudflare accounts for the Rude Reminders move. The new app can use the same accounts as separate projects.

## 6. App Store and Google Play lessons (learned the hard way)
- **Apple:**
  - No emoji in store text; subscription display names are 30 characters max.
  - iPhone screenshots 1206×2622 or 1179×2556; iPad 2064×2752 or 2048×2732. No transparency in screenshots.
  - Sign in with Apple needs an account-deletion path (and token revoke).
  - If an Xcode Archive fails, check the Apple ID sign-in in Xcode and accept the latest developer agreement.
- **Google Play:**
  - Data safety must match the build exactly (AdMob counts as sharing device IDs).
  - The account-deletion web link must work and name the app.
  - Don't request broad photo or video permissions; use the system photo picker.
  - A fixed version must go to every track.
- **Trader status:** the Pello Tech account is completing Google Play's trader declaration (deadline Feb 1, 2027). Mohammed won't use his personal address or phone. It applies to the whole developer account, so the new app is covered too.
- **Same developer accounts:** the new app can live under the existing Pello Tech Apple and Google accounts (no new developer fees). It needs its own bundle IDs, subscription products, AdMob app and RevenueCat project.

## 7. Bugs fixed in Rude Reminders (avoid them from the start)
- **Logging out must clear all cached data**, or the next account sees the previous user's data.
- **Never return password hashes or tokens** from the "current user" endpoint. Send a `hasPassword` flag instead.
- **Social sign-in:**
  - Lock the native callback to the app's own URL scheme.
  - Link accounts only by verified email.
  - Trust only the email inside Apple's token.
- **Error messages from the server** look like `"403: {json}"`. Parse the JSON after the status, or limit messages never show.
- **The free limit must match everywhere** (server, paywall text and Help text). The first app had 10 in one place and 15 in another.
- **AdMob setup:** inside the native app, fetch the ad configuration with the full server address. A relative URL silently fell back to test ads.
- **Email verification:** links expire, resends are rate-limited, and there's an 8-character minimum password.

## 8. Suggested first steps in the new project
1. Mohammed explains the abilities and features he wants.
2. Lock the essentials: name, mascot, tone levels, free vs Premium.
3. Mockups of the main screens before any code.
4. Set up the GitHub repo, Railway project, domain and R2.
5. Build the app, copying the proven pieces from Rude Reminders.
