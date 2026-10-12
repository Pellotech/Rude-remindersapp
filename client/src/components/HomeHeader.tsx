import { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import RudyWidget, { RudyEventType } from "@/components/RudyWidget";
import { RUDENESS_COLORS } from "@/components/RudenessSlider";
import { cn } from "@/lib/utils";

/**
 * HomeHeader — shared welcome header for the home pages.
 *
 * Owns: the "Hey {name}" greeting, the plan badge (colored by rudeness
 * level), the Rudy widget, and Rudy's sticky-on-scroll behavior (the
 * IntersectionObserver, the floating clone, and the visibility setting
 * listener all live here).
 *
 * The page only supplies the rudeness level and, depending on plan:
 *  - premium: the nudge event stream so Rudy reacts to page activity
 *  - free: an onPremiumPress handler for the upgrade button
 *
 * Usage (premium):
 *   <HomeHeader isPremium rudenessLevel={level} nudgeEvent={lastEvent}
 *               nudgeKey={eventKey} onNudgeHandled={() => setLastEvent(null)} />
 * Usage (free):
 *   <HomeHeader isPremium={false} rudenessLevel={level}
 *               onPremiumPress={() => setLocation('/subscribe')}
 *               className="mb-3 sm:mb-4" />
 */

interface HomeHeaderProps {
  /** Premium shows "Premium 👑" and a reactive Rudy; free shows "⭐ Free" and an upgrade button. */
  isPremium: boolean;
  /** Current rudeness level (1–5); colors the badge and Rudy's border. */
  rudenessLevel: number;
  /** Premium only: event for Rudy to react to. */
  nudgeEvent?: RudyEventType;
  /** Premium only: change this key to re-fire the same event. */
  nudgeKey?: number;
  /** Premium only: called after Rudy has handled the nudge. */
  onNudgeHandled?: () => void;
  /** Free only: called when the upgrade button on Rudy is pressed. */
  onPremiumPress?: () => void;
  /** Extra classes for the outer wrapper (e.g. to adjust margins). */
  className?: string;
}

export function HomeHeader({
  isPremium,
  rudenessLevel,
  nudgeEvent,
  nudgeKey,
  onNudgeHandled,
  onPremiumPress,
  className,
}: HomeHeaderProps) {
  const { user } = useAuth();

  const badgeColor = RUDENESS_COLORS[rudenessLevel] ?? RUDENESS_COLORS[3];
  const badgeTextColor = [1, 3].includes(rudenessLevel) ? '#111827' : '#FFFFFF';

  // ── Floating Reem behaviour ─────────────────────────────────────────────
  // ONE widget instance is always mounted (so Reem's bubble/pose never resets).
  // When its home spot scrolls off-screen it glides into a floating position;
  // tapping it (or the ×) sends it back home until the user scrolls back up.
  const homeRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [offScreen, setOffScreen] = useState(false);
  const [docked, setDocked] = useState(false);      // user sent it home
  const [leaving, setLeaving] = useState(false);    // playing the exit animation
  const [homeHeight, setHomeHeight] = useState<number | undefined>(undefined);
  const [rudyFloatingEnabled, setRudyFloatingEnabled] = useState(
    () => localStorage.getItem('rudy_widget_visible') !== 'false'
  );

  useEffect(() => {
    const handler = (e: Event) => setRudyFloatingEnabled((e as CustomEvent).detail);
    window.addEventListener('rudy_widget_visibility_changed', handler);
    return () => window.removeEventListener('rudy_widget_visibility_changed', handler);
  }, []);

  useEffect(() => {
    if (!homeRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const gone = !entry.isIntersecting;
        if (gone && widgetRef.current) {
          // Remember the real height so the page doesn't jump when it lifts off
          setHomeHeight(widgetRef.current.offsetHeight);
        }
        setOffScreen(gone);
        if (!gone) { setDocked(false); setLeaving(false); } // back in view → reset
      },
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );
    observer.observe(homeRef.current);
    return () => observer.disconnect();
  }, []);

  const floating = offScreen && rudyFloatingEnabled && !docked;

  const sendHome = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => { setDocked(true); setLeaving(false); }, 220);
  };

  const rudyWidget = isPremium ? (
    <RudyWidget
      nudgeEvent={nudgeEvent}
      nudgeKey={nudgeKey}
      onNudgeHandled={onNudgeHandled}
      borderColor={badgeColor}
    />
  ) : (
    <RudyWidget
      showReactionBubble={false}
      showPremiumButton={true}
      onPremiumPress={onPremiumPress}
      borderColor={badgeColor}
    />
  );

  return (
    <div className={cn("mb-4 sm:mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 flex flex-wrap items-center gap-2">
            <span className="truncate">Hey {(user as any)?.nickname || (user as any)?.firstName || (user as any)?.username || 'there'}</span>
            <Badge
              className={isPremium ? "text-xs flex-shrink-0" : "text-xs flex-shrink-0 border-0"}
              style={{
                backgroundColor: badgeColor,
                color: badgeTextColor,
                transition: 'background-color 0.3s ease, color 0.3s ease',
              }}
            >
              {isPremium ? (
                <>Premium 👑</>
              ) : (
                <>
                  <Star className="h-3 w-3 mr-1" />
                  Free
                </>
              )}
            </Badge>
          </h1>
        </div>
      </div>
      {/* Home spot keeps its height while Reem floats, so nothing below jumps */}
      <div ref={homeRef} style={{ minHeight: floating ? homeHeight : undefined }}>
        <div
          ref={widgetRef}
          className={floating ? (leaving ? 'reem-float-out' : 'reem-float-in') : undefined}
          style={floating ? {
            position: 'fixed',
            top: 60,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: '0 16px',
            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.18))',
          } : undefined}
          // While floating, a tap sends Reem home instead of triggering her tap reaction
          onClickCapture={floating ? (e) => {
            const t = e.target as HTMLElement;
            if (t.closest('[data-reem-keep-tap]')) return; // e.g. Go Premium button
            e.stopPropagation();
            e.preventDefault();
            sendHome();
          } : undefined}
        >
          <div className={floating ? 'md:px-[20%]' : undefined} style={{ position: 'relative' }}>
            {rudyWidget}
            {floating && (
              <button
                type="button"
                aria-label="Send Reem back"
                onClick={sendHome}
                style={{
                  position: 'absolute', top: 0, right: -6,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#FFFFFF', border: '2px solid #C9A063',
                  color: '#6B3410', fontSize: 13, fontWeight: 700, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer',
                }}
                data-testid="button-reem-dock"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeHeader;
