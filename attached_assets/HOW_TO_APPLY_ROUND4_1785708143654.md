# Round 4: Merge free + premium into one home page

This is the big one. Five files. **Test both plans before deleting anything.**

## 1. Add three new components
Upload into `client/src/components/`:

- `AnalyticsLocked.tsx` — the free plan's blurred analytics teaser + upgrade CTA
- `FreePlanUsage.tsx` — the free plan's usage card at the page bottom
- `CreateTooltip.tsx` — the "First reminder?" tip (shared by both plans)

## 2. Add the merged page
Upload into `client/src/pages/`:

- `home.tsx` — the single home page for both plans

## 3. Replace the router
Replace `client/src/App.tsx` with the new one. The only change is:

```
- return isPremium ? <HomePremium /> : <HomeFree />;
+ return <Home isPremium={isPremium} />;
```

## 4. Leave the old files alone for now
`home-free.tsx` and `home-premium.tsx` stay on disk. Nothing imports them anymore, so
they're inert — but they're your fallback. Delete them only after you've tested both plans.

---

## Test checklist — do BOTH plans

**As a free user:**
- greeting shows "⭐ Free" badge; badge color tracks the rudeness slider
- Rudy shows with the Upgrade button (no reaction bubble); pressing it opens /subscribe
- Analytics tab shows the blurred preview with "Unlock Analytics"; the button opens /subscribe
- "Free Plan Usage" card at the bottom shows X/15 reminders and the progress bar
- Upgrade button on that card opens /subscribe
- creating a reminder still counts toward the limit, and ads still appear
- completing a reminder shows "Reminder Completed / Great job getting it done!"

**As a premium user:**
- greeting shows "Premium 👑"
- Rudy reacts: move the slider (after ~1s), switch to Manage, switch to Analytics, start typing a title, tap voice/photo/quotes, create a reminder
- Analytics tab shows the REAL chart, level card, and six stat cards
- no ads beyond the banner; no "Free Plan Usage" card
- completing a reminder shows "Nice work! ✅"
- the motivational popup still appears

**Both:**
- first-timer tooltip shows once and stays dismissed
- changing default rudeness in Settings moves the slider live
- scrolling makes Rudy stick to the top

---

## What changed

| | before | after |
|---|---|---|
| home-free.tsx | 548 lines | (unused) |
| home-premium.tsx | 418 lines | (unused) |
| home.tsx | — | 518 lines |
| 3 new components | — | 236 lines |

Roughly the same total line count, but now there's **one** page instead of two near-copies —
so a layout change happens once, not twice.

## Finding what's gated

Search `home.tsx` for `isPremium` to see every single difference between the plans.
There's also a comment block at the top of the file listing all 8 gated features in plain English.

## Preserved differences (not "fixed")

You asked for exact preservation, so these pre-existing quirks were kept as-is rather than unified:
- completion/missed toast wording differs per plan
- free refreshes `/api/stats` after complete/missed; premium doesn't
- free closes the notification popup even on error; premium only on success
- premium's reminders query uses `staleTime: 0` / `refetchOnMount`

Say the word if you'd like any of these unified later — they're one-line changes now.

## Verified
- TypeScript: 72 errors before → **71 after**. Zero new errors; one pre-existing error in
  home-premium.tsx was fixed by properly typing the reminders query.
- Full production build (`vite build`): passes, 2,990 modules.
- Feature audit: all 22 distinctive markers (reward logic, ad config, Rudy events, toasts,
  limits, upgrade paths, AI gating) confirmed present in the merged code.
