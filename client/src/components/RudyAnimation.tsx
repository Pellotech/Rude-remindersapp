import { useState, useEffect, useRef } from "react";

const IMGS = {
  idle:         "/rudy/Rudy_idle_main_pose_transparent.png",
  walking:      "/rudy/Rudy_walking_transparent.png",
  pushing:      "/rudy/Rudy_pushing_transparent.png",
  pushing2:     "/rudy/Rudy_pushing_2_transparent.png",
  angry:        "/rudy/Rudy_standing_angry_transparent.png",
  confident:    "/rudy/Rudy_confident_arms_crossed_transparent.png",
  smirk:        "/rudy/Rudy_smirk_content_transparent.png",
  thumbsUp:     "/rudy/Rudy_thumbs_up_smile_transparent.png",
  leaning:      "/rudy/Rudy_leaning_transparent.png",
  leaning2:     "/rudy/Rudy_leaning_2_transparent.png",
  relaxing:     "/rudy/Rudy_relaxing_leaning_transparent.png",
  idleSmile:    "/rudy/Rudy_idle_smile_transparent.png",
  contentSmile: "/rudy/Rudy_content_smile_transparent.png",
};

interface RudyAnimationProps {
  animationIndex: number;
  onComplete: () => void;
  onButtonExit?: (transform: string, transition: string) => void;
}

export default function RudyAnimation({ animationIndex, onComplete, onButtonExit }: RudyAnimationProps) {
  const [src, setSrc]               = useState("");
  const [transform, setTransform]   = useState("translateX(0px)");
  const [transition, setTransition] = useState("none");
  const [opacity, setOpacity]       = useState(1);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef   = useRef(false);

  function safeComplete() {
    if (!doneRef.current) {
      doneRef.current = true;
      onComplete();
    }
  }

  function schedule(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  }

  function snap(newSrc: string, newTransform: string) {
    setSrc(newSrc);
    setTransform(newTransform);
    setTransition("none");
    setOpacity(1);
  }

  function go(newTransform: string, newTransition: string, newOpacity = 1) {
    setTransform(newTransform);
    setTransition(newTransition);
    setOpacity(newOpacity);
  }

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    doneRef.current = false;

    schedule(safeComplete, 3000);

    if (animationIndex === 0) {
      // ── ANIMATION 0 — SIDE SHOVE ──────────────────────────────────────────
      snap(IMGS.walking, "translateX(-150px)");
      schedule(() => go("translateX(0px)", "transform 600ms ease-out"), 16);
      // Lunge forward
      schedule(() => {
        setSrc(IMGS.pushing);
        go("translateX(12px)", "transform 250ms ease-in-out");
      }, 600);
      // Flash pushing2 at lunge peak + trigger button exit
      schedule(() => {
        setSrc(IMGS.pushing2);
        onButtonExit?.("translateX(110%)", "transform 400ms ease-in");
      }, 720);
      // Recoil back
      schedule(() => {
        setSrc(IMGS.pushing);
        go("translateX(0px)", "transform 250ms ease-in-out");
      }, 870);
      schedule(() => { setSrc(IMGS.confident); setTransition("none"); }, 1100);
      schedule(() => go("translateX(160px)", "transform 600ms ease-out, opacity 600ms ease-out", 0), 1500);
      schedule(safeComplete, 2100);

    } else if (animationIndex === 1) {
      // ── ANIMATION 1 — POP UP FROM BELOW ──────────────────────────────────
      snap(IMGS.idle, "translate(0px, 120px) scale(0.3)");
      schedule(() => go("translate(0px, 0px) scale(1)", "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)"), 16);
      // Bob up with idle smile
      schedule(() => {
        setSrc(IMGS.idleSmile);
        go("translate(0px, -6px) scale(1)", "transform 250ms ease-in-out");
      }, 600);
      // Bob down with smirk
      schedule(() => {
        setSrc(IMGS.smirk);
        go("translate(0px, 0px) scale(1)", "transform 250ms ease-in-out");
      }, 850);
      // Thumbs up + trigger button exit
      schedule(() => {
        setSrc(IMGS.thumbsUp);
        setTransition("none");
        onButtonExit?.("translateX(110%)", "transform 400ms ease-in");
      }, 1100);
      schedule(() => go("translate(0px, 80px) scale(0)", "transform 600ms ease-out, opacity 600ms ease-out", 0), 1500);
      schedule(safeComplete, 2100);

    } else if (animationIndex === 2) {
      // ── ANIMATION 2 — RIDES THE BUTTON OFF ───────────────────────────────
      snap(IMGS.leaning2, "translate(0px, -150px)");
      schedule(() => go("translate(0px, 0px)", "transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)"), 16);
      // Rock right with relaxing image
      schedule(() => {
        setSrc(IMGS.relaxing);
        go("translate(4px, 0px)", "transform 250ms ease-in-out");
      }, 700);
      // Rock back with leaning2
      schedule(() => {
        setSrc(IMGS.leaning2);
        go("translate(0px, 0px)", "transform 250ms ease-in-out");
      }, 950);
      // Slide off together with button
      schedule(() => {
        go("translate(160px, 0px)", "transform 800ms ease-in, opacity 800ms ease-in", 0);
        onButtonExit?.("translateX(110%)", "transform 800ms ease-in");
      }, 1200);
      schedule(safeComplete, 2000);

    } else if (animationIndex === 3) {
      // ── ANIMATION 3 — DOUBLE PUSH SHOVE ──────────────────────────────────
      snap(IMGS.walking, "translateX(-150px)");
      schedule(() => go("translateX(0px)", "transform 500ms ease-out"), 16);
      // Angry stare with scale pulse
      schedule(() => {
        setSrc(IMGS.angry);
        setTransition("none");
      }, 500);
      schedule(() => go("translateX(0px) scale(1.05)", "transform 100ms ease-out"), 560);
      schedule(() => go("translateX(0px) scale(1)", "transform 100ms ease-in"), 660);
      // Big shove + trigger button exit
      schedule(() => {
        setSrc(IMGS.pushing2);
        go("translateX(15px)", "transform 250ms ease-in-out");
        onButtonExit?.("translateX(110%)", "transform 400ms ease-in");
      }, 800);
      schedule(() => go("translateX(0px)", "transform 250ms ease-in-out"), 1050);
      schedule(() => { setSrc(IMGS.smirk); setTransition("none"); }, 1300);
      schedule(() => go("translateX(160px)", "transform 500ms ease-out, opacity 500ms ease-out", 0), 1700);
      schedule(safeComplete, 2200);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [animationIndex]);

  if (!src) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <img
        src={src}
        alt="Rudy"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "110px",
          width: "auto",
          transform,
          transition,
          opacity,
        }}
      />
    </div>
  );
}
