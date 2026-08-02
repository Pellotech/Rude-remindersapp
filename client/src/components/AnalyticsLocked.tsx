import { TrendingUp } from "lucide-react";
import rudeRemindersLogo from '@assets/translusant_logo2_1767108484844.png';

/**
 * AnalyticsLocked — the free plan's Analytics tab.
 *
 * A blurred, fake-data preview of the real analytics with an upgrade
 * overlay on top. Purely presentational: the only thing it needs from
 * the page is what to do when "Unlock Analytics" is pressed.
 *
 * The real (premium) version lives in AnalyticsPanel.tsx.
 */

interface AnalyticsLockedProps {
  /** Called when the user presses "Unlock Analytics". */
  onUpgrade: () => void;
}

export function AnalyticsLocked({ onUpgrade }: AnalyticsLockedProps) {
  return (
    <div className="relative">
      {/* Blurred analytics preview */}
      <div className="blur-sm pointer-events-none select-none opacity-60 space-y-4">
        {/* Fake graph card */}
        <div className="border border-[#C9A063] rounded-xl p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[#C9A063]" />
            <span className="text-sm font-semibold text-gray-900">Completions</span>
          </div>
          <div className="flex rounded-xl border-2 border-[#C9A063] overflow-hidden mb-4">
            {["This Week", "This Year", "10 Weeks"].map((label, i) => (
              <div key={label} className={`flex-1 py-1 text-center text-[11px] font-semibold ${i === 0 ? "bg-[#C9A063] text-white" : "bg-white text-[#C9A063]"} ${i !== 0 ? "border-l border-[#C9A063]" : ""}`}>
                {label}
              </div>
            ))}
          </div>
          {/* Fake chart bars */}
          <div className="h-[140px] flex items-end justify-around gap-1 px-2">
            {[3, -1, 4, -2, 5, 1, -1].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-center gap-0.5">
                {v > 0 && <div className="w-full rounded-sm bg-[#C53B3B]" style={{ height: `${v * 14}px` }} />}
                <div className="w-full h-[2px] bg-gray-800" />
                {v < 0 && <div className="w-full rounded-sm bg-[#9CA3AF]" style={{ height: `${Math.abs(v) * 14}px` }} />}
              </div>
            ))}
          </div>
        </div>
        {/* Fake encouragement */}
        <div className="border border-[#C9A063] bg-[#FDF8F0] rounded-xl p-3 text-center">
          <p className="text-sm text-gray-700 font-medium">You're crushing it — keep that line climbing! 🔥</p>
        </div>
        {/* Fake stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Completion Rate", "72%", "13 of 18 done"],
            ["Current Streak", "5", "days in a row"],
            ["Best Day", "Wed", "most completions"],
            ["Total Done", "18", "all time"],
            ["Active", "4", "upcoming reminders"],
            ["Avg Rudeness", "3.6", "out of 5.0"],
          ].map(([label, value, sub]) => (
            <div key={label} className="border border-[#C9A063] rounded-xl p-3 bg-white">
              <p className="text-[11px] text-gray-500 mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-[10px] text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="bg-white border-2 border-[#C9A063] rounded-2xl shadow-xl px-6 py-6 text-center max-w-xs mx-auto">
          <img src={rudeRemindersLogo} alt="Rude Reminders" className="w-12 h-12 mx-auto object-contain mb-3" />
          <h3 className="font-bold text-gray-900 text-base mb-1">Analytics Locked</h3>
          <p className="text-sm text-gray-500 mb-4">Rude Reminders is the first of its kind habit-building app. These analytics show you exactly how consistent you're being — streaks, completion rates, and your best days. Because what gets measured, gets done.</p>
          <button
            onClick={onUpgrade}
            className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white font-semibold py-2.5 px-6 rounded-full text-sm transition-colors"
          >
            Unlock Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsLocked;
