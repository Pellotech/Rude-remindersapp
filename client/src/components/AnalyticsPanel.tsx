import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { RudyEventType } from "@/components/RudyWidget";
import { cn } from "@/lib/utils";

/**
 * AnalyticsPanel — self-contained analytics tab content.
 *
 * Owns everything analytics: the completion graph (with week/10-weeks/year
 * switcher), the habit-level card, the stats grid, the first-visit tooltip,
 * and its own data fetching (react-query dedupes these against any queries
 * the page already runs, so there's no extra network cost).
 *
 * It has no knowledge of the page around it. Drop it anywhere:
 *   <AnalyticsPanel onRudyEvent={fireEvent} />
 */

interface AnalyticsPanelProps {
  /** Optional: notified when the user switches graph tabs, so the page can make Rudy react. */
  onRudyEvent?: (event: RudyEventType) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

export function AnalyticsPanel({ onRudyEvent, className }: AnalyticsPanelProps) {
  const [graphTab, setGraphTab] = useState<"week" | "year" | "tenWeeks">("week");
  const [showTooltip, setShowTooltip] = useState(
    () => !localStorage.getItem("analytics_tooltip_seen")
  );
  const graphScrollRef = useRef<HTMLDivElement>(null);

  // Data — deduped by react-query against identical queries elsewhere
  const { data: reminders = [] } = useQuery({
    queryKey: ["/api/reminders"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: graphData } = useQuery({
    queryKey: ["/api/stats/completion-graph"],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Scroll graph to the end (most recent) when switching to a scrollable range
  useEffect(() => {
    if (graphTab !== "week" && graphScrollRef.current) {
      graphScrollRef.current.scrollLeft = graphScrollRef.current.scrollWidth;
    }
  }, [graphTab]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* One-time Rudy tooltip — first Analytics visit only */}
      {showTooltip && (
        <div style={{
          background: 'white',
          border: '2px solid #C9A063',
          borderRadius: '12px',
          padding: '10px 12px',
          fontSize: '11px',
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          position: 'relative',
        }}>
          <img src="/rudy/Rudy_sitting_upright_transparent.png" alt="Rudy" style={{ width: 36, height: 36, mixBlendMode: 'multiply', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>This is your habit journey. Every time you tap done or missed, it logs here. The 10 Weeks graph is where habits are built — science says day 66 is the magic number. 🔥</span>
          <button
            onClick={() => { localStorage.setItem('analytics_tooltip_seen', 'true'); setShowTooltip(false); }}
            style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#999', lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* ── COMPLETION GRAPH ── */}
      <Card className="border border-[#C9A063] bg-[#FDF3E3]">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#C9A063]" />
            <CardTitle className="text-sm font-semibold text-[#C9A063]">My Journey</CardTitle>
          </div>
          {/* Graph tab switcher */}
          <div className="flex rounded-xl border-2 border-[#C9A063] overflow-hidden">
            {(["week", "tenWeeks", "year"] as const).map((t, i) => {
              const labels = ["This Week", "10 Weeks", "This Year"];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setGraphTab(t);
                    const evMap: Record<string, RudyEventType> = { week: "analytics_this_week", tenWeeks: "analytics_10_weeks", year: "analytics_this_year" };
                    const ev = evMap[t]; if (ev) onRudyEvent?.(ev);
                  }}
                  className={`flex-1 py-1 text-[11px] font-semibold transition-all ${
                    graphTab === t
                      ? "bg-[#C9A063] text-[#111827]"
                      : "bg-white text-[#111827] hover:bg-[#FDF8F0]"
                  } ${i !== 0 ? "border-l border-[#C9A063]" : ""}`}
                >
                  {labels[i]}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-1">
          <p className="text-[10px] text-gray-400 text-center mb-1">Blue = positive day · Red = missed day</p>
          {(() => {
            const pts = ((graphData as any)?.[graphTab] ?? []).map((pt: any) => {
              const completed = pt.completed ?? 0;
              const missed = Math.abs(pt.incomplete ?? 0);
              let net = completed + (pt.incomplete ?? 0);
              // Ensure any active period renders a visible bar
              // (a true net of 0 with activity would otherwise be invisible)
              if (net === 0 && (completed > 0 || missed > 0)) {
                net = completed >= missed ? 0.4 : -0.4;
              }
              return { ...pt, net };
            });
            const currentMonthAbbrev = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()];
            const needsScroll = graphTab !== "week";
            const chartWidth = Math.max(320, pts.length * 48);
            const margin = { top: 8, right: 12, left: -16, bottom: 0 };
            const getBarColor = (entry: any) => {
              // Positive net (more completed than missed) → blue
              // Negative or zero net with activity → red
              if (entry.net > 0) return '#0025CC';
              if (entry.net < 0) return '#C53B3B';
              return '#E5E7EB';
            };
            // Y-axis bounds: fixed ±40 for the year view (bars stay proportional
            // across the whole year so growth is visible). Other tabs use a
            // dynamic bound so short ranges still read clearly.
            const maxCompleted = Math.max(0, ...pts.map((p: any) => p.completed ?? 0));
            const maxMissed = Math.max(0, ...pts.map((p: any) => Math.abs(p.incomplete ?? 0)));
            const yTop = graphTab === "year"
              ? 20
              : Math.max(6, Math.ceil(maxCompleted * 1.1));
            const yBottom = graphTab === "year"
              ? -10
              : -Math.max(4, Math.ceil(maxMissed * 1.1));
            const chartInternals = (w: number | undefined) => (
              <BarChart width={w} height={290} data={pts} margin={margin}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8D8" />
                <XAxis
                  dataKey="name"
                  tick={(props: any) => {
                    const { x, y, payload, index } = props;
                    const isHighlight = graphTab === "year" && payload.value === currentMonthAbbrev;
                    if (graphTab === "week") {
                      const todayNow = new Date();
                      const todayDow = todayNow.getDay();
                      const todayDiffToMon = (todayDow === 0 ? -6 : 1 - todayDow);
                      const weekStartDate = new Date(todayNow);
                      weekStartDate.setDate(todayNow.getDate() + todayDiffToMon);
                      weekStartDate.setHours(0, 0, 0, 0);
                      const dayDate = new Date(weekStartDate);
                      dayDate.setDate(weekStartDate.getDate() + index);
                      const monthAbbrevs = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      const dateLabel = `${monthAbbrevs[dayDate.getMonth()]} ${dayDate.getDate()}`;
                      const isToday = dayDate.toDateString() === todayNow.toDateString();
                      return (
                        <g>
                          <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fill={isToday ? "#C9A063" : "#9CA3AF"} fontWeight={isToday ? 700 : 400}>
                            {payload.value}
                          </text>
                          <text x={x} y={y + 22} textAnchor="middle" fontSize={9} fill={isToday ? "#C9A063" : "#b0b7c3"}>
                            {dateLabel}
                          </text>
                        </g>
                      );
                    }
                    return (
                      <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fill={isHighlight ? "#C9A063" : "#9CA3AF"} fontWeight={isHighlight ? 700 : 400}>
                        {payload.value}
                      </text>
                    );
                  }}
                  height={36}
                />
                <YAxis
                  domain={[yBottom, yTop]}
                  allowDecimals={false}
                  tick={{ fontSize: 9, fill: "#9CA3AF" }}
                />
                <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.[0]) return null;
                    const pt = payload[0].payload;
                    const completed = pt.completed ?? 0;
                    const missed = Math.abs(pt.incomplete ?? 0);
                    const net = pt.net ?? 0;
                    return (
                      <div style={{ border: '1.5px solid #C9A063', borderRadius: 8, background: 'white', padding: '8px 12px', fontSize: 12 }}>
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
                        <p>Completed: {completed} ✅</p>
                        <p>Missed: {missed} ❌</p>
                        <p>Net: {net > 0 ? `+${net}` : `${net}`}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="net"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={25}
                >
                  {pts.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry)}
                    />
                  ))}
                </Bar>
              </BarChart>
            );
            if (needsScroll) {
              return (
                <div ref={graphScrollRef} style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                  {chartInternals(chartWidth)}
                </div>
              );
            }
            return (
              <ResponsiveContainer width="100%" height={290}>
                {chartInternals(undefined) as any}
              </ResponsiveContainer>
            );
          })()}
          {/* Colour legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 10,
            color: '#9CA3AF',
            paddingLeft: 8,
            paddingTop: 4,
            paddingBottom: 2,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0025CC', display: 'inline-block' }} />
              Positive
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C53B3B', display: 'inline-block' }} />
              Missed
            </span>
          </div>
        </CardContent>
      </Card>
      {/* ── 66-DAY PROGRESS + LEVEL CARDS ── */}
      {(() => {
        const allReminders = reminders as any[];
        const firstReminderDate = allReminders.length > 0
          ? new Date(Math.min(...allReminders.map((r: any) => new Date(r.scheduledFor || r.createdAt).getTime())))
          : null;
        const daysActive = firstReminderDate
          ? Math.min(66, Math.floor((Date.now() - firstReminderDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        const progressPct = Math.round((daysActive / 66) * 100);
        const ringCircumference = 2 * Math.PI * 18;

        const getHabitLevel = (days: number) => {
          if (days >= 66) return { label: 'Champion',      emoji: '🏆', color: '#C9A063', next: null as string | null,  nextAt: 66 };
          if (days >= 45) return { label: 'Habit Builder', emoji: '⚡', color: '#F97316', next: 'Champion' as string | null,    nextAt: 66 };
          if (days >= 21) return { label: 'Consistent',    emoji: '🔥', color: '#C53B3B', next: 'Habit Builder' as string | null, nextAt: 45 };
          if (days >= 7)  return { label: 'Getting There', emoji: '💪', color: '#22C55E', next: 'Consistent' as string | null,  nextAt: 21 };
          return            { label: 'Rookie',             emoji: '🌱', color: '#38BDF8', next: 'Getting There' as string | null, nextAt: 7 };
        };
        const level = getHabitLevel(daysActive);
        const prevAtMap: Record<string, number> = { Rookie: 0, 'Getting There': 7, Consistent: 21, 'Habit Builder': 45, Champion: 66 };
        const prevAt = prevAtMap[level.label] ?? 0;
        const levelPct = level.next
          ? Math.max(0, Math.min(100, Math.round(((daysActive - prevAt) / (level.nextAt - prevAt)) * 100)))
          : 100;

        const currentData: any[] = (graphData as any)?.[graphTab] ?? [];
        const totalNet = currentData.reduce((sum: number, pt: any) => sum + (pt.completed ?? 0) + (pt.incomplete ?? 0), 0);
        const hasData = currentData.some((pt: any) => (pt.completed ?? 0) !== 0 || (pt.incomplete ?? 0) !== 0);

        let msg = "Every expert was once a beginner. Set your first reminder! 💪";
        if (graphTab === "week") {
          if (!hasData) msg = "Every expert was once a beginner. Set your first reminder! 💪";
          else if (totalNet > 0) msg = "Strong week! You're above the line 🔥";
          else if (totalNet === 0) msg = "Balanced week — push for more completions 🎯";
          else msg = "Tough week — tomorrow is a fresh start 💪";
        } else if (graphTab === "tenWeeks") {
          const weeksActive = firstReminderDate
            ? Math.floor((Date.now() - firstReminderDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
            : 0;
          if (!hasData || weeksActive < 1) msg = "Every expert was once a beginner. Set your first reminder! 💪";
          else if (weeksActive < 5) msg = "You're in the early stages — consistency is everything right now 🌱";
          else if (weeksActive < 10) msg = "You're approaching the habit formation zone — science says day 66 is where it clicks! 🔥";
          else msg = "You've hit the 10 week mark — your habits are starting to form automatically ⚡";
        } else {
          const monthsActive = firstReminderDate
            ? Math.floor((Date.now() - firstReminderDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
            : 0;
          if (!hasData || monthsActive < 1) msg = "Every journey starts with a single step. You're building something real 🌱";
          else if (monthsActive < 3) msg = "Every journey starts with a single step. You're building something real 🌱";
          else if (monthsActive < 6) msg = "3+ months of accountability. You're in the top 20% of people who stick with it 💪";
          else if (monthsActive < 9) msg = "Half a year of showing up. Your habits are genuinely changing who you are 👑";
          else if (monthsActive < 12) msg = "Almost a full year. You've built something most people only dream about 🏆";
          else msg = "One full year. You ARE the habit 🎯";
        }

        return (
          <>
            {/* 66-day progress card — HIDDEN, saved for later
            <div style={{
              background: '#FDF3E3',
              border: '1.5px solid #C9A063',
              borderRadius: 12,
              padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6B3410' }}>66-Day Habit Challenge</span>
                  <span style={{ fontSize: 11, color: '#C9A063' }}>Day {daysActive} of 66</span>
                </div>
                <svg width="44" height="44" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                  <circle
                    cx="22" cy="22" r="18" fill="none"
                    stroke="#C9A063" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${ringCircumference}`}
                    strokeDashoffset={`${ringCircumference * (1 - progressPct / 100)}`}
                    transform="rotate(-90 22 22)"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                  <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill="#6B3410">
                    {progressPct}%
                  </text>
                </svg>
              </div>
              <div style={{
                height: 6,
                borderRadius: 3,
                background: '#E5E7EB',
                marginTop: 8,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: 'linear-gradient(to right, #C9A063, #C53B3B)',
                  borderRadius: 3,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
            */}

            {/* Level / motivation card */}
            <div style={{
              background: 'white',
              border: `1.5px solid ${level.color}`,
              borderRadius: 12,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: level.color }}>
                  {level.emoji} {level.label}
                </span>
                <span style={{
                  background: `${level.color}26`,
                  color: level.color,
                  borderRadius: 20,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  Day {daysActive}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#374151', marginTop: 6, marginBottom: 0 }}>{msg}</p>
              {level.next && (
                <>
                  <div style={{
                    height: 4,
                    borderRadius: 2,
                    background: '#E5E7EB',
                    marginTop: 10,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${levelPct}%`,
                      background: level.color,
                      borderRadius: 2,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, marginBottom: 0 }}>
                    {levelPct}% to {level.next}
                  </p>
                </>
              )}
            </div>
          </>
        );
      })()}

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completion Rate */}
        <Card className="border border-[#C9A063]">
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {(reminders as any[]).length > 0
                ? Math.round(((reminders as any[]).filter((r: any) => r.completed).length / (reminders as any[]).length) * 100)
                : 0}%
            </p>
            <p className="text-[10px] text-gray-400">
              {(reminders as any[]).filter((r: any) => r.completed).length} of {(reminders as any[]).length} done
            </p>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card className="border border-[#C9A063]">
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 mb-1">Current Streak</p>
            <p className="text-2xl font-bold text-gray-900">{(stats as any)?.currentStreak ?? 0}</p>
            <p className="text-[10px] text-gray-400">days in a row</p>
          </CardContent>
        </Card>

        {/* Most Productive Day */}
        <Card className="border border-[#C9A063]">
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 mb-1">Best Day</p>
            <p className="text-lg font-bold text-gray-900 truncate">
              {(() => {
                const dc = (reminders as any[])
                  .filter((r: any) => r.completed && r.completedAt)
                  .reduce((acc: any, r: any) => {
                    const day = new Date(r.completedAt).toLocaleDateString("en-US", { weekday: "short" });
                    acc[day] = (acc[day] || 0) + 1;
                    return acc;
                  }, {});
                const entries = Object.entries(dc);
                if (!entries.length) return "—";
                return entries.reduce((a: any, b: any) => (a[1] > b[1] ? a : b))[0];
              })()}
            </p>
            <p className="text-[10px] text-gray-400">most completions</p>
          </CardContent>
        </Card>

        {/* Total Completed */}
        <Card className="border border-[#C9A063]">
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 mb-1">Total Done</p>
            <p className="text-2xl font-bold text-gray-900">
              {(reminders as any[]).filter((r: any) => r.completed).length}
            </p>
            <p className="text-[10px] text-gray-400">all time</p>
          </CardContent>
        </Card>

        {/* Active Reminders */}
        <Card className="border border-[#C9A063]">
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-gray-900">
              {(reminders as any[]).filter((r: any) => !r.completed && new Date(r.scheduledFor) >= new Date()).length}
            </p>
            <p className="text-[10px] text-gray-400">upcoming reminders</p>
          </CardContent>
        </Card>

        {/* Average Rudeness */}
        <Card className="border border-[#C9A063]">
          <CardContent className="p-3">
            <p className="text-[11px] text-gray-500 mb-1">Avg Rudeness</p>
            <p className="text-2xl font-bold text-gray-900">
              {(reminders as any[]).length > 0
                ? ((reminders as any[]).reduce((acc: number, r: any) => acc + (r.rudenessLevel || 3), 0) / (reminders as any[]).length).toFixed(1)
                : "3.0"}
            </p>
            <p className="text-[10px] text-gray-400">out of 5.0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsPanel;
