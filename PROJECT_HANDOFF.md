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
5. ⏳ **IN PROGRESS** — Android target API 36 update. Code/config side is done (see below); you still need to sync, open in Android Studio, and upload. Deadline **Aug 31, 2026**.
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
