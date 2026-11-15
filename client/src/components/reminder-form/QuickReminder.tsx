// Create Reminder form: the Quick Reminder drawer (10s · 5m · 15m · 30m).
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Zap, ChevronDown } from "lucide-react";
import { getPlatformInfo } from "@/utils/platformDetection";
import { QUICK_TIMES } from "./schema";

export function QuickReminder({ onPick }: { onPick: (option: (typeof QUICK_TIMES)[number]) => void }) {
  const [quickReminderOpen, setQuickReminderOpen] = useState(false);
  const quickReminderRef = useRef<HTMLDivElement>(null);
  const platformInfo = getPlatformInfo();

  return (
    <Collapsible
      open={quickReminderOpen}
      onOpenChange={(open) => {
        setQuickReminderOpen(open);
        if (open) {
          // After the drawer finishes opening, scroll so the 10s/5m/15m/30m buttons
          // sit above the bottom ad banner / nav bar instead of hiding behind it.
          window.setTimeout(() => {
            quickReminderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 340);
        }
      }}
    >
      <div
        ref={quickReminderRef}
        style={{ scrollMarginBottom: platformInfo.isAndroid ? 170 : 120 }}
      >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-medium rounded-lg px-4 py-3 bg-white text-reem-charcoal border border-reem-gold hover:bg-reem-cream hover:text-reem-charcoal focus-visible:ring-0 focus-visible:border-reem-gold"
          data-testid="button-quick-reminder"
        >
          <span className="flex items-center">
            <Zap className="mr-2 h-4 w-4" />
            Quick Reminder
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${quickReminderOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="quick-drawer">
        <div className="mt-2 p-4 bg-reem-cream rounded-lg border border-reem-cream">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_TIMES.map((option) => (
            <Button
              key={option.shortLabel}
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center justify-center p-2 h-10 bg-white hover:bg-reem-cream border border-reem-gold hover:border-reem-gold-dark text-reem-charcoal font-semibold text-sm rounded-lg"
              onClick={() => onPick(option)}
            >
              {option.shortLabel}
            </Button>
          ))}
        </div>
        </div>
      </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
