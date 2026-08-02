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

  // Sticky Rudy behavior — all internal
  const rudyRef = useRef<HTMLDivElement>(null);
  const [rudySticky, setRudySticky] = useState(false);
  const [rudyFloatingEnabled, setRudyFloatingEnabled] = useState(
    () => localStorage.getItem('rudy_widget_visible') !== 'false'
  );

  useEffect(() => {
    const handler = (e: Event) => {
      setRudyFloatingEnabled((e as CustomEvent).detail);
    };
    window.addEventListener('rudy_widget_visibility_changed', handler);
    return () => window.removeEventListener('rudy_widget_visibility_changed', handler);
  }, []);

  useEffect(() => {
    if (!rudyRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRudySticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );
    observer.observe(rudyRef.current);
    return () => observer.disconnect();
  }, []);

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
            <span className="truncate">Hey {(user as any)?.firstName || (user as any)?.username || 'there'}</span>
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
      <div ref={rudyRef} style={{ height: rudySticky ? '120px' : 'auto' }}>
        {!rudySticky && rudyWidget}
      </div>
      {rudySticky && rudyFloatingEnabled && (
        <div
          className="fixed top-[60px] left-0 right-0 z-50 px-4 md:px-[20%]"
          style={{
            backgroundColor: 'transparent',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            animation: 'rudySlideIn 0.2s ease',
            pointerEvents: 'none',
          }}>
          <div style={{ pointerEvents: 'auto' }}>
            {rudyWidget}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeHeader;
