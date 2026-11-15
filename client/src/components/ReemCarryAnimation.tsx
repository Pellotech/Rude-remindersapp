/**
 * ReemCarryAnimation — plays after a reminder is created:
 *   1. Reem walks in from the left
 *   2. plants his hands on the "Create Reminder" button
 *   3. shoves it right off the screen  → the real button pops back in
 *
 * SWAP-READY: to replace this with a custom video (e.g. rendered with Remotion,
 * After Effects or Apple Motion), drop the file in client/public/reem/ and set
 * CUSTOM_ANIMATION_VIDEO below (e.g. "/reem/create-carry.webm"). Transparent
 * WebM (VP9 + alpha) looks best. Nothing else needs to change.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAnimate } from 'framer-motion';

import { palette } from "@/lib/theme";
export const CUSTOM_ANIMATION_VIDEO: string | null = null;

const POSE = {
  walk: '/rudy/Rudy_walking_transparent.png',
  grab: '/rudy/Rudy_pushing_transparent.png',
  grab2: '/rudy/Rudy_pushing_2_transparent.png',
};

// Preload so the poses never flash in late
if (typeof window !== 'undefined') Object.values(POSE).forEach((src) => { const i = new Image(); i.src = src; });

interface Props {
  /** Where the real Create Reminder button is on screen */
  rect: DOMRect;
  label?: string;
  onDone: () => void;
}

export function ReemCarryAnimation({ rect, label = 'Create Reminder', onDone }: Props) {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { queueMicrotask(onDone); return null; }
  if (CUSTOM_ANIMATION_VIDEO) return <VideoVersion rect={rect} onDone={onDone} />;
  return <CodeVersion rect={rect} label={label} onDone={onDone} />;
}

function CodeVersion({ rect, label, onDone }: Required<Omit<Props, 'label'>> & { label: string }) {
  const [scope, animate] = useAnimate();
  const reemRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const finish = () => { if (!doneRef.current) { doneRef.current = true; onDone(); } };

  // Geometry (all in screen pixels)
  const vw = window.innerWidth;
  const S = Math.round(Math.min(180, Math.max(130, rect.height * 2.6)));   // Reem's box size
  // Measured from the pushing pose art: hands sit at 37.5% down and 82.5% across the image.
  const HAND_Y = 0.375, HAND_X = 0.825;
  const reemTop = rect.top + rect.height / 2 - S * HAND_Y;                  // hands level with the middle of the button
  const standLeft = rect.left + 6 - S * HAND_X;                             // fingertips just pressing into the left edge
  const startLeft = -S;
  const exitShift = vw - standLeft + S * 0.6;                               // walk fully off the right side

  // Push far enough that both Reem and the button leave the screen
  const pushShift = vw - standLeft + 24;

  useEffect(() => {
    let cancelled = false;
    let poseTimer = 0;
    const setPose = (src: string) => {
      if (!imgRef.current) return;
      imgRef.current.src = src;
      // pushing_2 has shorter arms in the artwork — slide it forward so the hands stay on the button
      imgRef.current.style.transform = src === POSE.grab2 ? `translateX(${Math.round(S * 0.07)}px)` : 'none';
    };
    const run = async () => {
      const reem = reemRef.current!, btn = btnRef.current!;
      // 1. Walk in (little bounce each step)
      setPose(POSE.walk);
      await Promise.all([
        animate(reem, { x: [startLeft - standLeft, 0] }, { duration: 0.75, ease: [0.22, 1, 0.36, 1] }),
        animate(reem, { y: [0, -5, 0, -5, 0, -4, 0], rotate: [-2, 2, -2, 2, -1, 1, 0] }, { duration: 0.75, ease: 'easeInOut' }),
      ]);
      if (cancelled) return;
      // 2. Plant hands on the button — a little shove that doesn't move it yet
      setPose(POSE.grab);
      await animate(btn, { x: [0, 5, -2, 0], scale: [1, 0.98, 1.01, 1] }, { duration: 0.3, ease: 'easeOut' });
      if (cancelled) return;
      // 3. Push it off screen — slow to start (it's heavy!), then speeds up.
      //    Pose flips between the two pushing frames so he looks like he's straining.
      let strain = 0;
      poseTimer = window.setInterval(() => setPose(++strain % 2 ? POSE.grab2 : POSE.grab), 180);
      const push = { duration: 1.4, ease: [0.55, 0, 0.9, 0.45] as const };
      await Promise.all([
        animate(reem, { x: pushShift }, push),
        animate(reem, { y: [0, -3, 0, -3, 0, -3, 0], rotate: [3, 5, 3, 5, 3, 5, 3] }, { duration: 1.4, ease: 'linear' }),
        animate(btn, { x: pushShift }, push),
        animate(btn, { rotate: [0, 1, -1, 1.5, -1, 2, 0] }, { duration: 1.4, ease: 'linear' }),
      ]);
      window.clearInterval(poseTimer);
      if (!cancelled) finish();
    };
    run().catch(finish);
    const safety = window.setTimeout(finish, 5000); // never leave the button hidden
    return () => { cancelled = true; window.clearTimeout(safety); window.clearInterval(poseTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div ref={scope} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* A copy of the real button for Reem to push away */}
      <div
        ref={btnRef}
        style={{
          position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          background: palette.navy, border: '2px solid #F5B942', borderRadius: 8,
          color: '#fff', fontWeight: 600, fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 16px rgba(0,0,0,0.25)', zIndex: 1, willChange: 'transform',
        }}
      >
        {label}
      </div>
      <div ref={reemRef} style={{ position: 'fixed', left: standLeft, top: reemTop, width: S, height: S, zIndex: 2, willChange: 'transform', transformOrigin: '50% 95%' }}>
        <img ref={imgRef} src={POSE.walk} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))' }} />
      </div>
    </div>,
    document.body,
  );
}

function VideoVersion({ rect, onDone }: { rect: DOMRect; onDone: () => void }) {
  const h = Math.min(window.innerHeight * 0.5, 360);
  return createPortal(
    <video
      src={CUSTOM_ANIMATION_VIDEO!}
      autoPlay muted playsInline
      onEnded={onDone}
      onError={onDone}
      style={{ position: 'fixed', left: 0, right: 0, width: '100%', height: h, top: Math.max(0, rect.bottom - h), objectFit: 'contain', zIndex: 9000, pointerEvents: 'none' }}
    />,
    document.body,
  );
}
