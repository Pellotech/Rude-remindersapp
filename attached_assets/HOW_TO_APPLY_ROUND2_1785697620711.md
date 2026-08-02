# Round 2: AnalyticsPanel extraction — how to apply in Replit

Same process as the slider. Two files. The app will look and behave identically after.

## 1. Add the new file
Upload `AnalyticsPanel.tsx` into:

```
client/src/components/AnalyticsPanel.tsx
```

(Files panel → open `client/src/components` → three-dot menu → Upload file.)

## 2. Replace the modified file
Replace `client/src/pages/home-premium.tsx` with the new `home-premium.tsx` (upload over it, or paste the full contents).

Note: this is in the `pages` folder, not `components`.

## 3. Verify
Run the app, sign in to the premium home page, open the Analytics tab, and check:

- the "My Journey" chart renders with the This Week / 10 Weeks / This Year switcher
- switching to 10 Weeks or This Year scrolls the chart to the most recent bars and makes Rudy react
- the level/motivation card (Rookie/Consistent/etc.) shows with its progress bar
- the six stat cards (Completion Rate, Streak, Best Day, Total Done, Active, Avg Rudeness) show correct numbers
- the first-visit tooltip: if you've dismissed it before, it stays gone
- everything else on the page (slider, badge, Rudy, Create/Manage tabs) is untouched

## What changed

- New `AnalyticsPanel.tsx` (515 lines): the entire Analytics tab content, now self-contained. It fetches its own data (react-query dedupes it, so no extra network requests) and owns the graph tab state, the tooltip, and the scroll behavior. It talks to the page through a single optional callback for Rudy reactions.
- `home-premium.tsx`: shrank from 983 to 493 lines. The analytics tab is now 1 line: `<AnalyticsPanel onRudyEvent={fireEvent} />`. Removed the ~440 inline lines plus the analytics-only state, effects, queries, and chart imports.

## What this unlocks
The Analytics panel can now be dropped anywhere — a different tab position, a dedicated page, even the free home page later. And home-premium.tsx is half its old size, which makes every future change to that page easier.
