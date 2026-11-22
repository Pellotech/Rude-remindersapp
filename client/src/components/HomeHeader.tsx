import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import RudyWidget, { RudyEventType } from "@/components/RudyWidget";
import { RUDENESS_COLORS } from "@/components/RudenessSlider";
import { cn } from "@/lib/utils";

import { palette } from "@/lib/theme";
import { tr } from "@/i18n";
/**
 * HomeHeader — shared welcome header for the home pages.
 *
 * Owns: the "Hey {name}" greeting, the plan badge (colored by rudeness
 * level) and Reem, who sits on the banner's bottom edge above the greeting
 * and walks in from the left to react (RudyWidget).
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
  const badgeTextColor = [1, 3].includes(rudenessLevel) ? palette.ink : '#FFFFFF';

  // Reem: sits on the banner's bottom edge and walks in to react (see RudyWidget)
  const rudyWidget = (
    <RudyWidget
      isPremium={isPremium}
      nudgeEvent={nudgeEvent}
      nudgeKey={nudgeKey}
      onNudgeHandled={onNudgeHandled}
      onPremiumPress={onPremiumPress}
      borderColor={badgeColor}
    />
  );

  return (
    <div className={cn("relative mb-4 sm:mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 flex flex-wrap items-center gap-2">
            <span className="truncate">{tr("header.hey", { name: (user as any)?.nickname || (user as any)?.firstName || (user as any)?.username || tr("header.there") })}</span>
            <Badge
              className={isPremium ? "text-xs flex-shrink-0" : "text-xs flex-shrink-0 border-0"}
              style={{
                backgroundColor: badgeColor,
                color: badgeTextColor,
                transition: 'background-color 0.3s ease, color 0.3s ease',
              }}
            >
              {isPremium ? (
                <>{tr("header.premium")}</>
              ) : (
                <>
                  <Star className="h-3 w-3 mr-1" />
                  {tr("header.free")}
                </>
              )}
            </Badge>
          </h1>
        </div>
      </div>
      {rudyWidget}
    </div>
  );
}

export default HomeHeader;
