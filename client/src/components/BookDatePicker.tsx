import { useState, useCallback, useRef } from "react";
import { addDays, isSameDay, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import rudeRemindersLogo from '@assets/translusant_logo2_1767108484844.png';

interface ScheduleResult {
  scheduledFor?: string;
  isMultiDay: boolean;
  selectedDays: string[];
  hasValidSchedule: boolean;
}

interface BookDatePickerProps {
  onScheduleChange: (result: ScheduleResult) => void;
  onDateEventFired?: (type: 'date_today' | 'date_tomorrow' | 'date_future') => void;
}

const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

const QUARTER_SLOTS = [
  { value: 0,  label: ":00" },
  { value: 15, label: ":15" },
  { value: 30, label: ":30" },
  { value: 45, label: ":45" },
];

export function BookDatePicker({ onScheduleChange, onDateEventFired }: BookDatePickerProps) {
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [displayIdx, setDisplayIdx]       = useState(0);
  const [isExiting, setIsExiting]         = useState(false);
  const [animDir, setAnimDir]             = useState<'forward' | 'backward'>('forward');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedHour, setSelectedHour]   = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date();
  const pages = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  /* ─── schedule-change emitter ──────────────────────────────────────── */
  const fireChange = useCallback(
    (dates: Date[], hour: number | null, minute: number) => {
      if (dates.length === 0) {
        onScheduleChange({ scheduledFor: undefined, isMultiDay: false, selectedDays: [], hasValidSchedule: false });
        return;
      }
      if (hour === null) {
        onScheduleChange({
          scheduledFor: undefined,
          isMultiDay: dates.length > 1,
          selectedDays: dates.map(d => DAY_NAMES[d.getDay()]),
          hasValidSchedule: false,
        });
        return;
      }
      if (dates.length === 1) {
        const dt = new Date(dates[0]);
        dt.setHours(hour, minute, 0, 0);
        onScheduleChange({ scheduledFor: dt.toISOString(), isMultiDay: false, selectedDays: [], hasValidSchedule: true });
      } else {
        onScheduleChange({
          scheduledFor: undefined,
          isMultiDay: true,
          selectedDays: dates.map(d => DAY_NAMES[d.getDay()]),
          hasValidSchedule: true,
        });
      }
    },
    [onScheduleChange],
  );

  /* ─── time slots ────────────────────────────────────────────────────── */
  const generateTimeSlots = () => {
    const now = new Date();
    const onlyTodaySelected = selectedDates.length === 1 && isSameDay(selectedDates[0], now);
    if (onlyTodaySelected) {
      const cur = now.getHours();
      return Array.from({ length: 23 - cur }, (_, i) => {
        const h = cur + 1 + i;
        return {
          value: h,
          display: h === 12 ? "12:00 PM" : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`,
        };
      });
    }
    return Array.from({ length: 24 }, (_, i) => ({
      value: i,
      display: i === 0 ? "12:00 AM" : i === 12 ? "12:00 PM" : i > 12 ? `${i - 12}:00 PM` : `${i}:00 AM`,
    }));
  };

  const isTimeInPast = (hour: number, minute = 0) => {
    if (selectedDates.length !== 1) return false;
    const now = new Date();
    if (!isSameDay(selectedDates[0], now)) return false;
    const slot = new Date(selectedDates[0]);
    slot.setHours(hour, minute, 0, 0);
    return slot < now;
  };

  /* ─── selection helpers ─────────────────────────────────────────────── */
  const getPageDate = (idx: number) => pages[idx - 1];

  const isPageSelected = (idx: number) =>
    idx > 0 && selectedDates.some(d => isSameDay(d, getPageDate(idx)));

  const currentDisplaySelected = isPageSelected(displayIdx);

  /* ─── navigation with slide animation ──────────────────────────────── */
  const navigate = (newIdx: number) => {
    if (newIdx === currentIdx || isExiting) return;
    if (navTimer.current) clearTimeout(navTimer.current);
    setAnimDir(newIdx > currentIdx ? 'forward' : 'backward');
    setIsExiting(true);
    setCurrentIdx(newIdx);
    navTimer.current = setTimeout(() => {
      setDisplayIdx(newIdx);
      setIsExiting(false);
    }, 240);
  };

  /* ─── select/deselect handler ───────────────────────────────────────── */
  const handleSelectBtn = () => {
    if (displayIdx === 0) { navigate(1); return; }

    const pageDate = getPageDate(displayIdx);
    const already  = selectedDates.some(d => isSameDay(d, pageDate));

    if (already) {
      const newDates = selectedDates.filter(d => !isSameDay(d, pageDate));
      setSelectedDates(newDates);
      fireChange(newDates, selectedHour, selectedMinute);
    } else {
      const newDates = [...selectedDates, pageDate];
      setSelectedDates(newDates);
      fireChange(newDates, selectedHour, selectedMinute);

      const now      = new Date();
      const tomorrow = addDays(today, 1);
      if (isSameDay(pageDate, now))           onDateEventFired?.('date_today');
      else if (isSameDay(pageDate, tomorrow)) onDateEventFired?.('date_tomorrow');
      else                                    onDateEventFired?.('date_future');
    }
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    fireChange(selectedDates, hour, selectedMinute);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedHour !== null) fireChange(selectedDates, selectedHour, minute);
  };

  /* ─── chip label ─────────────────────────────────────────────────────── */
  const chipLabel = (d: Date) => `${format(d, 'EEE')} ${format(d, 'd')}`;

  /* ─── right-side page content ────────────────────────────────────────── */
  const renderPageContent = () => {
    const idx = displayIdx;

    if (idx === 0) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 8,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '2px solid #C9A063',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <img src={rudeRemindersLogo} style={{ width: 36, height: 36, objectFit: 'contain' }} alt="" />
          </div>
          <div style={{ width: 32, height: 1, background: 'rgba(201,160,99,0.3)' }} />
          <div style={{ color: '#C9A063', fontSize: 11, letterSpacing: '0.1em', fontWeight: 600 }}>
            RUDE REMINDERS
          </div>
          <div style={{ color: 'rgba(201,160,99,0.55)', fontSize: 9 }}>
            your week ahead
          </div>
        </div>
      );
    }

    const date     = getPageDate(idx);
    const selected = isPageSelected(idx);
    const isToday  = isSameDay(date, today);
    const dayNum   = format(date, 'd');
    const dayName  = format(date, 'EEEE');
    const monthName = format(date, 'MMM');

    return (
      <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
        {/* Left shadow from spine */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 8, height: '100%',
          background: 'linear-gradient(to right, rgba(0,0,0,0.08), transparent)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Today badge */}
        {isToday && (
          <div style={{
            position: 'absolute', top: 8, right: 10, zIndex: 2,
            background: '#C9A063', color: '#fff',
            fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 6,
          }}>Today</div>
        )}

        {/* Date content */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', justifyContent: 'center',
          height: '100%', paddingLeft: 20, paddingTop: 8,
        }}>
          <div style={{
            fontSize: 52, fontWeight: 500, lineHeight: 1,
            color: selected ? '#C53B3B' : '#1a1a1a',
            transition: 'color 0.3s',
          }}>{dayNum}</div>
          <div style={{
            fontSize: 14, marginTop: 2,
            color: selected ? 'rgba(196,59,59,0.75)' : '#777',
            transition: 'color 0.3s',
          }}>{dayName}</div>
          <div style={{
            fontSize: 11, fontWeight: 500, marginTop: 2,
            color: selected ? 'rgba(196,59,59,0.65)' : '#C9A063',
            transition: 'color 0.3s',
          }}>{monthName}</div>
        </div>

        {/* Rudy scribble SVG */}
        <svg
          width="44" height="44"
          viewBox="0 0 44 44"
          style={{
            position: 'absolute', bottom: 8, right: 8, zIndex: 2,
            pointerEvents: 'none',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <style>{`
            @keyframes rudyDraw {
              from { stroke-dashoffset: 200; }
              to   { stroke-dashoffset: 0; }
            }
            .rudy-path-${idx} {
              stroke-dasharray: 200;
              stroke-dashoffset: ${selected ? 0 : 200};
              animation: ${selected ? `rudyDraw 0.65s ease forwards` : 'none'};
            }
          `}</style>
          <circle className={`rudy-path-${idx}`}
            cx="23" cy="21" r="12"
            fill="none" stroke="#C53B3B" strokeWidth="1.8" strokeLinecap="round"
          />
          <circle cx="19" cy="18" r="1.8" fill="#C53B3B" />
          <circle cx="27" cy="18" r="1.8" fill="#C53B3B" />
          <path className={`rudy-path-${idx}`}
            d="M18 25 Q23 30 28 25"
            fill="none" stroke="#C53B3B" strokeWidth="1.8" strokeLinecap="round"
          />
          <path className={`rudy-path-${idx}`}
            d="M16 13 Q18 11 20 13"
            fill="none" stroke="#C9A063" strokeWidth="1.4" strokeLinecap="round"
          />
          <path className={`rudy-path-${idx}`}
            d="M26 13 Q28 11 30 13"
            fill="none" stroke="#C9A063" strokeWidth="1.4" strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  /* ─── render ─────────────────────────────────────────────────────────── */
  const isCover = displayIdx === 0;
  const pagesFlipped = currentIdx; // how many pages have been turned

  return (
    <div style={{ overflow: 'hidden' }} className="space-y-3">

      {/* animation keyframes */}
      <style>{`
        @keyframes enterFromRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes enterFromLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes chipIn {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* ── BOOK ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', height: 200,
        display: 'flex', alignItems: 'stretch',
        borderRadius: 8, overflow: 'hidden',
      }}>

        {/* LEFT SIDE — "already read" pages */}
        <div style={{
          width: '35%', flexShrink: 0,
          background: isCover ? '#5a2a08' : '#ddc99a',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          /* stacked page edges: 3 thin lines on right edge */
          boxShadow: isCover ? 'none' : 'inset -2px 0 0 rgba(0,0,0,0.08), inset -4px 0 0 rgba(0,0,0,0.05), inset -6px 0 0 rgba(0,0,0,0.03)',
          transition: 'background 0.3s',
        }}>
          {/* Pages-read count */}
          {pagesFlipped > 0 && !isCover && (
            <span style={{
              fontSize: 11, color: 'rgba(0,0,0,0.3)',
              fontWeight: 500, userSelect: 'none',
            }}>{pagesFlipped}</span>
          )}
        </div>

        {/* SPINE */}
        <div style={{
          width: 28, flexShrink: 0,
          background: '#6B3410',
          zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '2px 0 8px rgba(0,0,0,0.25), -2px 0 8px rgba(0,0,0,0.15)',
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A063' }} />
          ))}
        </div>

        {/* RIGHT SIDE — current page */}
        <div style={{
          flex: 1,
          position: 'relative',
          background: isCover ? '#6B3410' : '#FDF3E3',
          border: '1.5px solid #C9A063',
          borderLeft: 'none',
          borderRadius: '0 10px 10px 0',
          overflow: 'hidden',
          transition: 'background 0.3s',
        }}>
          {/* Animated content wrapper */}
          <div
            key={`page-${displayIdx}`}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              ...(isExiting
                ? {
                    opacity: 0,
                    transform: animDir === 'forward' ? 'translateX(-20px)' : 'translateX(20px)',
                    transition: 'opacity 0.24s ease, transform 0.24s ease',
                  }
                : {
                    animation: `${animDir === 'forward' ? 'enterFromRight' : 'enterFromLeft'} 0.35s ease both`,
                  }
              ),
            }}
          >
            {renderPageContent()}
          </div>
        </div>
      </div>

      {/* ── CONTROLS ROW ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}>
        {/* ← */}
        <button
          type="button"
          onClick={() => navigate(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          style={{
            width: 42, height: 36, flexShrink: 0,
            background: '#FDF3E3', border: '1.5px solid #C9A063',
            borderRadius: 20, color: '#C9A063', cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: currentIdx === 0 ? 0.25 : 1,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (currentIdx !== 0) { (e.currentTarget as HTMLButtonElement).style.background = '#C9A063'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FDF3E3'; (e.currentTarget as HTMLButtonElement).style.color = '#C9A063'; }}
        >←</button>

        {/* Select / Open / Deselect */}
        <button
          type="button"
          onClick={handleSelectBtn}
          style={{
            flex: 1, height: 36, borderRadius: 20, cursor: 'pointer',
            fontSize: 14, fontWeight: 600, border: 'none',
            transition: 'background 0.15s, color 0.15s, border 0.15s',
            ...(displayIdx === 0
              ? { background: '#C9A063', color: '#fff', border: 'none' }
              : currentDisplaySelected
                ? { background: '#fff', color: '#C53B3B', border: '1.5px solid #C53B3B' }
                : { background: '#C9A063', color: '#fff', border: 'none' }
            ),
          }}
        >
          {displayIdx === 0
            ? 'Open cover'
            : currentDisplaySelected
              ? 'Deselect'
              : 'Select this day'}
        </button>

        {/* → */}
        <button
          type="button"
          onClick={() => navigate(Math.min(7, currentIdx + 1))}
          disabled={currentIdx === 7}
          style={{
            width: 42, height: 36, flexShrink: 0,
            background: '#FDF3E3', border: '1.5px solid #C9A063',
            borderRadius: 20, color: '#C9A063', cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: currentIdx === 7 ? 0.25 : 1,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (currentIdx !== 7) { (e.currentTarget as HTMLButtonElement).style.background = '#C9A063'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FDF3E3'; (e.currentTarget as HTMLButtonElement).style.color = '#C9A063'; }}
        >→</button>

        {/* Counter pill */}
        <div style={{
          minWidth: 46, height: 36, borderRadius: 20,
          border: '1.5px solid #C9A063',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 8px', flexShrink: 0,
        }}>
          <span style={{
            fontSize: 15, fontWeight: 500, lineHeight: 1,
            color: selectedDates.length > 0 ? '#C53B3B' : '#C9A063',
          }}>{selectedDates.length}</span>
          <span style={{ fontSize: 9, color: '#C9A063', lineHeight: 1, marginTop: 1 }}>days</span>
        </div>
      </div>

      {/* ── META ROW ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {Array.from({ length: 8 }, (_, i) => {
            const isCurrent  = i === currentIdx;
            const isDotCover = i === 0;
            const dotSelected = i > 0 && isPageSelected(i);

            let bg = 'var(--color-border-secondary, #e2e8f0)';
            if (isDotCover)   bg = '#6B3410';
            if (dotSelected)  bg = '#C53B3B';
            if (isCurrent)    bg = '#C9A063';

            return (
              <div key={i} style={{
                height: 6,
                width: isCurrent ? 14 : 6,
                borderRadius: isCurrent ? 3 : '50%',
                background: bg,
                transition: 'width 0.2s, background 0.2s',
              }} />
            );
          })}
        </div>

        {/* Date chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
          {selectedDates.map((d, i) => (
            <span key={i} style={{
              background: '#C53B3B', color: '#fff',
              fontSize: 10, borderRadius: 8, padding: '2px 7px',
              animation: 'chipIn 0.2s ease',
            }}>
              {chipLabel(d)}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOUR PICKER ───────────────────────────────────────────────── */}
      {selectedDates.length > 0 && (
        <Card className="border-[#C9A063]">
          <CardContent className="pt-3 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {generateTimeSlots().map((slot) => {
                const isSel  = selectedHour === slot.value;
                const isPast = isTimeInPast(slot.value);
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => !isPast && handleHourSelect(slot.value)}
                    disabled={isPast}
                    className={cn(
                      "h-12 min-w-[90px] rounded-full shadow-sm text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all",
                      !isSel && !isPast && "bg-[#FDF3E3] text-[#111827] hover:bg-[#C9A063] hover:text-[#111827]",
                      isSel  && "bg-[#C53B3B] text-white hover:bg-[#a83030] hover:text-white",
                      isPast && "opacity-40 bg-gray-200 text-gray-400 cursor-not-allowed",
                    )}
                  >{slot.display}</button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MINUTE PICKER ─────────────────────────────────────────────── */}
      {selectedDates.length > 0 && selectedHour !== null && (
        <Card className="border-[#C9A063]">
          <CardContent className="pt-3 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {QUARTER_SLOTS.map((slot) => {
                const isSel  = selectedMinute === slot.value && selectedHour !== null;
                const isPast = isTimeInPast(selectedHour!, slot.value);
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => !isPast && handleMinuteSelect(slot.value)}
                    disabled={isPast}
                    className={cn(
                      "h-12 min-w-[90px] rounded-full shadow-sm text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all",
                      !isSel && !isPast && "bg-[#FDF3E3] text-[#111827] hover:bg-[#C9A063] hover:text-[#111827]",
                      isSel  && "bg-[#C53B3B] text-white hover:bg-[#a83030] hover:text-white",
                      isPast && "opacity-40 bg-gray-200 text-gray-400 cursor-not-allowed",
                    )}
                  >{slot.label}</button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
