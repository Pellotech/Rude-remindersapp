---
name: Refactor verification workflow
description: How the user ships refactors via an external Claude, and the TypeScript error baseline.
---

# Refactor verification workflow

The user (Mohammed, novice/learner) has an external Claude author refactored files, uploads them plus a HOW_TO_APPLY markdown to `attached_assets/`, and expects me to copy files into place, verify, and report in plain language.

**Why:** He wants to avoid over-prompting; my role is placement + verification, not re-authoring.

**How to apply:** On each round: copy files, run `npx tsc --noEmit` and compare against the pre-existing baseline (~71 errors repo-wide — known debt, not regressions), check workflow/browser logs, run an architect review, then summarize simply. The vite `wss://localhost:undefined` unhandledrejection in browser logs is a known harmless dev artifact.

Mobile note: shipping UI changes to iOS/Android requires the user to rebuild on his Mac (`git pull`, `npm install` if deps changed, `npm run build`, `npx cap sync ios|android`).

**DB schema gotcha:** External Claude commits sometimes add columns to `shared/schema.ts` without updating the database. Symptom: mobile app shows the "No internet connection" screen (auth query fails, misread as offline). Fix: `npm run db:push` (dev and prod share the same Neon DB, one push covers both). Check `git log -- shared/schema.ts` after any Claude upload.
