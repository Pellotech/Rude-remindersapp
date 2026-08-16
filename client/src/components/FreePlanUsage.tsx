import { Capacitor } from "@capacitor/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

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
      style={{ paddingBottom: Capacitor.getPlatform() === 'android' ? '130px' : '80px' }}
    >
      <Card className="bg-white border-[#EAEAEA] rounded-[20px] shadow-[var(--rr-card-shadow)]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-[#111827]">Free Plan Usage</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#C53B3B]" />
                  <span className="text-[#6B7280]">{used}/{limit} reminders this month</span>
                  {bonusReminders > 0 && (
                    <span className="text-xs bg-[#F9FAFB] text-[#111827] px-2 py-1 rounded-full border border-[#EAEAEA]">
                      +{bonusReminders} bonus
                    </span>
                  )}
                </div>
              </div>
              {/* Progress bar for reminders */}
              <div className="w-48">
                <div className="flex justify-between text-xs text-blue-600 mb-1">
                  <span>Reminders Used</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0 text-sm font-semibold shadow-lg border-2 border-red-700 px-6"
              onClick={onUpgrade}
            >
              <span className="whitespace-nowrap">Upgrade</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FreePlanUsage;
