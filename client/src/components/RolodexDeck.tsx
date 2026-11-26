import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { tr } from "@/i18n";

/**
 * RolodexDeck — a vertical stack of floating widgets (the Create screen).
 *
 * The focused widget sits in the middle; its neighbours peek above and below,
 * smaller, faded and blurred. Behaviour comes from the approved demo:
 *  - small touches never move the deck
 *  - on controls (slider, book, hours, tabs) a swipe must be long and clearly vertical
 *  - elsewhere a short swipe starts the move; the card follows the finger at 40%
 *  - one step per swipe (after >95px or a fast flick, 350 ms cooldown)
 *  - tap a faded widget or a side dot to jump to it
 *
 * Each child is one widget. A child's `data-name` is used for the dot labels.
 */

interface RolodexDeckProps {
  children: ReactNode;
  /** Which widget is in the middle when the screen opens (0-based). */
  initialIndex?: number;
  /** Space kept free at the bottom of the screen (ad banner / nav bar). */
  bottomInset?: number;
  names?: string[];
}

// Anything inside these keeps its own touch handling, so the deck needs a firmer swipe.
const CONTROLS = "input, textarea, select, button, [role=slider], [role=tab], .rudeness-slider, [data-deck-control]";

export function RolodexDeck({ children, initialIndex = 1, bottomInset = 120, names = [] }: RolodexDeckProps) {
  const items = Children.toArray(children);
  const count = items.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [index, setIndex] = useState(Math.min(initialIndex, count - 1));
  const [stageHeight, setStageHeight] = useState(560);
  const dragRef = useRef(0);
  const lastStepRef = useRef(0);
  const startRef = useRef<{ x: number; y: number; t: number; onControl: boolean; engaged: boolean; id: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // ---- the stage fills the screen from its top edge down to the bottom inset ----
  const measureStage = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const h = Math.max(520, window.innerHeight - top - bottomInset);
    setStageHeight(h);
  }, [bottomInset]);

  useEffect(() => {
    measureStage();
    window.addEventListener("resize", measureStage);
    window.addEventListener("orientationchange", measureStage);
    return () => {
      window.removeEventListener("resize", measureStage);
      window.removeEventListener("orientationchange", measureStage);
    };
  }, [measureStage]);

  // ---- layout: focused card centred, neighbours spread out to fill the screen ----
  const layout = useCallback(() => {
    const stage = stageRef.current;
    const focus = cardRefs.current[index];
    if (!stage || !focus) return;
    const H = stage.clientHeight;
    const hf = focus.offsetHeight;
    const room = Math.max(0, (H - hf) / 2 - 34);
    const PEEK = Math.max(46, room * 0.58);
    const PEEK2 = Math.max(22, room * 0.38);
    const top = Math.max(PEEK + 8, (H - hf) / 2) + dragRef.current;
    cardRefs.current.forEach((c, k) => {
      if (!c) return;
      const d = k - index;
      const h = c.offsetHeight;
      const far = Math.abs(d);
      const s = far === 0 ? 1 : far === 1 ? 0.92 : 0.84;
      const o = far === 0 ? 1 : far === 1 ? 0.6 : far === 2 ? 0.3 : 0;
      const blur = far === 0 ? 0 : far === 1 ? 1.2 : 2;
      const reach = PEEK + (far >= 2 ? PEEK2 : 0);
      let y: number;
      if (d === 0) y = top;
      else if (d < 0) y = top - reach - (h * (1 - s)) / 2;
      else y = top + hf + reach - h + (h * (1 - s)) / 2;
      c.style.transform = `translate(-50%, ${y}px) scale(${s})`;
      c.style.opacity = String(o);
      c.style.zIndex = String(30 - far * 10);
      c.style.filter = blur ? `blur(${blur}px)` : "none";
      c.classList.toggle("is-focus", d === 0);
      c.setAttribute("aria-hidden", d === 0 ? "false" : "true");
      // keeps keyboard focus and screen readers out of the faded widgets
      if (d === 0) c.removeAttribute("inert");
      else c.setAttribute("inert", "");
    });
  }, [index]);

  useLayoutEffect(() => {
    layout();
  }, [layout, stageHeight, count]);

  // Re-layout when any widget changes height (Quick Reminder opening, summary bubble, etc.)
  useEffect(() => {
    const ro = new ResizeObserver(() => layout());
    cardRefs.current.forEach((c) => c && ro.observe(c));
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [layout, count]);

  const go = (next: number) => {
    next = Math.max(0, Math.min(count - 1, next));
    if (next === index) {
      layout();
      return;
    }
    lastStepRef.current = Date.now();
    setIndex(next);
  };

  // ---- firm swipe: only a deliberate vertical swipe moves the deck ----
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-deck-dots]")) return;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      onControl: !!(e.target as HTMLElement).closest(CONTROLS),
      engaged: false,
      id: e.pointerId,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const st = startRef.current;
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (!st.engaged) {
      const need = st.onControl ? 70 : 14;
      const ratio = st.onControl ? 2.5 : 1.4;
      if (Math.abs(dy) > need && Math.abs(dy) > Math.abs(dx) * ratio) {
        st.engaged = true;
        st.y = e.clientY;
        st.t = performance.now();
        setDragging(true);
        try {
          stageRef.current?.setPointerCapture(e.pointerId);
        } catch {
          /* not important */
        }
      } else return;
    }
    const raw = e.clientY - st.y;
    dragRef.current = raw * 0.4;
    if ((index === 0 && raw > 0) || (index === count - 1 && raw < 0)) dragRef.current = raw * 0.15;
    layout();
  };
  const endDrag = (e: React.PointerEvent) => {
    const st = startRef.current;
    if (!st) return;
    startRef.current = null;
    dragRef.current = 0;
    setDragging(false);
    if (!st.engaged) return;
    const raw = e.clientY - st.y;
    const dt = Math.max(1, performance.now() - st.t);
    const fast = Math.abs(raw) / dt > 0.7 && Math.abs(raw) > 45;
    if ((Math.abs(raw) > 95 || fast) && Date.now() - lastStepRef.current > 350) go(index + (raw < 0 ? 1 : -1));
    else layout();
  };

  return (
    <div
      ref={stageRef}
      className={`rolodex-stage${dragging ? " dragging" : ""}`}
      style={{ height: stageHeight }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {items.map((child, k) => (
        <div
          key={k}
          ref={(el) => {
            cardRefs.current[k] = el;
          }}
          className="rolodex-card"
          onClick={() => {
            if (k !== index) go(k);
          }}
        >
          {child}
        </div>
      ))}

      <nav className="rolodex-dots" data-deck-dots aria-label={tr("rolodex.widgets")}>
        {items.map((_, k) => (
          <button
            key={k}
            type="button"
            aria-label={names[k] ?? String(k + 1)}
            className={k === index ? "on" : ""}
            onClick={() => go(k)}
          />
        ))}
      </nav>
    </div>
  );
}

export default RolodexDeck;
