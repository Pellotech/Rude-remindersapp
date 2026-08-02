# Round 3: HomeHeader extraction — how to apply in Replit

Three files this time (one new, two replaced). This is the first round that touches BOTH home pages.

## 1. Add the new file
Upload `HomeHeader.tsx` into:

```
client/src/components/HomeHeader.tsx
```

## 2. Replace the two page files
Both go in the `pages` folder, not `components`:

```
client/src/pages/home-premium.tsx
client/src/pages/home-free.tsx
```

## 3. Verify

**On the premium home page:**
- greeting reads "Hey {your name}" with the "Premium 👑" badge next to it
- badge color still changes when you move the rudeness slider
- Rudy appears under the greeting, with a border matching the badge color
- scroll down: Rudy detaches and floats at the top of the screen
- Rudy still reacts to slider changes, tab switches, and analytics tab switches
- if you've turned Rudy's floating off in settings, it stays off

**On the free home page:**
- greeting reads "Hey {your name}" with the "⭐ Free" badge
- Rudy shows with the upgrade/premium button, and pressing it goes to the subscribe page
- Rudy has NO reaction bubble (free behavior, unchanged)
- sticky/floating scroll behavior works the same

## What changed

- New `HomeHeader.tsx` (149 lines): owns the greeting, the plan badge, the Rudy widget, and all of Rudy's sticky-scroll machinery (the IntersectionObserver, the floating clone, and the visibility-setting listener). Takes an `isPremium` flag to decide badge text and which Rudy variant to show.
- `home-premium.tsx`: 493 → 418 lines
- `home-free.tsx`: 626 → 548 lines
- Removed from both pages: the duplicated rudeness color map, badge color math, sticky-Rudy state, and two effects each.

## One deliberate fix included

The two pages had drifted: the free page's level-5 rudeness color was `#C53B3B` (a lighter red) while premium used `#b70d0d` (deep red). Both now use the shared `#b70d0d` from `RudenessSlider`. So on the free page, the badge at Savage (level 5) will look slightly deeper red than before — that's intentional, matching premium. If you preferred the old free-page color, say so and I'll make it configurable.

## Verified
- TypeScript: 72 pre-existing errors before and after — no new ones.
- Full production build (`vite build`): passes, 2,988 modules, no errors.
