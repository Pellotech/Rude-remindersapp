# Rude Reminders — Project Handoff / Status Notes

Written by Claude at the end of a long working session, so a future chat (or you) can pick up
without losing context. Read this first before starting new work.

## Repo & workflow

- Repo: github.com/Pellotech/Rude-remindersapp, cloned locally to `~/Documents/GitHub/Rude-remindersapp`
- Backend/hosting: Replit (a *separate* git remote called `replit`, pulled manually via Replit's Git pane — not automatic)
- Workflow: edit locally → commit + push via GitHub Desktop → in Replit, pull via the Git pane → **full Stop → Run restart** (required for backend/schema/env changes; frontend-only edits hot-reload via Vite HMR and don't need a restart)
- Known friction: `.git/index.lock` sometimes gets stuck when GitHub Desktop and other tools touch the repo at the same time. Fix: run `rm ~/Documents/GitHub/Rude-remindersapp/.git/index.lock` in Terminal.
- Known gap: Replit's "dev/preview" environment sometimes lags behind production (different secrets/schema sync timing). You've been fine leaving this alone unless something *also* breaks on production.

## Roadmap status (your stated order — please keep returning to it)

1. ✅ Content safety moderation
2. ✅ Reorder tabs (Manage moved behind Analytics)
3. ✅ "It Hit" reminder feedback feature
4. ✅ (Optional) welcome bubble frequency
5. ⏳ **IN PROGRESS** — Android target API 36 update. Code/config side is done (see below); you still need to sync, open in Android Studio, and upload. Deadline **Aug 31, 2026**. **Priority — finish this before 5.1.**
5.1. 🅿️ Parked until Android ships — optional dark background toggle. See "Idea logged" note below.
6. 🅿️ Parked, not urgent — protect sacred religious sites/artifacts/texts in moderation

## What's been built

### Content moderation
- `server/services/moderationService.ts` — calls OpenAI's free Moderation endpoint (`omni-moderation-latest`)
- Blocked categories (deliberately narrow): violence, violence/graphic, sexual/minors, hate, self-harm (+intent, +instructions), illicit (+violent), harassment/threatening, hate/threatening
- Fails **open** — if `OPENAI_API_KEY` is missing or the call errors, content passes through and it's logged, rather than blocking reminder creation
- Centralized inside `server/services/smartResponseService.ts`'s `getPersonalizedResponse()` (all AI-generation call sites funnel through there) — plus an input-side check in `server/routes.ts` on `POST /api/reminders`
- Requires `OPENAI_API_KEY` in Replit Secrets

### Tab reorder
- `client/src/pages/home.tsx` — tab order is Create → Analytics → Manage

### "It Hit" feature
- Schema: `reminders` table has `hitConfirmed` (bool), `hitComment` (text), `hitAt` (timestamp) — `shared/schema.ts`
- Storage: `markReminderHit(id, userId, hit, comment?)` + `getHitReminders()` in `server/storage.ts` (both `DatabaseStorage` and `MemoryStorage`, plus the exported wrapper)
- API: `PATCH /api/reminders/:id/hit` (body `{ hit: boolean, comment?: string }`) — comment goes through a junk filter (≥6 chars, not all-emoji) and `moderationService` before saving
- Admin: `GET /api/admin/reminder-hits` (admin-gated) — only returns `hitConfirmed = true` rows. **"Nahh" answers aren't shown in admin yet** — easy to add if you want it later.
- UI: `client/src/components/ItHitToggle.tsx` — single shared component, used by both `RichReminderNotification.tsx` (main popup) and `ShareButton.tsx` (Manage → Share preview). Two buttons: "It Hit 🎯" and "Nahh 😒". Tapping Nahh opens a dropdown with 3 quick reasons (**Not funny** / **Doing too much** / **Repetitive**) plus **Skip** (Skip still registers "Nahh," just with no reason attached).
- Avatar: `client/src/lib/rudyAvatar.ts` — picks Rudy's face by rudeness level (1-2 content smile, 3 smirk, 4-5 mischief smirk). Rendered with `object-contain` (not `object-cover`) so the full head always shows, never cropped tight.
- Admin UI: `client/src/components/admin/AdminHits.tsx`, wired into `client/src/pages/admin.tsx` as a new "Hits" tab — clicking a row opens the full reminder card (`showActionButtons={false}`).

### Welcome popup (`MotivationalPopup.tsx`)
- Shows once every 4 days (was 3; docs had claimed 2, which was already stale before this session)
- 7 short one-line messages (rewritten from two-sentence paragraphs down to punchy 5-8 word lines)
- Colors: both sections `#FDF3E3` (was two-tone cream/burnt-pink), button navy `#1B2A5E` (was red) — matches the Create Reminder button

### Bug fixes found along the way
- `home.tsx` `handleCompleteReminder`/`handleMissedReminder`: now **always** close the dialog (moved to a `finally` block), regardless of plan or whether the save succeeded. Previously premium users could get stuck staring at the dialog if the API call failed.
- `NotificationProvider.tsx` (renders the popup when opened via a push/real-time notification): **"Didn't do it" was never wired up at all** — a dead button. Fixed. "Got it done" now always closes too.
- Known but **not** fixed (low priority, deferred): `ReminderForm.tsx`'s `CONTENT_BLOCKED` error handling does `JSON.parse(error.message)`, which fails because `apiRequest` prepends `"HTTP 400: "` before the JSON. The moderation block itself still works — the reminder is still rejected — but the specific friendly error text never displays; it silently falls back to a generic "Failed to create reminder" message. The new It Hit code avoids this exact bug via a `parseApiError()` helper (now the single shared version lives in `client/src/lib/queryClient.ts`) that strips the prefix first.

### Help menu + onboarding
- `client/src/lib/helpContent.ts` — fixed several stale articles (popup frequency, the Manage tab model — it's actually just "Upcoming"/"Past," not three tabs like the old docs claimed — and wrong button labels). Added two new articles: "It Hit — Did the Message Land?" and "Content Safety — What Gets Blocked."
- `client/src/components/IntroTour.tsx` — now 7 slides (was 6): fixed the fake Manage-tab button mockup to match real labels, added a new slide introducing It Hit / Nahh.

### Cleanup (Aug 16, 2026)
- Deleted `client/src/pages/settings/Appearance.tsx` and its route/import in `App.tsx` — it was an orphaned duplicate of the "Nice Rudy" toggle (now renamed "Nice Rudy Banner" in `Notifications.tsx`, the real settings page) that wasn't linked from anywhere in the UI and had a save bug (toggle updated localStorage but never persisted to the server).
- Deleted `client/src/pages/settings.tsx` (lowercase, no route folder) — also fully orphaned, not imported anywhere in `App.tsx`. It was an old self-contained tabbed settings page with its own duplicate Personal Info / Notifications / Appearance / Billing / Account sections and its own account-deletion flow, entirely superseded by `SettingsLanding.tsx` + the routed `settings/*.tsx` pages.
- Both deletions were pure dead-code removal — nothing referenced either file. TypeScript baseline dropped from 72 → **69** as a result (both files carried their own pre-existing type errors).
- IntroTour is now 8 slides (was 7): added a new "Make it yours" slide covering Notification Text Size, Floating Rudy, and Nice Rudy Banner.

### Architecture note — keep it "lego-like"
You've cared specifically about keeping the app modular/independently editable, dating back to the original problem (a slider component was flagged as risky to move due to tight coupling). That refactor produced: `RudenessSlider.tsx`, `AnalyticsPanel.tsx`, `HomeHeader.tsx`, `AnalyticsLocked.tsx`, `FreePlanUsage.tsx`, `CreateTooltip.tsx` — **none of these were touched** by any of the work in this session. Where duplication crept in during the It Hit build (the toggle logic existed in two files briefly), it was consolidated into one shared file rather than left copy-pasted.

### Verification method used throughout
- TypeScript: `cd ~/Documents/GitHub/Rude-remindersapp && npx tsc --noEmit -p .`
- **Baseline is 72 pre-existing errors**, unrelated to any of this work (mostly `string | null` strictness issues in older auth/storage code). Any new change should keep this exact count unless you're intentionally fixing one of the baseline errors.
- A full `vite build` needs a Linux-native `node_modules` (the Mac-installed one has incompatible native binaries in a sandboxed environment) — wasn't repeated for every small change; `tsc` alone was sufficient signal throughout.

## Step 5.1 (idea, not built) — dark backdrop toggle for the main screen

Logged Aug 16, 2026, not implemented — Android ships first.

**What you asked for:** an optional dark background (slate grey, not pure black) for the *outer page backdrop only* on the main Create/Manage/Analytics screen — not the tan header, not the yellow Rudy speech-bubble card, not the cream input boxes. On/off toggle in Settings → Notifications (the same screen as Nice Rudy Banner / Floating Rudy), applied when the user hits Save.

**What I found checking the code:** this is smaller than it sounds.
- Your Settings pages (`Notifications.tsx`, `SettingsLanding.tsx`, `Billing.tsx`, `PersonalInfo.tsx`, etc.) are *already* on `bg-black` — dark already.
- The one screen still on a plain light background is `home.tsx` (the screen in your screenshot) — and its root wrapper already has `className="min-h-screen bg-white dark:bg-gray-900"`. That `dark:bg-gray-900` is dead code sitting there unused from some earlier pass — nothing currently ever adds a `dark` class to the page, so it never activates.
- Tailwind is already configured for class-based dark mode (`darkMode: ["class"]`), so the plumbing to support this exists, it's just not wired to anything.

**What it'd actually take:**
1. Toggle UI in `Notifications.tsx` — same on/off switch + description pattern as the existing toggles.
2. A small bit of logic to add/remove a `dark` class on `<html>` (or similar) based on the saved preference, on app load — nothing does this today.
3. Swap `dark:bg-gray-900` for an actual slate shade (Tailwind's `slate` palette — e.g. `dark:bg-slate-800` — rather than `gray`) to match "dark slate grey" specifically.
4. Everything else (header, cards, buttons) keeps its explicit hex colors untouched — those were never given `dark:` variants, so they won't be affected unless deliberately added.

Contained, well-scoped change — not a full theme system. Good candidate for right after the Android/iOS releases ship.

**Confirmed scope (Aug 16, 2026), from three annotated screenshots across Create/Manage/Analytics:** every bordered/pill/filled element stays exactly as-is — header, Rudy card, rudeness pill, tab bar, Past/Upcoming toggle, search box, tip card, individual reminder cards, Share button, the green/red emoji buttons, and every Analytics metric card + chart card. Only the bare canvas behind/between them changes. Confirms the small-scope read above: since every card already has its own explicit background color in the code, this is genuinely just the one root wrapper background per screen, nothing else.

**Naming:** the black option is called "Zero Dark Thirty" (not just "black"). Slate option name still TBD.

**Toggle behavior — decided:** three-way picker, not a simple on/off. Light / Zero Dark Thirty (or slate) / Auto, where Auto follows the device's system light/dark setting. More settings UI and states to test than a plain toggle, but it's what the user wants.

### Built (Aug 16, 2026)
- `client/src/hooks/useBackdropTheme.ts` — new hook, toggles a `dark` class on `<html>` based on saved preference (`light` / `dark` / `auto`, from `localStorage.backdrop_theme`). `auto` follows `prefers-color-scheme` live via a media query listener. Called once from `App()` in `App.tsx`.
- `client/src/pages/home.tsx` — root wrapper's dead `dark:bg-gray-900` swapped for `dark:bg-black` (this is the only place that actually paints, since Create/Manage/Analytics are tabs inside this one component, confirmed via `activeTab` state).
- `client/src/components/HomeHeader.tsx` already had `dark:text-white` on the "Hey {name}" greeting from some earlier abandoned attempt — reused as-is, no change needed. Everything else on the main screen (cards, pills, tabs, buttons) already carries its own explicit background/text color per the confirmed scope, so nothing else needed touching.
- Settings UI: new "Appearance" section in `client/src/pages/settings/Notifications.tsx`, 3-way picker matching the existing Text Size button style exactly — Light / Zero Dark Thirty / Auto, small circular color swatches instead of "Aa" previews.
- `shared/schema.ts`: new `backdropTheme` varchar column on `users`, default `"light"`.
- `server/routes.ts`: `backdropTheme` added to the `PUT /api/settings` whitelist.
- Verified: `tsc` still 69 baseline, `vite build` (the client bundle, what actually ships in the app) builds clean, `cap sync android` picked it up.

**Still needed before the Save button fully works:** the new `backdrop_theme` column doesn't exist in the real database yet — run `npm run db:push` (drizzle-kit) against it. Until that's run, the toggle still works visually and locally (localStorage-driven), it just won't persist across devices/reinstalls yet.

**Note found along the way:** there's a stray `'darkMode'` entry already sitting in the `server/routes.ts` settings whitelist with no matching database column — leftover from some earlier, different, abandoned dark-mode attempt (along with the unused `next-themes` package in `package.json` and that dead Tailwind class we already found). Left alone, not this feature's concern, but flagging in case it causes confusion later.

## iOS — brought up to Capacitor 8 alongside Android (Aug 16, 2026)

No Apple deadline is forcing this (unlike Android's Aug 31 cutoff) — did it now since the `package.json` bump to Capacitor 8 already applies to iOS too (it's one shared dependency manifest), and leaving the native iOS project on old settings while the JS side moved to 8 would've left things inconsistent.

### What's done
- `ios/App/Podfile`: `platform :ios` 14.0 → **15.0** (Capacitor 8's required minimum)
- `ios/App/App.xcodeproj/project.pbxproj`: `IPHONEOS_DEPLOYMENT_TARGET` 14.0 → **15.0** (all 4 build config occurrences). `SWIFT_VERSION` was already 5.0, no change needed there.
- `npx cap sync ios` run — resolved all 19 plugins at their Capacitor-8-compatible versions cleanly, same list as Android. Web asset copy and plugin registration succeeded; the "pod install" step itself was skipped since this sandbox has no CocoaPods/macOS — that part has to run on your Mac.
- Confirmed your app already targets both iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"` in the Xcode project) — nothing iPad-specific needed beyond the above.
- Checked `revenueCatService.ts` — it calls `Purchases.configure({ apiKey })` with no explicit StoreKit version override, so RevenueCat 13.x's default-to-StoreKit-2 behavior applies with no code change needed.

### What's NOT done — needs your Mac
1. Pull these changes, `npm install`.
2. Open `ios/App/App.xcworkspace` in Xcode (not the `.xcodeproj` — CocoaPods projects always open via the `.xcworkspace`). **Capacitor 8 requires Xcode 26.0+** — check your version first.
3. Run `pod install` in `ios/App` (or let Xcode/CocoaPods do it on open) to pull the updated native pod versions matching the new `package.json`.
4. **RevenueCat dashboard action (not code):** since v13 defaults to StoreKit 2, make sure your In-App Purchase Key is configured in the RevenueCat dashboard, or purchases could fail on iOS. See RevenueCat's StoreKit 2 docs if you haven't set this before.
5. Build and test on a real device or simulator — specifically in-app purchases, apple sign-in, and anything camera/notification related, since those pods all moved major versions too.
6. No Play-Store-style deadline here, but Apple does eventually require newer Xcode/SDK builds for App Store submissions too — worth shipping this in your next normal iOS release rather than sitting on it indefinitely.

## Step 5 — Android API 36 (in progress, updated Aug 16, 2026)

**Decision made:** upgraded to Capacitor 8 (not a minimal targetSdk bump on Capacitor 7) — that's the officially supported path for API 36 and avoids untested native combos. You chose this over the faster/riskier "just flip the number" option.

### What's done (code + config, verified in this session)
- `android/variables.gradle`: `minSdkVersion` 23→**24**, `compileSdkVersion`/`targetSdkVersion` 35→**36**, all AndroidX versions bumped to match Capacitor 8's official template exactly (appcompat 1.7.1, core 1.17.0, fragment 1.8.9, core-splashscreen 1.2.0, webkit 1.14.0, cordova-android 14.0.1, etc.)
- `android/build.gradle`: AGP → 8.13.0, google-services plugin → 4.4.4 (both match Capacitor 8's tested combo)
- `android/gradle/wrapper/gradle-wrapper.properties`: Gradle → 8.14.3
- `package.json`: every `@capacitor/*` package and community plugin (admob, apple-sign-in, text-to-speech, file-picker) bumped to their Capacitor-8-compatible majors; `@revenuecat/purchases-capacitor` 11→**13.4.0** (needed, peer dep requires core ≥8; checked the changelog — no JS/TS API changes across 12→13, just native SDK bumps, so `revenueCatService.ts` needs no code changes); `capacitor-plugin-safe-area` 4→**5.0.1** (needed, same peer dep reason; confirmed its TS API — `getSafeAreaInsets()`, `addListener('safeAreaChanged', ...)` — is identical in v5, so `safeAreaSetup.ts` needs no changes either)
- `npm install` run — all 19 native plugins resolve cleanly against `@capacitor/core@8.5.0`, zero peer dependency conflicts
- `npx tsc --noEmit -p .` — still exactly **72 baseline errors**, nothing new
- Reviewed Android 16 behavior changes: no custom back-button handling in the app (predictive back is low-risk), and the app already has dedicated safe-area handling (`safeAreaSetup.ts` + `MobileStatusBar.tsx`) so mandatory edge-to-edge shouldn't need new plumbing. One pre-existing, unrelated quirk: `StatusBar.setBackgroundColor()` in `MobileStatusBar.tsx` is a no-op under edge-to-edge (has been since API 35) — cosmetic, not something this upgrade caused, not fixed.

### What's NOT done — needs your machine (Android Studio/Node 22+ required, sandbox couldn't fully verify)
1. Pull these changes, run `npm install` again locally to be safe.
2. Run `npx cap sync android` — the sandbox environment couldn't finish this (its mounted filesystem blocked some file rewrites), so the native project's generated files (web asset copy, `capacitor-cordova-android-plugins/build.gradle`) haven't been regenerated yet. This is a normal, required step — just needs to run somewhere with full file permissions.
3. Open `android/` in Android Studio. **You need Android Studio Otter (2025.2.1) or newer** for Capacitor 8 / API 36 — check your version and update if needed.
4. Let Gradle sync, fix anything Android Studio flags (shouldn't be much given the dependency check above), then do a full build.
5. Test on a real device or emulator running Android 16 — specifically: app launch, notification permissions, in-app purchases (RevenueCat), and any screen where content could sit near the status/nav bar (edge-to-edge).
6. Build the release bundle and upload to Play Console yourself — not something Claude can do.
7. **Deadline: Aug 31, 2026.** An extension to Nov 1, 2026 is available from Google if you need more runway.
8. Separately, not a code task: Android developer verification deadline **Sept 30, 2026** — requires your own identity/business document submission directly on Google's site.

## Your communication preferences (for whoever picks this up)
- Concise, direct responses — minimal fluff
- New to git/GitHub Desktop, values caution — always double-check before anything destructive
- Appreciates visual mockups/previews before big UI changes
- Wants the assistant to keep returning to the stated roadmap order even amid tangents
- Prefers bugs/observations flagged honestly and proactively, even if not directly asked
