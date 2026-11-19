import { Capacitor } from "@capacitor/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

import { tr } from "@/i18n";
/**
 * FreePlanUsage — the "Free Plan Usage" card shown at the bottom of the
 * home page for free users only. Shows reminders used this month, any
 * bonus reminders earned from ads, a progress bar, and an Upgrade button.
 *
 * Presentational: the page supplies the numbers and the upgrade handler.
 */

interface FreePlanUsageProps {
  /** Reminders created this month. */
  used: number;
  /** Total allowed this month (base limit + ad bonuses). */
  limit: number;
  /** Bonus reminders earned from watching ads (shown as a "+N bonus" pill). */
  bonusReminders: number;
  /** Called when the Upgrade button is pressed. */
  onUpgrade: () => void;
}

export function FreePlanUsage({ used, limit, bonusReminders, onUpgrade }: FreePlanUsageProps) {
  const pct = Math.round((used / limit) * 100);

  return (
    <div
      className="container mx-auto px-4 md:px-[20%] max-w-7xl"
      style={{ paddingBottom: Capacitor.getPlatform() === 'android' ? '150px' : '80px' }}
    >
      <Card className="bg-white border-reem-line rounded-[20px] shadow-[var(--rr-card-shadow)] dark:bg-reem-concrete-widget dark:border-reem-concrete-edge">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-reem-ink dark:text-reem-concrete-text">{tr("usage.freePlanUsage")}</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-reem-red" />
                  <span className="text-reem-text-muted dark:text-reem-concrete-muted">{tr("usage.remindersThisMonth", { used, limit })}</span>
                  {bonusReminders > 0 && (
                    <span className="text-xs bg-reem-paper text-reem-ink px-2 py-1 rounded-full border border-reem-line">
                      {tr("usage.bonus", { count: bonusReminders })}
                    </span>
                  )}
                </div>
              </div>
              {/* Progress bar for reminders */}
              <div className="w-48">
                <div className="flex justify-between text-xs text-blue-600 dark:text-blue-300 mb-1">
                  <span>{tr("usage.remindersUsed")}</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-reem-concrete-edge rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-reem-concrete-ocean h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0 text-sm font-semibold shadow-lg border-2 border-red-700 px-6"
              onClick={onUpgrade}
            >
              <span className="whitespace-nowrap">{tr("usage.upgrade")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FreePlanUsage;
