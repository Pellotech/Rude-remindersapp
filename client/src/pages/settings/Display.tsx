import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Home, Search } from "lucide-react";
import { useLocation } from "wouter";
import { getPlatformInfo } from "@/utils/platformDetection";
import { queryClient } from "@/lib/queryClient";
import { getTextSize, setTextSize, type TextSize } from "@/lib/textSize";
import { TextSizeTiles } from "@/components/settings/TextSizeTiles";
import {
  FIXED_OFFSET_ZONES,
  describeTimeZone,
  getDeviceTimeZone,
    getManualTimeZone,
  setManualTimeZone,
} from "@/lib/timeZone";

// Used when the phone can't list every zone itself (older Android WebViews).
const FALLBACK_ZONES = [
  "Pacific/Honolulu", "America/Anchorage", "America/Vancouver", "America/Los_Angeles",
  "America/Edmonton", "America/Denver", "America/Phoenix", "America/Regina", "America/Winnipeg",
  "America/Chicago", "America/Mexico_City", "America/Toronto", "America/New_York", "America/Halifax",
  "America/St_Johns", "America/Bogota", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "Atlantic/Reykjavik", "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Paris",
  "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Stockholm",
  "Europe/Athens", "Europe/Istanbul", "Europe/Moscow", "Africa/Lagos", "Africa/Cairo",
  "Africa/Johannesburg", "Africa/Nairobi", "Asia/Riyadh", "Asia/Dubai", "Asia/Tehran",
  "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok", "Asia/Jakarta", "Asia/Singapore",
  "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Manila", "Asia/Seoul", "Asia/Tokyo", "Australia/Perth",
  "Australia/Adelaide", "Australia/Brisbane", "Australia/Sydney", "Pacific/Auckland",
];

function listTimeZones(): string[] {
  let named = FALLBACK_ZONES;
  try {
    const all = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
    if (all && all.length > 50) named = all;
  } catch { /* not supported */ }
  const seen = new Set(named);
  return [...named, ...FIXED_OFFSET_ZONES.filter((z) => !seen.has(z))];
}

function clockIn(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Section({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">{title}</h2>
      <div className="bg-ui-card rounded-xl overflow-hidden border border-reem-gold/40">{children}</div>
      {footer && <p className="text-note text-ui-label-2 px-4 mt-2 leading-snug">{footer}</p>}
    </div>
  );
}

function ChoiceRow({ label, detail, selected, onClick, last, testId }: {
  label: string; detail?: string; selected: boolean; onClick: () => void; last?: boolean; testId?: string;
}) {
  return (
    <div
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      className={`flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer hover:bg-ui-raised transition-colors ${last ? "" : "border-b border-ui-separator"}`}
      data-testid={testId}
    >
      <div className="min-w-0">
        <div className="text-white text-body-lg break-words">{label}</div>
        {detail && <div className="text-note text-ui-label-2 mt-0.5 break-words">{detail}</div>}
      </div>
      {selected && <Check className="h-5 w-5 flex-shrink-0 text-reem-gold" />}
    </div>
  );
}

export default function Display() {
  const { isAndroid, isIOS } = getPlatformInfo();
  const [, setLocation] = useLocation();

  // Every change applies and saves straight away — no Save button.
  const [textSize, setTextSizeState] = useState<TextSize>(getTextSize);
  const [manualZone, setManualZoneState] = useState<string | null>(getManualTimeZone);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [, setTick] = useState(0);

  // Keep the "it's 7:25 PM there" line fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const deviceZone = getDeviceTimeZone();
  // Built only when the list is opened: each zone with its label and search text.
  const zones = useMemo(() => {
    if (!picking) return [];
    return listTimeZones().map((id) => {
      const label = describeTimeZone(id);
      const place = id.startsWith("Etc/") || id === "UTC" ? "Fixed offset" : id.replace(/_/g, " ");
      return { id, label, place, haystack: `${label} ${place}`.toLowerCase() };
    });
  }, [picking]);
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? zones.filter((z) => z.haystack.includes(q)) : zones;
    return list.slice(0, 60);
  }, [zones, search]);

  const chooseTextSize = (size: TextSize) => {
    setTextSizeState(size);
    setTextSize(size); // whole app + reminder popup, saved on this phone
  };

  const chooseZone = (tz: string | null) => {
    setManualZoneState(tz);
    setPicking(false);
    setSearch("");
    if (tz === manualZone) return;
    setManualTimeZone(tz);
    // Stats, "today" and the reminder lists depend on the zone — reload them.
    queryClient.invalidateQueries();
  };

  const activeZone = manualZone || deviceZone;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setLocation("/settings")} className="flex items-center text-ui-link" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-body-lg">Settings</span>
            </button>
            <button onClick={() => setLocation("/")} className="text-ui-link" data-testid="button-home" aria-label="Home">
              <Home className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-[30px] leading-tight font-bold text-white px-4">Text Size & Time Zone</h1>
          <p className="text-note text-ui-label-2 px-4 pb-2">Changes save automatically.</p>
        </div>

        <div className="py-6 px-4 space-y-8" style={{ paddingBottom: isAndroid ? 120 : isIOS ? 80 : 24 }}>
          <Section
            title="Text Size"
            footer="Makes the words bigger everywhere in the app, including your reminders. It changes straight away. You can also change this in Settings → Notifications."
          >
            <div className="px-4 py-3">
              <TextSizeTiles value={textSize} onChange={chooseTextSize} />
            </div>
          </Section>

          <Section
            title="Time Zone"
            footer={
              <>
                Reminder times are set and shown in this time zone. Right now it's {clockIn(activeZone)} there.
                If that doesn't match your clock, choose a time zone yourself. Reminders you
                already made still go off at the same moment.
              </>
            }
          >
            <div role="radiogroup" aria-label="Time zone">
              <ChoiceRow
                label="Automatic"
                detail={`Uses your phone: ${describeTimeZone(deviceZone)}`}
                selected={!manualZone}
                onClick={() => chooseZone(null)}
                testId="time-zone-automatic"
              />
              <ChoiceRow
                label="Choose a time zone"
                detail={manualZone ? describeTimeZone(manualZone) : "Pick one yourself if the time looks wrong"}
                selected={!!manualZone}
                onClick={() => setPicking((p) => !p)}
                last={!picking}
                testId="time-zone-manual"
              />
            </div>

            {picking && (
              <div>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-ui-separator">
                  <Search className="h-4 w-4 flex-shrink-0 text-ui-label-2" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search a city, or type UTC"
                    aria-label="Search time zones"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="flex-1 min-w-0 bg-transparent text-white text-body-lg placeholder-ui-label-2 outline-none"
                    data-testid="time-zone-search"
                  />
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {matches.length === 0 && (
                    <div className="px-4 py-3.5 text-body text-ui-label-2">No time zone found. Try a big city nearby.</div>
                  )}
                  {matches.map((z, i) => (
                    <ChoiceRow
                      key={z.id}
                      label={z.label}
                      detail={z.place}
                      selected={manualZone === z.id}
                      onClick={() => chooseZone(z.id)}
                      last={i === matches.length - 1}
                      testId={`time-zone-option-${z.id}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
