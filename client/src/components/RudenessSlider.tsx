import { useRef } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * RudenessSlider — self-contained rudeness level picker (1–5).
 *
 * Owns its own styling (colors, card background, emoji labels) and haptic
 * feedback. It has no knowledge of forms, pages, settings, or events — it
 * simply reports value changes via `onChange`. This means it can be placed
 * anywhere in the interface: inside ReminderForm, at the top of a home page,
 * in a modal, etc.
 *
 * Usage:
 *   <RudenessSlider value={level} onChange={setLevel} />
 */

export const RUDENESS_LABELS = [
  { level: 1, emoji: "😊", label: "Gentle" },
  { level: 2, emoji: "🙂", label: "Motivational" },
  { level: 3, emoji: "😏", label: "Sarcastic" },
  { level: 4, emoji: "😠", label: "Harsh" },
  { level: 5, emoji: "🤬", label: "Savage" },
] as const;

export const RUDENESS_COLORS: Record<number, string> = {
  1: "#38BDF8",
  2: "#22C55E",
  3: "#FDE047",
  4: "#F97316",
  5: "#b70d0d",
};

interface RudenessSliderProps {
  /** Current rudeness level (1–5). */
  value: number;
  /** Called with the new level whenever the user moves the slider. */
  onChange: (level: number) => void;
  /** Heading shown above the slider. Pass null to hide. */
  title?: string | null;
  /** Disable haptic feedback (on by default). */
  disableHaptics?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

export function RudenessSlider({
  value,
  onChange,
  title = "Rudeness Level",
  disableHaptics = false,
  className,
}: RudenessSliderProps) {
  const previousLevelRef = useRef<number>(value);
  const color = RUDENESS_COLORS[value] || "#38BDF8";

  const handleValueChange = (values: number[]) => {
    const newLevel = values[0];
    if (newLevel !== previousLevelRef.current) {
      previousLevelRef.current = newLevel;
      if (!disableHaptics) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    }
    onChange(newLevel);
  };

  return (
    <div
      className={cn("-mt-1", className)}
      style={{ "--slider-color": color } as React.CSSProperties}
    >
      <div className="px-4 pt-3 pb-5 bg-[#FDF3E3] rounded-lg">
        {title !== null && (
          <p className="text-sm font-medium text-[#1A1A1A] mb-3">{title}</p>
        )}
        <Slider
          min={1}
          max={5}
          step={1}
          value={[value]}
          onValueChange={handleValueChange}
          className="rudeness-slider"
        />

        {/* Emoji labels */}
        <div className="flex justify-between mt-3 text-xs text-[#1A1A1A]">
          {RUDENESS_LABELS.map((item) => {
            const isSelected = value === item.level;
            return (
              <div
                key={item.level}
                className="flex flex-col items-center transition-all"
              >
                <span
                  className={`mb-1 transition-all duration-200 ${
                    isSelected ? "text-3xl" : "text-lg"
                  }`}
                >
                  {item.emoji}
                </span>
                <span className={isSelected ? "font-bold" : ""}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RudenessSlider;
