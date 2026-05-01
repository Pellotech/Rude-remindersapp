import { useState, useCallback, useRef, useEffect } from "react";
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

/* ─── left fan layers (darkest → lightest, left-anchored) ─── */
const LEFT_FAN = [
  { left: 0,  bg: '#a88040' },
  { left: 4,  bg: '#b28848' },
  { left: 8,  bg: '#ba9052' },
  { left: 12, bg: '#c29860' },
  { left: 16, bg: '#caa26c' },
  { left: 20, bg: '#d0aa78' },
  { left: 24, bg: '#d6b484' },
  { left: 28, bg: '#dcbc90' },
];

/* ─── right fan layers (right-anchored, compressed to 1/3 spread) ─── */
const RIGHT_FAN = [
  { right: 0, bg: '#dcbc90' },
  { right: 1, bg: '#d6b484' },
  { right: 3, bg: '#d0aa78' },
  { right: 4, bg: '#caa26c' },
  { right: 5, bg: '#c29860' },
  { right: 7, bg: '#ba9052' },
  { right: 8, bg: '#FFFFFF' },
];

export function BookDatePicker({ onScheduleChange, onDateEventFired }: BookDatePickerProps) {
  /* ─── navigation state ───────────────────────────────────────────────── */
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [displayIdx, setDisplayIdx]       = useState(0);
  const [isExiting, setIsExiting]         = useState(false);
  const [animDir, setAnimDir]             = useState<'forward' | 'backward'>('forward');
  const [bookOpen, setBookOpen]           = useState(false);
  const [closedExiting, setClosedExiting] = useState(false);

  /* ─── one-time-per-session swipe hints ─────────────────────────────── */
  /* Both start hidden, then appear after a delay so intros / loaders /
     splash overlays have time to settle before the hint plays. */
  const [showSwipeHand, setShowSwipeHand] = useState(false);
  const [showSwipeLabel, setShowSwipeLabel] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('book_swipe_shown') === 'true') return;
    // Wait for intros to settle, then play the sweep animation
    const startTimer = setTimeout(() => setShowSwipeHand(true), 2000);
    // 3 sweeps × 1.6s = 4.8s of animation; +200ms buffer before clearing
    const endTimer = setTimeout(() => {
      setShowSwipeHand(false);
      sessionStorage.setItem('book_swipe_shown', 'true');
    }, 2000 + 4800 + 200);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('book_label_shown') === 'true') return;
    const startTimer = setTimeout(() => setShowSwipeLabel(true), 2000);
    const endTimer = setTimeout(() => {
      setShowSwipeLabel(false);
      sessionStorage.setItem('book_label_shown', 'true');
    }, 2000 + 6000);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, []);

  /* ─── selection state ────────────────────────────────────────────────── */
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedHour, setSelectedHour]   = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState(0);

  /* ─── refs ───────────────────────────────────────────────────────────── */
  const isAnimating  = useRef(false);
  const navTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openKey      = useRef(0);
  const touchStartX  = useRef<number | null>(null);
  const mouseStartX  = useRef<number | null>(null);
  const direction    = useRef<'forward' | 'back'>('forward');

  const today = new Date();
  const pages = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  /* ─── schedule-change emitter (UNCHANGED) ───────────────────────────── */
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
        // For multi-day, pass a time reference using the first selected date + chosen hour/minute
        const timeRef = new Date(dates[0]);
        timeRef.setHours(hour, minute, 0, 0);
        onScheduleChange({
          scheduledFor: timeRef.toISOString(),
          isMultiDay: true,
          selectedDays: dates.map(d => DAY_NAMES[d.getDay()]),
          hasValidSchedule: true,
        });
      }
    },
    [onScheduleChange],
  );

  /* ─── time slots (UNCHANGED) ─────────────────────────────────────────── */
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

  /* ─── selection helpers ───────────────────────────────────────────────── */
  const getPageDate      = (idx: number) => pages[idx - 1];
  const isPageSelected   = (idx: number) => idx > 0 && selectedDates.some(d => isSameDay(d, getPageDate(idx)));
  const currentDisplaySelected = isPageSelected(displayIdx);

  /* ─── navigate ────────────────────────────────────────────────────────── */
  const navigate = (newIdx: number) => {
    if (newIdx < 0 || newIdx > 7 || newIdx === currentIdx) return;
    if (isAnimating.current) return;
    isAnimating.current = true;

    /* First open: closed → open */
    if (!bookOpen && newIdx >= 1) {
      setClosedExiting(true);
      setTimeout(() => {
        openKey.current += 1;
        setCurrentIdx(newIdx);
        setDisplayIdx(newIdx);
        setBookOpen(true);
        setClosedExiting(false);
        /* release lock after open-in animation */
        setTimeout(() => { isAnimating.current = false; }, 350);
      }, 200);
      return;
    }

    /* Close: open → cover page */
    if (bookOpen && newIdx === 0) {
      setAnimDir('backward');
      setIsExiting(true);
      setCurrentIdx(0);
      setTimeout(() => {
        setBookOpen(false);
        setDisplayIdx(0);
        setIsExiting(false);
        setTimeout(() => { isAnimating.current = false; }, 350);
      }, 240);
      return;
    }

    /* Page-to-page (already open) */
    if (navTimer.current) clearTimeout(navTimer.current);
    setAnimDir(newIdx > currentIdx ? 'forward' : 'backward');
    setIsExiting(true);
    setCurrentIdx(newIdx);
    navTimer.current = setTimeout(() => {
      setDisplayIdx(newIdx);
      setIsExiting(false);
      /* release after full 500ms flip completes */
      setTimeout(() => { isAnimating.current = false; }, 260);
    }, 250);
  };

  /* ─── clear all ──────────────────────────────────────────────────────── */
  const handleClear = () => {
    setSelectedDates([]);
    setSelectedHour(null);
    setSelectedMinute(0);
    onScheduleChange({ scheduledFor: undefined, isMultiDay: false, selectedDays: [], hasValidSchedule: false });
    if (bookOpen) navigate(0);
  };

  /* ─── select / deselect ───────────────────────────────────────────────── */
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
      if      (isSameDay(pageDate, now))      onDateEventFired?.('date_today');
      else if (isSameDay(pageDate, tomorrow)) onDateEventFired?.('date_tomorrow');
      else                                    onDateEventFired?.('date_future');
    }
  };

  /* ─── time pickers (UNCHANGED) ────────────────────────────────────────── */
  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    fireChange(selectedDates, hour, selectedMinute);
  };
  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedHour !== null) fireChange(selectedDates, selectedHour, minute);
  };

  /* ─── swipe handlers ──────────────────────────────────────────────────── */
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 35) {
      direction.current = dx < 0 ? 'forward' : 'back';
      navigate(dx < 0 ? currentIdx + 1 : currentIdx - 1);
    }
  };
  const onMouseDown  = (e: React.MouseEvent) => { mouseStartX.current = e.clientX; };
  const onMouseUp    = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    mouseStartX.current = null;
    if (Math.abs(dx) > 35) {
      direction.current = dx < 0 ? 'forward' : 'back';
      navigate(dx < 0 ? currentIdx + 1 : currentIdx - 1);
    }
  };

  /* ─── helpers ─────────────────────────────────────────────────────────── */
  const chipLabel = (d: Date) => `${format(d, 'EEE')} ${format(d, 'd')}`;

  /* ghost page (left section of open book) */
  const ghostPage = displayIdx >= 2 ? getPageDate(displayIdx - 1) : null;

  /* ─── render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ overflow: 'hidden' }} className="space-y-3">

      {/* ── keyframes ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bookOpenIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes enterFromRight {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes enterFromLeft {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes chipIn {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes scribble { to { stroke-dashoffset: 0; } }
        @keyframes swipeNudge {
          0%,100% { opacity: 0.5; transform: translateX(0); }
          50%      { opacity: 1;   transform: translateX(4px); }
        }
        @keyframes swipeHand {
          0%   { transform: translateX(0)  scale(1);    opacity: 0.6; }
          30%  { transform: translateX(8px) scale(1.1); opacity: 1;   }
          60%  { transform: translateX(0)  scale(1);    opacity: 0.6; }
          100% { transform: translateX(0)  scale(1);    opacity: 0.6; }
        }
        @keyframes sweepAcross {
          0%   { left: 85%;  opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 5%;   opacity: 0; }
        }
      `}</style>

      {/* ── OUTER CREAM WRAPPER ───────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #C9A063',
        borderRadius: 14,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* ══ CLOSED STATE ══════════════════════════════════════════════ */}
        {!bookOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
            {/* Closed book */}
            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              style={{
                width: '65%',
                height: 140,
                boxShadow: '6px 6px 18px rgba(0,0,0,0.32), -6px 6px 18px rgba(0,0,0,0.22)',
                borderRadius: '5px 7px 7px 5px',
                display: 'flex',
                overflow: 'hidden',
                transform: closedExiting ? 'scale(0.95)' : 'scale(1)',
                opacity: closedExiting ? 0 : 1,
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                cursor: 'grab',
              }}>

              {/* Spine */}
              <div style={{
                width: 14,
                background: '#6B3410',
                borderRadius: '5px 0 0 5px',
                flexShrink: 0,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: 3,
                  background: 'rgba(255,255,255,0.06)',
                }} />
              </div>

              {/* Cover */}
              <div style={{
                flex: 1,
                background: '#6B3410',
                borderRadius: '0 7px 7px 0',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: 10,
              }}>
                {/* Inner spine shadow */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                  background: 'rgba(0,0,0,0.15)',
                }} />

                {/* Logo — no ring */}
                <div style={{
                  width: 54,
                  height: 54,
                  background: '#8B5A2B',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  flexShrink: 0,
                }}>
                  <img
                    src={rudeRemindersLogo}
                    style={{ width: 54, height: 54, objectFit: 'contain' }}
                    alt=""
                  />
                </div>
                {/* Divider */}
                <div style={{ width: 26, height: 1, background: 'rgba(201,160,99,0.3)', position: 'relative', zIndex: 1 }} />
                {/* Title */}
                <div style={{
                  color: '#C9A063', fontSize: 8, letterSpacing: '0.12em',
                  fontWeight: 500, textAlign: 'center', lineHeight: 1.7,
                  position: 'relative', zIndex: 1,
                }}>RUDE REMINDERS</div>
                {/* Sub */}
                <div style={{
                  color: 'rgba(201,160,99,0.5)', fontSize: 7,
                  letterSpacing: '0.07em', position: 'relative', zIndex: 1,
                }}>your week ahead</div>

                {/* Right page edge — stacked lines */}
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: 7,
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  borderRadius: '0 7px 7px 0',
                }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1,
                      background: '#F5EFE6',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }} />
                  ))}
                </div>

                {/* Swipe nudge arrow */}
                <div style={{
                  position: 'absolute', bottom: 10, right: 14,
                  display: 'flex', gap: 2, alignItems: 'center',
                  animation: 'swipeNudge 2.2s ease-in-out infinite',
                  zIndex: 2,
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 4, height: 4,
                      borderRight: '1.5px solid rgba(201,160,99,0.55)',
                      borderTop: '1.5px solid rgba(201,160,99,0.55)',
                      transform: 'rotate(45deg)',
                      opacity: 1 - i * 0.25,
                    }} />
                  ))}
                </div>

                {/* One-time-per-session sweeping hand across the closed book */}
                {showSwipeHand && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    transform: 'translateY(-50%)',
                    fontSize: 20,
                    zIndex: 9,
                    pointerEvents: 'none',
                    animation: 'sweepAcross 1.6s ease-in-out 3 forwards',
                  }}>👆</div>
                )}
              </div>
            </div>

            {/* One-time-per-session "swipe to open" label —
                parallel to the book, sitting in the right gutter at the bottom. */}
            {showSwipeLabel && (
              <div style={{
                position: 'absolute',
                right: 8,
                bottom: 4,
                color: 'rgba(201,160,99,0.85)',
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.08em',
                fontFamily: 'sans-serif',
                transition: 'opacity 0.5s ease',
                opacity: showSwipeLabel ? 1 : 0,
                pointerEvents: 'none',
              }}>swipe to open</div>
            )}

          </div>
        )}

        {/* ══ OPEN STATE ════════════════════════════════════════════════ */}
        {bookOpen && (
          <div
            key={`open-${openKey.current}`}
            style={{
              position: 'relative',
              width: '100%',
              height: '140px',
              animation: 'bookOpenIn 0.3s ease both',
              boxShadow: '6px 6px 18px rgba(0,0,0,0.32), -6px 6px 18px rgba(0,0,0,0.22)',
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
          >
            {/* Top edge */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 6, background: '#6B3410',
              borderRadius: 0, zIndex: 10,
            }} />
            {/* Bottom edge */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 6, background: '#6B3410',
              borderRadius: 0, zIndex: 10,
            }} />
            {/* Open book */}
            <div style={{
              width: '100%', height: 140,
              display: 'flex',
              borderRadius: 0,
              overflow: 'hidden',
              perspective: '1200px',
            }}>

              {/* Left outer cover strip */}
              <div style={{
                width: 13, background: '#6B3410',
                borderRadius: 0, flexShrink: 0,
              }} />

              {/* Left page section */}
              <div style={{
                flex: 1, position: 'relative',
                background: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transformOrigin: 'right center',
                transformStyle: 'preserve-3d',
                perspective: 1200,
                ...(isExiting && direction.current === 'back'
                  ? { transform: 'rotateY(180deg)', transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }
                  : { transform: 'rotateY(0deg)', transition: 'none' }
                ),
              }}>
                {/* Depth overlays */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: 'linear-gradient(to right, rgba(60,25,5,0.22), transparent)', zIndex: 4, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, background: 'linear-gradient(to left, rgba(60,25,5,0.2), transparent)', zIndex: 4, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(255,248,230,0.45) 0%, transparent 68%)', zIndex: 3, pointerEvents: 'none' }} />
                {/* Ghost: previous page number + day */}
                {ghostPage && (
                  <div style={{ position: 'relative', zIndex: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 500, color: 'rgba(50,20,5,0.2)', lineHeight: 1 }}>
                      {format(ghostPage, 'd')}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(50,20,5,0.15)', marginTop: 2 }}>
                      {format(ghostPage, 'EEE')}
                    </div>
                  </div>
                )}
              </div>

              {/* Right page section */}
              <div style={{
                flex: 1, position: 'relative',
                background: '#FFFFFF',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                borderLeft: '3px solid #a07830',
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                ...(isExiting && direction.current === 'forward'
                  ? {
                      transform: 'rotateY(-180deg)',
                      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    }
                  : {
                      transform: 'rotateY(0deg)',
                      transition: 'none',
                    }
                ),
              }}>

                {/* Back face — white to match front page */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '100%',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: '#FFFFFF',
                  zIndex: 20,
                }} />

                {/* Depth overlays */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: 'linear-gradient(to right, rgba(60,25,5,0.22), transparent)', zIndex: 4, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, background: 'linear-gradient(to left, rgba(60,25,5,0.2), transparent)', zIndex: 4, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(255,248,230,0.45) 0%, transparent 68%)', zIndex: 3, pointerEvents: 'none' }} />

                {/* Ruled lines */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'flex-end', padding: '8px 12px', gap: 10,
                }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ height: 1, background: 'rgba(150,100,50,0.13)' }} />
                  ))}
                </div>

                {/* Today badge */}
                {displayIdx === 1 && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 8,
                    background: '#FEF9C3', color: '#6B3410',
                    fontSize: 9, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 20,
                    whiteSpace: 'nowrap',
                  }}>Today</div>
                )}

                {/* Date content */}
                <div
                  key={`content-${displayIdx}`}
                  style={{
                    position: 'relative', zIndex: 6,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 2,
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    fontSize: 54, fontWeight: 500, lineHeight: 1,
                    color: '#1a1a1a',
                  }}>
                    {getPageDate(displayIdx) ? format(getPageDate(displayIdx)!, 'd') : ''}
                  </div>
                  {/* Day name */}
                  <div style={{
                    fontSize: 14,
                    color: isPageSelected(displayIdx) ? 'rgba(183,13,13,0.78)' : '#3d2010',
                    transition: 'color 0.2s',
                  }}>
                    {getPageDate(displayIdx) ? format(getPageDate(displayIdx)!, 'EEEE') : ''}
                  </div>
                  {/* Month */}
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#C9A063' }}>
                    {getPageDate(displayIdx) ? format(getPageDate(displayIdx)!, 'MMM') : ''}
                  </div>
                </div>

                {/* Rudy scribble — key resets animation on select */}
                <svg
                  key={`scribble-${displayIdx}-${isPageSelected(displayIdx)}`}
                  width="36" height="36"
                  viewBox="0 0 46 46"
                  fill="none"
                  style={{
                    position: 'absolute', bottom: 10, left: 10,
                    zIndex: 8, pointerEvents: 'none',
                    opacity: isPageSelected(displayIdx) ? 1 : 0,
                  }}
                >
                  {isPageSelected(displayIdx) && (
                    <>
                      <circle cx="23" cy="21" r="12"
                        stroke="#b70d0d" strokeWidth="1.8" strokeLinecap="round"
                        strokeDasharray="300" strokeDashoffset="300"
                        style={{ animation: 'scribble 0.65s ease forwards' }}
                      />
                      <circle cx="19" cy="18" r="1.8" fill="#b70d0d" />
                      <circle cx="27" cy="18" r="1.8" fill="#b70d0d" />
                      <path d="M18 25 Q23 30 28 25"
                        stroke="#b70d0d" strokeWidth="1.8" strokeLinecap="round"
                        strokeDasharray="300" strokeDashoffset="300"
                        style={{ animation: 'scribble 0.65s ease forwards 0.2s' }}
                      />
                      <path d="M16 13 Q18 11 20 13"
                        stroke="#C9A063" strokeWidth="1.4" strokeLinecap="round"
                        strokeDasharray="100" strokeDashoffset="100"
                        style={{ animation: 'scribble 0.4s ease forwards 0.4s' }}
                      />
                      <path d="M26 13 Q28 11 30 13"
                        stroke="#C9A063" strokeWidth="1.4" strokeLinecap="round"
                        strokeDasharray="100" strokeDashoffset="100"
                        style={{ animation: 'scribble 0.4s ease forwards 0.5s' }}
                      />
                    </>
                  )}
                </svg>
              </div>

              {/* Right outer cover strip */}
              <div style={{
                width: 13, background: '#6B3410',
                borderRadius: 0, flexShrink: 0,
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── CONTROLS + META WRAPPER ───────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: '100%', alignSelf: 'center' }}>

      {/* ── CONTROLS ROW ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, marginTop: 10 }}>

        {/* ← */}
        <button
          type="button"
          onClick={() => { direction.current = 'back'; navigate(Math.max(0, currentIdx - 1)); }}
          disabled={currentIdx === 0}
          style={{
            width: 42, height: 36, flexShrink: 0,
            background: '#FDF3E3', border: '1.5px solid #C9A063',
            borderRadius: 20, color: '#111827', cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: currentIdx === 0 ? 0.4 : 1,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (currentIdx !== 0) { (e.currentTarget as HTMLButtonElement).style.background = '#C9A063'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FDF3E3'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
        >←</button>

        {/* Centre button */}
        <button
          type="button"
          onClick={handleSelectBtn}
          style={{
            flex: 1, height: 36, borderRadius: 20, cursor: 'pointer',
            fontSize: 12, fontWeight: 500, padding: '0 8px',
            transition: 'background 0.15s, color 0.15s, border 0.15s',
            ...(displayIdx === 0
              ? { background: '#FDF3E3', color: '#111827', border: '1.5px solid #C9A063' }
              : currentDisplaySelected
                ? { background: '#b70d0d', color: '#ffffff', border: '1.5px solid #b70d0d' }
                : { background: '#FDF3E3', color: '#111827', border: '1.5px solid #C9A063' }
            ),
          }}
        >
          {displayIdx === 0
            ? 'Open cover'
            : currentDisplaySelected ? 'Deselect' : 'Select'}
        </button>

        {/* → */}
        <button
          type="button"
          onClick={() => { direction.current = 'forward'; navigate(Math.min(7, currentIdx + 1)); }}
          disabled={currentIdx === 7}
          style={{
            width: 42, height: 36, flexShrink: 0,
            background: '#FDF3E3', border: '1.5px solid #C9A063',
            borderRadius: 20, color: '#111827', cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: currentIdx === 7 ? 0.4 : 1,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (currentIdx !== 7) { (e.currentTarget as HTMLButtonElement).style.background = '#C9A063'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FDF3E3'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
        >→</button>
      </div>

      {/* ── META ROW ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, minHeight: 28, position: 'relative' }}>

        {/* Clear button — left */}
        <button
          type="button"
          onClick={handleClear}
          disabled={selectedDates.length === 0}
          style={{
            minWidth: 46, height: 28, borderRadius: 20,
            border: '1.5px solid #C9A063',
            background: '#FDF3E3',
            color: '#111827',
            fontSize: 11, fontWeight: 500,
            padding: '0 10px', flexShrink: 0, cursor: 'pointer',
            opacity: selectedDates.length > 0 ? 1 : 0.4,
            pointerEvents: selectedDates.length > 0 ? 'auto' : 'none',
            transition: 'border 0.15s, background 0.15s, color 0.15s, opacity 0.15s',
          }}
        >Clear</button>

        {/* Progress dots — absolutely centered */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {Array.from({ length: 8 }, (_, i) => {
            const isCurrent   = i === currentIdx;
            const isDotCover  = i === 0;
            const dotSelected = i > 0 && isPageSelected(i);
            let bg = 'rgba(0,0,0,0.15)';
            if (isDotCover)  bg = '#6B3410';
            if (dotSelected) bg = '#b70d0d';
            if (isCurrent)   bg = '#C9A063';
            return (
              <div key={i} style={{
                height: 6,
                width: isCurrent ? 14 : 6,
                borderRadius: isCurrent ? 3 : '50%',
                background: bg,
                transition: 'width 0.25s, background 0.25s',
              }} />
            );
          })}
        </div>

      </div>

      {/* ── DATE CHIPS ROW ─────────────────────────────────────────────────── */}
      {selectedDates.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'nowrap', gap: 4,
          marginTop: 6, width: '100%', overflow: 'hidden',
        }}>
          {selectedDates.map((d, i) => (
            <span key={i} style={{
              flex: '1 1 0', minWidth: 0,
              textAlign: 'center',
              background: '#FEF9C3',
              color: '#111827',
              fontSize: 10, borderRadius: 8, padding: '2px 0',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {chipLabel(d)}
            </span>
          ))}
        </div>
      )}

      </div>{/* end controls + meta wrapper */}

      {/* ── HOUR PICKER (UNCHANGED) ───────────────────────────────────────── */}
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
                      isSel  && "bg-[#b70d0d] text-white hover:bg-[#a83030] hover:text-white",
                      isPast && "opacity-40 bg-gray-200 text-gray-400 cursor-not-allowed",
                    )}
                  >{slot.display}</button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MINUTE PICKER (UNCHANGED) ─────────────────────────────────────── */}
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
                      isSel  && "bg-[#b70d0d] text-white hover:bg-[#a83030] hover:text-white",
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
